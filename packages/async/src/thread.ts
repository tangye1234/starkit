import { deferred } from '@starkit/utils/deferred'

export namespace Thread {
  export type Runnable = (this: Thread) => Promise<void>

  export interface Options {
    readonly run?: Runnable
    readonly onUncaughtError?: (e: unknown) => void
  }
}

const symbolId = Symbol('thread.id')

/**
 * An emulated `Thread` with a controlled runnable, which can be
 * started, interrupted, and waited for finish.
 *
 * @example
 * ```ts
 * let reader = ... // a data reader
 *
 * const t = new Thread(async thread => {
 *   while (!thread.interrupted) {
 *     await sleep(1000)
 *     const { value, done } = await reader.read()
 *     if (done) break
 *     await process(value, thread.signal)
 *   }
 * })
 *
 * // start the thread
 * t.start()
 *
 * // join the thread
 * await t.finished
 *
 * // later
 * t.interrupt()
 * ```
 */
export class Thread {
  private static [symbolId] = 0
  private _id = `Thread #${Thread[symbolId]++}`
  private _deferred = deferred<void>()
  private _interrupted = false
  private _dead = false
  private _controller: AbortController | undefined
  private onUncaughtError: (e: unknown) => void = e =>
    console.warn(`Thread #${this._id}:`, e)

  constructor(args?: Thread.Runnable | Thread.Options) {
    if (typeof args === 'function') {
      this.run = args
    } else if (args) {
      if (args.run) this.run = args.run
      if (args.onUncaughtError) {
        this.onUncaughtError = args.onUncaughtError
      }
    }
  }

  public get id() {
    return this._id
  }

  public interrupt() {
    if (this._interrupted) {
      return
    }
    this._interrupted = true
    if (this._controller) {
      this._controller.abort()
    } else {
      this._dead = true
      this._deferred.resolve()
    }
  }

  public get running() {
    return !!this._controller
  }

  public get dead() {
    return this._dead
  }

  public async run() {
    // nothing to do
  }

  public get interrupted() {
    return this._interrupted
  }

  /**
   * should only access the signal within run method
   */
  public get signal() {
    if (!this._controller) {
      throw new Error('cannot acces signal if this thread is not running')
    }
    return this._controller.signal
  }

  public start() {
    if (this.running) {
      console.warn(`Thread ${this.id} is already running.`)
      return this
    }
    if (this._dead) {
      console.warn(`Thread ${this.id} is already finished.`)
      return this
    }

    this._controller = new AbortController()

    this.run()
      .catch(this.onUncaughtError)
      .finally(() => {
        this._controller = undefined
        this._dead = true
        this._deferred.resolve()
      })
    return this
  }

  public get finished() {
    return this._deferred.promise
  }
}

const _noop = () => {}

// NodeJS: safely interrupt thread when received signals
export function interruptThreadOnSignal(t: Thread) {
  if (
    typeof window === 'undefined' &&
    typeof process !== 'undefined' &&
    typeof process.on === 'function' &&
    typeof process.removeListener === 'function'
  ) {
    const interrupt = () => t.interrupt()
    process.on('SIGINT', interrupt)
    process.on('SIGTERM', interrupt)

    const unsubscribe = () => {
      process.removeListener('SIGINT', interrupt)
      process.removeListener('SIGTERM', interrupt)
    }

    t.finished.finally(unsubscribe)
    return unsubscribe
  }
  return _noop
}

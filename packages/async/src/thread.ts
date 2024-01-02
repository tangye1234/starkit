import { deferred, nanoid } from '@fine/utils'

const symbolThread = Symbol('Thread')
const symbolSignal = Symbol('Thread.signal')

interface ThreadHandlerProto {
  readonly id: string
  readonly interrupted: boolean
  readonly running: boolean
  readonly signal: AbortSignal
  interrupt(): void
  [symbolThread]: Thread
  [symbolSignal]: AbortSignal
}

const threadHandlerProto = {
  get id() {
    return this[symbolThread].id
  },
  get interrupted() {
    return this[symbolThread].interrupted
  },
  get running() {
    return this[symbolThread].running
  },
  get signal() {
    return this[symbolSignal]
  },
  interrupt() {
    this[symbolThread].interrupt()
  }
} as ThreadHandlerProto

export namespace Thread {
  export interface Handler {
    readonly id: string
    readonly interrupted: boolean
    readonly running: boolean
    readonly signal: AbortSignal

    interrupt(): void
  }

  export type Runnable = (h: Handler) => Promise<void>
  export interface Options {
    readonly run: Runnable
    readonly onUncaughtError?: (e: unknown) => void
  }
}

export class Thread {
  private _id = `Thread #${nanoid()}`
  private _deferred = deferred<void>()
  private _interrupted = false
  private _finished = false
  private _controller: AbortController | undefined
  private readonly run: Thread.Runnable
  private onUncaughtError: (e: unknown) => void = e =>
    console.warn(`Thread #${this._id}:`, e)

  constructor(args: Thread.Runnable | Thread.Options) {
    if (typeof args === 'function') {
      this.run = args
    } else {
      this.run = args.run
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
      this._finished = true
      this._deferred.resolve()
    }
  }

  public get running() {
    return !!this._controller
  }

  public get interrupted() {
    return this._interrupted
  }

  public start() {
    if (this.running) {
      console.warn(`Thread ${this.id} is already running.`)
      return this
    }
    if (this._finished) {
      console.warn(`Thread ${this.id} is already finished.`)
      return this
    }

    this._controller = new AbortController()
    const signal = this._controller.signal
    const h = Object.create(threadHandlerProto)
    h[symbolThread] = this
    h[symbolSignal] = signal

    this.run(h)
      .catch(this.onUncaughtError)
      .finally(() => {
        this._controller = undefined
        this._finished = true
        this._deferred.resolve()
      })
    return this
  }

  public get finished() {
    return this._deferred.promise
  }
}

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

    t.finished.finally(() => {
      process.removeListener('SIGINT', interrupt)
      process.removeListener('SIGTERM', interrupt)
    })
  }
}

import { deferred, PromiseResolvers } from './deferred'
import { AbortError, ClosedError } from './error'
import { LinkedList } from './linked-list'

export interface UnderlyingWriter<T> {
  writable(): boolean
  write(item: T): void
}

const symbolWriter = Symbol('writer')

export class Writer<T> {
  private readonly writerList = new LinkedList<[T, PromiseResolvers<void>]>()
  private readonly [symbolWriter]?: UnderlyingWriter<T>
  private _closed = false
  private _ended = false
  private _finished = deferred<void>()

  constructor(underlyingWriter?: UnderlyingWriter<T>) {
    this[symbolWriter] = underlyingWriter
    this._finished.promise.finally(() => {
      this._ended = true
    })
  }

  public get closed() {
    return this._closed
  }

  public get ended() {
    return this._ended
  }

  public get finished() {
    return this._finished.promise
  }

  public get writable() {
    return this._writable()
  }

  protected _writable() {
    return this[symbolWriter] ? this[symbolWriter].writable() : true
  }

  protected _write(item: T) {
    this[symbolWriter]?.write(item)
  }

  public get ready() {
    return this.writable && this.writerList.size > 0
  }

  public async write(item: T, s?: AbortSignal): Promise<void> {
    if (this._closed) throw new ClosedError('writer is closed')

    if (!s) {
      if (this.writable) {
        return this._write(item)!
      }
      const defer = deferred<void>()
      this.writerList.push([item, defer])
      await defer.promise
      return
    }

    if (s.aborted) {
      throw s.reason || new AbortError()
    }

    if (this.writable) {
      return this._write(item)
    }

    const defer = deferred<void>()
    this.writerList.push([item, defer])

    const deferNode = this.writerList.lastNode!

    const abort = () => defer.reject(s.reason || new AbortError())
    s.addEventListener('abort', abort, { once: true })

    try {
      await defer.promise
    } catch (e) {
      deferNode.remove()
      throw e
    } finally {
      s.removeEventListener('abort', abort)
    }
  }

  public flush() {
    if (this._ended) return

    while (this.ready) {
      const [value, writer] = this.writerList.shift()!
      this._write(value)
      writer.resolve()
    }

    if (this.writerList.size === 0 && this._closed) {
      this._finished.resolve()
    }
  }

  public abort(reason: unknown = new AbortError()) {
    if (this._closed) return
    this._closed = true
    this._finished.reject(reason)

    let r: [T, PromiseResolvers<void>] | undefined
    while ((r = this.writerList.shift())) {
      r[1].reject(reason)
    }
  }

  public close() {
    if (this._closed) return
    this._closed = true
    this.flush()
  }
}

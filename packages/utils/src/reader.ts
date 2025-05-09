import { deferred, PromiseResolvers } from './deferred'
import { AbortError, ClosedError } from './error'
import { LinkedList } from './linked-list'

export interface UnderlyingReader<T> {
  readable(): boolean
  read(): T
}

const symbolReader = Symbol('reader')

export class Reader<T> implements AsyncIterable<T> {
  private readonly readerList = new LinkedList<PromiseResolvers<T>>()
  private readonly [symbolReader]?: UnderlyingReader<T>
  private _closed = false
  private _ended = false
  private _finished = deferred<void>()

  constructor(underlyingReader?: UnderlyingReader<T>) {
    this[symbolReader] = underlyingReader
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

  public get readable() {
    return this._readable()
  }

  protected _readable() {
    return this[symbolReader] ? this[symbolReader].readable() : true
  }

  protected _read() {
    if (!this[symbolReader]) throw new Error('_read is not implemented')
    return this[symbolReader].read()
  }

  public get ready() {
    return this.readable && this.readerList.size > 0
  }

  public async read(s?: AbortSignal): Promise<T> {
    if (this._closed) throw new ClosedError('reader is closed')

    if (!s) {
      if (this.readable) {
        return this._read()
      }
      const defer = deferred<T>()
      this.readerList.push(defer)
      return await defer.promise
    }

    if (s.aborted) {
      throw s.reason || new AbortError()
    }

    if (this.readable) {
      return this._read()
    }

    const defer = deferred<T>()
    this.readerList.push(defer)

    const deferNode = this.readerList.lastNode!

    const abort = () => defer.reject(s.reason || new AbortError())
    s.addEventListener('abort', abort, { once: true })

    try {
      const r = await defer.promise
      return r
    } catch (e) {
      deferNode.remove()
      throw e
    } finally {
      s.removeEventListener('abort', abort)
    }
  }

  public drain() {
    if (this._ended) return

    while (this.ready) {
      const t = this._read()
      const reader = this.readerList.shift()!
      reader.resolve(t)
    }

    if (this.readerList.size === 0 && this._closed) {
      this._finished.resolve()
    }
  }

  public abort(reason: unknown = new AbortError()) {
    if (this._closed) return
    this._closed = true

    let r: PromiseResolvers<T> | undefined
    while ((r = this.readerList.shift())) {
      r.reject(reason)
    }

    this._finished.reject(reason)
  }

  public close() {
    if (this._closed) return
    this._closed = true
    this.drain()
  }

  async *[Symbol.asyncIterator]() {
    while (!this.closed) {
      yield await this.read()
    }
  }
}

import { deferred, PromiseResolvers } from './deferred'
import { AbortError } from './error'
import { LinkedList } from './linked-list'

export interface UnderlyingReader<T> {
  readable(): boolean
  read(): T | undefined
}

const symbolReader = Symbol('reader')

export class Reader<T> implements AsyncIterable<T> {
  private readonly readerList = new LinkedList<
    PromiseResolvers<T | undefined>
  >()
  private readonly [symbolReader]?: UnderlyingReader<T>
  private _closed = false

  constructor(underlyingReader?: UnderlyingReader<T>) {
    this[symbolReader] = underlyingReader
  }

  public get closed() {
    return this._closed
  }

  public get readable() {
    return this._readable() && !this._closed
  }

  protected _readable() {
    return this[symbolReader] ? this[symbolReader].readable() : true
  }

  protected _read() {
    return this[symbolReader]?.read()
  }

  public get ready() {
    return this.readable && this.readerList.size > 0
  }

  public async read(s?: AbortSignal): Promise<T | undefined> {
    if (this._closed) throw new Error('reader is closed')

    if (!s) {
      if (this.readable) {
        return this._read()!
      }
      const defer = deferred<T | undefined>()
      this.readerList.push(defer)
      return await defer.promise
    }

    if (s.aborted) {
      throw s.reason || new AbortError()
    }

    if (this.readable) {
      return this._read()!
    }

    const defer = deferred<T | undefined>()
    this.readerList.push(defer)

    const deferNode = this.readerList.lastNode!

    const abort = () => defer.reject(s.reason || new AbortError())
    s.addEventListener('abort', abort, { once: true })

    try {
      const r = await defer.promise
      s.removeEventListener('abort', abort)
      return r
    } catch (e) {
      deferNode.remove()
      throw e
    }
  }

  public drain() {
    while (this.ready) {
      const t = this._read()!
      const reader = this.readerList.shift()!
      reader.resolve(t)
    }
  }

  public close(reason?: unknown) {
    if (this._closed) return
    this._closed = true

    let r: PromiseResolvers<T | undefined> | undefined
    const method = typeof reason !== 'undefined' ? 'reject' : 'resolve'
    while ((r = this.readerList.shift())) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      r[method](reason as any)
    }
  }

  async *[Symbol.asyncIterator]() {
    let r: T | undefined
    while ((r = await this.read())) {
      yield r
    }
  }
}

import { deferred, PromiseResolvers } from './deferred'
import { AbortError } from './error'
import { LinkedList } from './linked-list'

export interface UnderlyingWriter<T> {
  writable(): boolean
  write(item: T): void
}

const symbolWriter = Symbol('writer')

export class Writer<T> {
  private readonly writerList = new LinkedList<
    [T, PromiseResolvers<undefined>]
  >()
  private readonly [symbolWriter]?: UnderlyingWriter<T>
  private _closed = false

  constructor(underlyingWriter?: UnderlyingWriter<T>) {
    this[symbolWriter] = underlyingWriter
  }

  public get closed() {
    return this._closed
  }

  public get writable() {
    return this._writable() && !this._closed
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
    if (this._closed) throw new Error('writer is closed')

    if (!s) {
      if (this.writable) {
        return this._write(item)!
      }
      const defer = deferred<undefined>()
      this.writerList.push([item, defer])
      await defer.promise
      return
    }

    if (s.aborted) {
      throw s.reason || new AbortError()
    }

    if (this.writable) {
      return this._write(item)!
    }

    const defer = deferred<undefined>()
    this.writerList.push([item, defer])

    const deferNode = this.writerList.lastNode!

    const abort = () => defer.reject(s.reason || new AbortError())
    s.addEventListener('abort', abort, { once: true })

    try {
      await defer.promise
      s.removeEventListener('abort', abort)
    } catch (e) {
      deferNode.remove()
      throw e
    }
  }

  public flush() {
    while (this.ready) {
      const [value, writer] = this.writerList.shift()!
      this._write(value)
      writer.resolve(undefined)
    }
  }

  public close(reason?: unknown) {
    if (this._closed) return
    this._closed = true

    let r: [T, PromiseResolvers<undefined>] | undefined
    const method = typeof reason !== 'undefined' ? 'reject' : 'resolve'
    while ((r = this.writerList.shift())) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      r[1][method](reason as any)
    }
  }
}

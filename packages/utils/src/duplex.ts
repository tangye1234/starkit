import { Reader } from './reader'
import { Writer } from './writer'

export interface UnderlyingDuplex<I, O = I> {
  write(item: I): void
  read(): O
  readonly size: number
  /** default to Infinity */
  readonly limit?: number
}

const symbolDuplex = Symbol('duplex')

/**
 * A duplex stream is a stream that can be both readable and writable.
 * It is a combination of a readable stream and a writable stream.
 * It allows you to read and write data in a single stream.
 *
 * When you create a duplex stream, you can specify an underlying duplex
 * implementation that defines how the stream behaves.
 * The underlying duplex implementation must implement the `write` and
 * `read` methods, as well as the `size` and `limit` properties.
 *
 * The `write` method is used to write data to the stream.
 * The `read` method is used to read data from the stream.
 * The `size` property is used to get the number of items in the stream.
 * The `limit` property is used to get the maximum number of items that
 * can be in the stream at any given time.
 */
export class Duplex<I, O = I> {
  public readonly reader: Reader<O>
  public readonly writer: Writer<I>

  private [symbolDuplex]?: UnderlyingDuplex<I, O>
  private _finished: Promise<void>

  constructor(underlyingDuplex?: UnderlyingDuplex<I, O>) {
    this[symbolDuplex] = underlyingDuplex

    this.reader = new Reader({
      readable: () => this.size > 0,
      read: () => this._read()
    })

    this.writer = new Writer({
      writable: () => this.size < this.limit,
      write: item => this._write(item)
    })

    this._finished = Promise.all([
      this.reader.finished,
      this.writer.finished
    ]).then(() => void 0)
  }

  public get closed() {
    return this.reader.closed || this.writer.closed
  }

  public get ended() {
    return this.reader.ended && this.writer.ended
  }

  public get finished() {
    return this._finished
  }

  public get size() {
    return this._size()
  }

  public get limit() {
    return this._limit()
  }

  protected _size() {
    return this[symbolDuplex]?.size ?? 0
  }

  protected _limit() {
    return this[symbolDuplex]?.limit ?? Infinity
  }

  protected _write(item: I) {
    if (!this[symbolDuplex]) throw new Error('_write is not implemented')
    this[symbolDuplex].write(item)
  }

  protected _read() {
    if (!this[symbolDuplex]) throw new Error('_read is not implemented')
    return this[symbolDuplex].read()
  }

  protected get writable() {
    return this._size() < this._limit()
  }

  protected get readable() {
    return this._size() > 0
  }

  async read(s?: AbortSignal) {
    const r = await this.reader.read(s)
    this.writer.flush()
    this.reader.drain()
    return r
  }

  async write(item: I, s?: AbortSignal) {
    await this.writer.write(item, s)
    this.reader.drain()
    this.writer.flush()
  }

  public close() {
    this.reader.close()
    this.writer.close()
  }

  public abort(reason?: unknown) {
    this.reader.abort(reason)
    this.writer.abort(reason)
  }
}

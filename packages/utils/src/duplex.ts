import { Reader } from './reader'
import { Writer } from './writer'

export interface UnderlyingDuplex<I, O = I> {
  write(item: I): void
  read(): O | undefined
  readonly size: number
  /** default to Infinity */
  readonly limit?: number
}

const symbolDuplex = Symbol('duplex')

export class Duplex<I, O = I> {
  public readonly reader: Reader<O>
  public readonly writer: Writer<I>

  private [symbolDuplex]?: UnderlyingDuplex<I, O>

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
    this[symbolDuplex]?.write(item)
  }

  protected _read() {
    return this[symbolDuplex]?.read()
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

  close(reason?: unknown) {
    this.reader.close(reason)
    this.writer.close(reason)
  }
}

import { Duplex } from './duplex'
import { ClosedError, EmptyError, FullError } from './error'
import { Queue } from './queue'

export class BlockingQueue<T> extends Duplex<T> {
  private readonly queue = new Queue<T>()

  constructor(private readonly maxSize: number = Infinity) {
    super()
    if (this.maxSize <= 0) {
      throw new TypeError('maxSize must be greater than 0')
    }

    this.finished.finally(() => this.queue.clear())
  }

  /**
   * Put an item into the queue.
   * @param item The item to put into the queue.
   * @throws {ClosedError} If the queue is closed.
   * @throws {FullError} If the queue is full.
   */
  public put(item: T) {
    if (this.closed) {
      throw new ClosedError('BlockingQueue is closed')
    }
    if (this.writable) {
      this._write(item)
      this.reader.drain()
    } else {
      throw new FullError('BlockingQueue is full')
    }
  }

  /**
   * Take an item from the queue.
   * @throws {ClosedError} If the queue is closed.
   * @throws {EmptyError} If the queue is empty.
   * @returns The item taken from the queue.
   */
  public take(): T {
    if (this.closed) {
      throw new ClosedError('BlockingQueue is closed')
    }
    if (this.readable) {
      const r = this._read()!
      this.writer.flush()
      return r
    } else {
      throw new EmptyError('BlockingQueue is empty')
    }
  }

  protected _size(): number {
    return this.queue.size
  }

  protected _limit(): number {
    return this.maxSize
  }

  protected _read(): T {
    return this.queue.shift()!
  }

  protected _write(item: T) {
    this.queue.push(item)
  }
}

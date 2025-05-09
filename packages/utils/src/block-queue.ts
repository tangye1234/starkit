import { Queue } from './queue'
import { Reader } from './reader'

/** @deprecated use BlockingQueue instead */
export class BlockQueue<T> extends Reader<T> {
  private readonly queue = new Queue<T>()

  constructor() {
    super()
    this.finished.finally(() => this.queue.clear())
  }

  push(...values: T[]) {
    this.queue.push(...values)
    this.drain()
    return this.queue.size
  }

  protected _readable(): boolean {
    return this.queue.size > 0
  }

  protected _read(): T {
    return this.queue.shift()!
  }
}

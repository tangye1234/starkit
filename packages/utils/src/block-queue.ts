import { Queue } from './queue'
import { Reader } from './reader'

export class BlockQueue<T> extends Reader<T> {
  private readonly queue = new Queue<T>()

  constructor() {
    super()
  }

  push(...values: T[]) {
    this.queue.push(...values)
    this.drain()
    return this.queue.size
  }

  protected _readable(): boolean {
    return this.queue.size > 0
  }

  protected _read(): T | undefined {
    return this.queue.shift()
  }

  close(reason?: unknown) {
    this.queue.clear()
    super.close(reason)
  }
}

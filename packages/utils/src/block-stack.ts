import { Reader } from './reader'
import { Stack } from './stack'

export class BlockStack<T> extends Reader<T> {
  private readonly stack = new Stack<T>()

  constructor() {
    super()
    this.finished.finally(() => this.stack.clear())
  }

  push(...values: T[]) {
    this.stack.push(...values)
    this.drain()
    return this.stack.size
  }

  protected _readable(): boolean {
    return this.stack.size > 0
  }

  protected _read(): T {
    return this.stack.pop()!
  }
}

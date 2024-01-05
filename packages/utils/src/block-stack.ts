import { Reader } from './reader'
import { Stack } from './stack'

export class BlockStack<T> extends Reader<T> {
  private readonly stack = new Stack<T>()

  constructor() {
    super()
  }

  push(...values: T[]) {
    this.stack.push(...values)
    this.drain()
    return this.stack.size
  }

  protected _readable(): boolean {
    return this.stack.size > 0
  }

  protected _read(): T | undefined {
    return this.stack.pop()
  }

  close(reason?: unknown) {
    this.stack.clear()
    super.close(reason)
  }
}

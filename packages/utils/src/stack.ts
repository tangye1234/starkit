import { LinkedList } from './linked-list'

const symbolList = Symbol('stack[symbolList]')

export class Stack<T> {
  protected readonly [symbolList] = new LinkedList<T>()

  push(...values: T[]) {
    return this[symbolList].push(...values)
  }

  pop() {
    return this[symbolList].pop()
  }

  public get size() {
    return this[symbolList].size
  }

  public get empty() {
    return this[symbolList].size === 0
  }

  clear() {
    this[symbolList].clear()
  }
}

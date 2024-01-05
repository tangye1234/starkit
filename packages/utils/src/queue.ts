import { LinkedList } from './linked-list'

const symbolList = Symbol('queue[symbolList]')

export class Queue<T> {
  private readonly [symbolList] = new LinkedList<T>()

  push(...values: T[]) {
    return this[symbolList].push(...values)
  }

  shift() {
    return this[symbolList].shift()
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

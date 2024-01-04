interface Node<T> {
  value: T
  next: Node<T> | undefined
  prev: Node<T> | undefined
}

const symbolRemove = Symbol('list.remove')

export class LinkList<T> implements Iterable<T> {
  private head: Node<T> | undefined
  private tail: Node<T> | undefined
  private length = 0
  private readonly nodes = new Set<Node<T>>()

  get size() {
    return this.length
  }

  get first() {
    return this.head?.value
  }

  get last() {
    return this.tail?.value
  }

  get firstNode() {
    return this.head ? new ReadOnlyNode(this.head, this) : undefined
  }

  get lastNode() {
    return this.tail ? new ReadOnlyNode(this.tail, this) : undefined
  }

  clear() {
    this.nodes.clear()
    this.head = undefined
    this.tail = undefined
    this.length = 0
  }

  push(...values: T[]) {
    let tail = this.tail
    for (const value of values) {
      const node: Node<T> = { value, next: undefined, prev: tail }
      this.nodes.add(node)
      if (tail) {
        tail.next = node
      }
      tail = node
      if (!this.head) {
        this.head = node
      }
    }
    this.tail = tail
    this.length += values.length
    return this.length
  }

  pop() {
    if (!this.tail) {
      return undefined
    }
    this.nodes.delete(this.tail)
    const value = this.tail.value
    this.tail = this.tail.prev
    if (this.tail) {
      this.tail.next = undefined
    } else {
      this.head = undefined
    }
    this.length--
    return value
  }

  shift() {
    if (!this.head) {
      return undefined
    }
    this.nodes.delete(this.head)
    const value = this.head.value
    this.head = this.head.next
    if (this.head) {
      this.head.prev = undefined
    } else {
      this.tail = undefined
    }
    this.length--
    return value
  }

  unshift(...values: T[]) {
    let head = this.head
    for (let i = values.length - 1; i >= 0; i--) {
      const node: Node<T> = { value: values[i], next: head, prev: undefined }
      this.nodes.add(node)
      if (head) {
        head.prev = node
      }
      head = node
      if (!this.tail) {
        this.tail = node
      }
    }
    this.head = head
    this.length += values.length
    return this.length
  }

  forEach(callback: (value: T, index: number, list: LinkList<T>) => void) {
    let node = this.head
    let index = 0
    while (node) {
      callback(node.value, index++, this)
      node = node.next
    }
  }

  map<U>(callback: (value: T, index: number, list: LinkList<T>) => U) {
    const result = new LinkList<U>()
    let node = this.head
    let index = 0
    while (node) {
      result.push(callback(node.value, index++, this))
      node = node.next
    }
    return result
  }

  private [symbolRemove](node: Node<T>) {
    // test in the list
    if (!this.nodes.delete(node)) return
    const { prev, next } = node

    if (prev) {
      prev.next = next
    } else {
      this.head = next
    }
    if (next) {
      next.prev = prev
    } else {
      this.tail = prev
    }
  }

  *[Symbol.iterator]() {
    let node = this.head
    while (node) {
      yield node.value
      node = node.next
    }
  }
}

const symbolNode = Symbol('readonly.node')
const symbolList = Symbol('readonly.list')

class ReadOnlyNode<T> {
  private readonly [symbolNode]: Node<T>
  private readonly [symbolList]: LinkList<T>

  constructor(node: Node<T>, list: LinkList<T>) {
    this[symbolNode] = node
    this[symbolList] = list
  }

  get value() {
    return this[symbolNode].value
  }

  get prev(): ReadOnlyNode<T> | undefined {
    const prev = this[symbolNode].prev
    if (prev) {
      return new ReadOnlyNode(prev, this[symbolList])
    }
  }

  get next(): ReadOnlyNode<T> | undefined {
    const next = this[symbolNode].next
    if (next) {
      return new ReadOnlyNode(next, this[symbolList])
    }
  }

  remove() {
    this[symbolList][symbolRemove](this[symbolNode])
  }
}

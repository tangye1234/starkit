interface Node<T> {
  value: T
  next: Node<T> | undefined
  prev: Node<T> | undefined
}

const symbolRemove = Symbol('list.remove')
const symbolHas = Symbol('list.has')
const symbolMap = Symbol('list.map')

export class LinkedList<T> implements Iterable<T> {
  private head: Node<T> | undefined
  private tail: Node<T> | undefined
  private length = 0
  private readonly nodes = new Set<Node<T>>()
  private readonly [symbolMap] = new WeakMap<Node<T>, ReadOnlyNode<T>>()

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
    return this.head ? ReadOnlyNode.from(this.head, this) : undefined
  }

  get lastNode() {
    return this.tail ? ReadOnlyNode.from(this.tail, this) : undefined
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

  forEach(callback: (value: T, index: number, list: LinkedList<T>) => void) {
    let node = this.head
    let index = 0
    while (node) {
      callback(node.value, index++, this)
      node = node.next
    }
  }

  map<U>(callback: (value: T, index: number, list: LinkedList<T>) => U) {
    const result = new LinkedList<U>()
    let node = this.head
    let index = 0
    while (node) {
      result.push(callback(node.value, index++, this))
      node = node.next
    }
    return result
  }

  entries() {
    const result = [] as [number, T][]
    let node = this.head
    let index = 0
    while (node) {
      result.push([index++, node.value])
      node = node.next
    }
    return result
  }

  keys() {
    return Array.from({ length: this.size }).map((_, idx) => idx)
  }

  values() {
    const result = [] as T[]
    let node = this.head
    while (node) {
      result.push(node.value)
      node = node.next
    }
    return result
  }

  private [symbolHas](node: Node<T>) {
    return this.nodes.has(node)
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

    this.length -= 1
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
  private readonly [symbolList]: LinkedList<T>

  public static from<R>(node: Node<R>, list: LinkedList<R>) {
    const hashMap = list[symbolMap]
    const cached = hashMap.get(node)
    if (cached) return cached
    const n = new ReadOnlyNode(node, list)
    hashMap.set(node, n)
    return n
  }

  private constructor(node: Node<T>, list: LinkedList<T>) {
    this[symbolNode] = node
    this[symbolList] = list
  }

  get value() {
    return this[symbolNode].value
  }

  get prev(): ReadOnlyNode<T> | undefined {
    const prev = this[symbolNode].prev
    if (prev && this[symbolList][symbolHas](prev)) {
      return ReadOnlyNode.from(prev, this[symbolList])
    }
  }

  get next(): ReadOnlyNode<T> | undefined {
    const next = this[symbolNode].next
    if (next && this[symbolList][symbolHas](next)) {
      return ReadOnlyNode.from(next, this[symbolList])
    }
  }

  remove() {
    const node = this[symbolNode]
    this[symbolList][symbolRemove](node)
  }
}

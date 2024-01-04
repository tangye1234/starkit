import { deferred, PromiseResolvers } from './deferred'
import { AbortError } from './error'
import { LinkList } from './link-list'

export class BlockQueue<T> {
  private readonly list = new LinkList<T>()
  private readonly readerList = new LinkList<PromiseResolvers<T>>()
  private readonly writerList = new LinkList<[T, PromiseResolvers<void>]>()

  constructor(public poolSize = Infinity) {
    if (poolSize < 1)
      throw new Error('pool size should be larger than or equal to 1')
  }

  push(...values: T[]) {
    this.list.push(...values)
    this.notifyReader()
    return this.size
  }

  shift() {
    const r = this.list.shift()
    this.notifyWriter()
    return r
  }

  public get size() {
    return this.list.size
  }

  private notifyReader() {
    while (this.list.size && this.readerList.size) {
      const t = this.list.shift()!
      const r = this.readerList.shift()!
      r.resolve(t)
    }
  }

  private notifyWriter() {
    while (this.list.size < this.poolSize && this.writerList.size) {
      const [value, r] = this.writerList.shift()!
      this.list.push(value)
      r.resolve()
    }
  }

  async take(s?: AbortSignal) {
    if (!s) {
      if (this.list.size) {
        return this.shift()!
      }
      const defer = deferred<T>()
      this.readerList.push(defer)
      return await defer.promise
    }

    if (s.aborted) {
      throw s.reason || new AbortError()
    }

    if (this.list.size) {
      return this.shift()!
    }

    const defer = deferred<T>()
    this.readerList.push(defer)

    // the node just added
    const deferNode = this.readerList.lastNode!

    const abort = () => defer.reject(s.reason || new AbortError())
    s.addEventListener('abort', abort, { once: true })

    try {
      const r = await defer.promise
      s.removeEventListener('abort', abort)
      return r
    } catch (e) {
      deferNode.remove()
      throw e
    }
  }

  async put(item: T, s?: AbortSignal) {
    if (!s) {
      if (this.list.size < this.poolSize) {
        this.push(item)
        return
      }
      const defer = deferred<void>()
      this.writerList.push([item, defer])
      return await defer.promise
    }

    if (s.aborted) {
      throw s.reason || new AbortError()
    }

    if (this.list.size < this.poolSize) {
      this.push(item)
      return
    }

    const defer = deferred<void>()
    this.writerList.push([item, defer])

    const deferNode = this.writerList.lastNode!

    const abort = () => defer.reject(s.reason || new AbortError())
    s.addEventListener('abort', abort, { once: true })

    try {
      await defer.promise
      s.removeEventListener('abort', abort)
    } catch (e) {
      deferNode.remove()
      throw e
    }
  }

  quit() {
    this.rejectAllWriter('quit')
    this.rejectAllReader('quit')
    this.list.clear()
  }

  rejectAllReader(reason?: unknown) {
    let r: PromiseResolvers<T> | undefined
    while ((r = this.readerList.shift())) {
      r.reject(reason)
    }
  }

  rejectAllWriter(reason?: unknown) {
    let r: [T, PromiseResolvers<void>] | undefined
    while ((r = this.writerList.shift())) {
      r[1].reject(reason)
    }
  }
}

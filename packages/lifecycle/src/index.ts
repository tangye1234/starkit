import { hoc } from '@starkit/utils/hoc'
import { queueTask } from '@starkit/utils/queue-task'

const storeSymbol = Symbol('Lifecycle.Store')
const storeArraySymbol = Symbol('Lifecycle.Store.array')
const storeDisposeSymbol = Symbol('Lifecycle.Store.dispose')

class StoreImpl implements Store {
  private readonly [storeSymbol] = true
  private [storeDisposeSymbol] = false
  private readonly [storeArraySymbol]: Dispose[] = []

  push(...disposes: Dispose[]) {
    if (this[storeDisposeSymbol]) {
      queueTask(() => disposes.forEach(d => d()))
      return disposes.length
    }

    return this[storeArraySymbol].push(...disposes)
  }

  get length() {
    return this[storeArraySymbol].length
  }

  *[Symbol.iterator]() {
    if (this[storeDisposeSymbol]) return
    for (const d of this[storeArraySymbol]) {
      yield d
    }
  }
}

const refSymbol = Symbol('Lifecycle.Ref')
const refCurrentSymbol = Symbol('Lifecycle.Ref.current')
const refDisposeSymbol = Symbol('Lifecycle.Ref.dispose')

class MutImpl implements Mut {
  private [refCurrentSymbol]: Dispose | undefined
  private [refDisposeSymbol] = false
  private readonly [refSymbol] = true

  unref() {
    this[refCurrentSymbol]?.()
    this[refCurrentSymbol] = undefined
  }

  get current() {
    return this[refCurrentSymbol]
  }

  set current(dispose: Dispose | undefined) {
    if (this[refDisposeSymbol]) {
      dispose && queueTask(dispose)
      return
    }

    if (this[refCurrentSymbol] === dispose) return

    this[refCurrentSymbol]?.()
    this[refCurrentSymbol] = dispose
  }
}

export type Dispose = () => void

export interface Store extends Iterable<Dispose> {
  push(...disposes: Dispose[]): number
  length: number
}

export interface Mut {
  current: Dispose | undefined
  readonly unref: Dispose
}

export type Ref = Store | Mut

export function all(...disposes: Dispose[]): Dispose {
  return () => disposes.forEach(d => d())
}

export function store(ref?: Ref): readonly [store: Store, dispose: Dispose] {
  const store = new StoreImpl()

  const dispose: Dispose = () => {
    if (store[storeDisposeSymbol]) return
    store[storeDisposeSymbol] = true
    const disposes = store[storeArraySymbol].slice()
    store[storeArraySymbol].length = 0
    disposes.forEach(d => d())
  }

  connect(dispose, ref)
  return [store, dispose]
}

export function mut(upstream?: Ref): readonly [mut: Mut, dispose: Dispose] {
  const mut = new MutImpl()

  const dispose = () => {
    if (mut[refDisposeSymbol]) return
    mut[refDisposeSymbol] = true
    if (mut[refCurrentSymbol]) {
      const toDispose = mut[refCurrentSymbol]
      mut[refCurrentSymbol] = undefined
      toDispose()
    }
  }

  connect(dispose, upstream)
  return [mut as Mut, dispose]
}

export function isStore(store: unknown): store is Store {
  // arraylike store is for compatible usage
  return Array.isArray(store) || !!(store && (store as StoreImpl)[storeSymbol])
}

export function isMut(mut: unknown): mut is Mut {
  return !!(mut && (mut as MutImpl)[refSymbol])
}

export function isRef(ref: unknown): ref is Ref {
  return isStore(ref) || isMut(ref)
}

export function connect<T extends Dispose>(dispose: T, ref?: Ref): T {
  if (ref) {
    if ('push' in ref) ref.push(dispose)
    else ref.current = dispose
  }
  return dispose
}

export function bindMut<
  Fn extends (...args: any[]) => Dispose | readonly [unknown, Dispose]
>(mut: Mut, factory: Fn): Fn {
  // named function
  return hoc(
    function (this: unknown, ...args: any[]) {
      mut.unref()
      const r = factory.apply(this, args)
      // connect(typeof r === 'function' ? r : r[1], ref)
      if (typeof r === 'function') {
        mut.current = r
      } else {
        mut.current = r[1]
      }
      return r
    } as Fn,
    factory
  )
}

export function timeout<C extends (...args: any[]) => void>(
  callback: C,
  delay = 0,
  ...args: Parameters<C>
): Dispose {
  const timer = setTimeout(callback, delay, ...args)
  return () => clearTimeout(timer)
}

export function interval<C extends (...args: any[]) => void>(
  callback: C,
  delay = 0,
  ...args: Parameters<C>
): Dispose {
  const timer = setInterval(callback, delay, ...args)
  return () => clearInterval(timer)
}

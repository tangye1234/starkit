import { queueTask } from '@fine/utils'

const storeSymbol = Symbol('Lifecycle.Store')
const storeArraySymbol = Symbol('Lifecycle.Store.array')
const storeDisposeSymbol = Symbol('Lifecycle.Store.dispose')

interface StoreProto extends Iterable<Dispose> {
  push(...disposes: Dispose[]): number
  length: number
  [storeSymbol]: boolean
  // struct in store
  [storeArraySymbol]: Dispose[]
  [storeDisposeSymbol]: boolean
}

const storeProto = {
  [storeSymbol]: true,
  push(...disposes: Dispose[]) {
    if (this[storeDisposeSymbol]) {
      queueTask(() => disposes.forEach(d => d()))
      return disposes.length
    }

    return this[storeArraySymbol].push(...disposes)
  },
  get length() {
    return this[storeArraySymbol].length
  }
} as StoreProto

if (Symbol.iterator) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const next = () => ({ value: undefined as any, done: true })
  storeProto[Symbol.iterator] = function iterable(
    this: StoreProto
  ): Iterator<Dispose> {
    if (this[storeDisposeSymbol]) return { next }
    return this[storeArraySymbol][Symbol.iterator]()
  }
}

const refSymbol = Symbol('Lifecycle.Ref')
const refCurrentSymbol = Symbol('Lifecycle.Ref.current')
const refDisposeSymbol = Symbol('Lifecycle.Ref.dispose')

interface MutProto {
  current: Dispose | undefined
  unref(): void
  [refSymbol]: boolean
  // struct in ref
  [refCurrentSymbol]: Dispose | undefined
  [refDisposeSymbol]: boolean
}

const mutProto = {
  [refSymbol]: true,
  unref() {
    this[refCurrentSymbol]?.()
    this[refCurrentSymbol] = undefined
  },
  get current() {
    return this[refCurrentSymbol]
  },
  set current(dispose: Dispose | undefined) {
    if (this[refDisposeSymbol]) {
      dispose && queueTask(dispose)
      return
    }

    if (this[refCurrentSymbol] === dispose) return

    this[refCurrentSymbol]?.()
    this[refCurrentSymbol] = dispose
  }
} as MutProto

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

export function store(ref?: Ref): [store: Store, dispose: Dispose] {
  const store = Object.create(storeProto) as Store & StoreProto
  store[storeArraySymbol] = []
  store[storeDisposeSymbol] = false

  const dispose: Dispose = () => {
    if (store[storeDisposeSymbol]) return
    store[storeDisposeSymbol] = true
    const disposes = store[storeArraySymbol].slice()
    store[storeArraySymbol].length = 0
    disposes.forEach(d => d())
  }

  connect(dispose, ref)
  return [store as Store, dispose]
}

export function mut(upstream?: Ref): [mut: Mut, dispose: Dispose] {
  const mut = Object.create(mutProto) as Mut & MutProto
  mut[refCurrentSymbol] = undefined
  mut[refDisposeSymbol] = false

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
  return Array.isArray(store) || !!(store && (store as StoreProto)[storeSymbol])
}

export function isMut(mut: unknown): mut is Mut {
  return !!(mut && (mut as MutProto)[refSymbol])
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
  const name = factory.name || 'anonymous'
  return {
    [name]: function (this: unknown, ...args: any[]) {
      mut.unref()
      const r = factory.apply(this, args)
      // connect(typeof r === 'function' ? r : r[1], ref)
      if (typeof r === 'function') {
        mut.current = r
      } else {
        mut.current = r[1]
      }
      return r
    } as Fn
  }[name]
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

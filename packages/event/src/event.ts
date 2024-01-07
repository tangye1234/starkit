import Lifecycle from '@starkit/lifecycle'

import { addEvent, type EventMap } from './add-event'

const refSymbol = Symbol('event.ref')
const eventTargetSymbol = Symbol('event.target')

interface EventMeta<T extends EventTarget> {
  target<R extends EventTarget>(target: R): EventMeta<R>
  on<K extends keyof EventMap<T>>(
    event: K | readonly K[],
    listener: (this: T, ev: EventMap<T>[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): DisposableEvent<T>
  on(
    event: string | readonly string[],
    listener: EventListener | EventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): DisposableEvent<T>
  readonly eventTarget: T
}

interface DisposableEvent<T extends EventTarget> {
  on<K extends keyof EventMap<T>>(
    event: K | readonly K[],
    listener: (this: T, ev: EventMap<T>[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): DisposableEvent<T>
  on(
    event: string | readonly string[],
    listener: EventListener | EventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): DisposableEvent<T>
  readonly dispose: () => void
  readonly eventTarget: T
}

class EventDisposableImpl<T extends EventTarget> implements DisposableEvent<T> {
  private readonly [eventTargetSymbol]: T
  private readonly [refSymbol]: Lifecycle.Store

  constructor(
    target: T,
    store: Lifecycle.Store,
    public readonly dispose: () => void
  ) {
    this[eventTargetSymbol] = target
    this[refSymbol] = store
  }
  on<K extends keyof EventMap<T>>(
    event: K | readonly K[],
    listener: (this: T, ev: EventMap<T>[K]) => void,
    options?: boolean | AddEventListenerOptions | undefined
  ): DisposableEvent<T>
  on(
    event: string | readonly string[],
    listener: EventListener | EventListenerObject,
    options?: boolean | AddEventListenerOptions | undefined
  ): DisposableEvent<T>
  on(
    event: string | string[],
    listener: ((...args: any[]) => void) | EventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    const store = this[refSymbol]
    const target = this[eventTargetSymbol]
    store.push(addEvent(target, event, listener, options))
    return this
  }

  get eventTarget() {
    return this[eventTargetSymbol]
  }
}

class EventMetaImpl<T extends EventTarget> implements EventMeta<T> {
  private [eventTargetSymbol]: T
  private [refSymbol]?: Lifecycle.Ref

  constructor(target: T, ref?: Lifecycle.Ref | undefined) {
    this[eventTargetSymbol] = target
    this[refSymbol] = ref
  }
  on<K extends keyof EventMap<T>>(
    event: K | readonly K[],
    listener: (this: T, ev: EventMap<T>[K]) => void,
    options?: boolean | AddEventListenerOptions | undefined
  ): DisposableEvent<T>
  on(
    event: string | readonly string[],
    listener: EventListener | EventListenerObject,
    options?: boolean | AddEventListenerOptions | undefined
  ): DisposableEvent<T>
  on(
    event: string | readonly string[],
    listener: (...args: any[]) => void | EventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    const ref = this[refSymbol]
    const target = this[eventTargetSymbol]
    const [store, dispose] = Lifecycle.store(ref)
    const disposable = new EventDisposableImpl(target, store, dispose)
    disposable.on(event, listener, options)
    return disposable
  }

  target<R extends EventTarget>(target: R) {
    return new EventMetaImpl(target, this[refSymbol])
  }

  get eventTarget() {
    return this[eventTargetSymbol]
  }
}

export function event(ref?: Lifecycle.Ref) {
  const meta = new EventMetaImpl(window, ref)
  return meta as EventMeta<Window>
}

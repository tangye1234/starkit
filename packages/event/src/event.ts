import Lifecycle from '@fine/lifecycle'

import { addEvent, type EventMap } from './add-event'

const refSymbol = Symbol('event.ref')
const eventTargetSymbol = Symbol('event.target')

interface Meta<T extends EventTarget, R = Lifecycle.Ref | undefined> {
  [refSymbol]: R
  [eventTargetSymbol]: T
}

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
  dispose: () => void
  readonly eventTarget: T
}

const eventDisposableProto = {
  on(
    this: Meta<EventTarget, Lifecycle.Store>,
    event: string | readonly string[],
    listener: EventListener | EventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    const store = this[refSymbol]
    const target = this[eventTargetSymbol]
    store.push(addEvent(target, event, listener, options))
    return this
  },
  get eventTarget() {
    return (this as unknown as Meta<EventTarget, Lifecycle.Store>)[
      eventTargetSymbol
    ]
  }
}

const eventMataProto = {
  target(this: Meta<EventTarget, Lifecycle.Ref | undefined>, t: EventTarget) {
    const meta = Object.create(eventMataProto) as EventMeta<EventTarget> &
      Meta<EventTarget, Lifecycle.Ref | undefined>
    meta[refSymbol] = this[refSymbol]
    meta[eventTargetSymbol] = t
    return meta
  },
  on(
    this: Meta<EventTarget, Lifecycle.Ref | undefined>,
    event: string | readonly string[],
    listener: EventListener | EventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    const ref = this[refSymbol]
    const target = this[eventTargetSymbol]
    const [store, dispose] = Lifecycle.store(ref)
    const disposable = Object.create(
      eventDisposableProto
    ) as DisposableEvent<EventTarget> & Meta<EventTarget, Lifecycle.Store>
    disposable.dispose = dispose
    disposable[refSymbol] = store
    disposable[eventTargetSymbol] = target
    disposable.on(event, listener, options)
    return disposable
  },
  get eventTarget() {
    return (this as unknown as Meta<EventTarget>)[eventTargetSymbol]
  }
}

export function event(ref?: Lifecycle.Ref) {
  const meta = Object.create(eventMataProto) as EventMeta<Window> &
    Meta<Window, typeof ref>
  meta[refSymbol] = ref
  meta[eventTargetSymbol] = window
  return meta as EventMeta<Window>
}

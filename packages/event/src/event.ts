import Lifecycle from '@fine/lifecycle'

import { type AddEvent, addEvent, type EventMap } from './add-event'

export interface EventWithTarget<T extends EventTarget> {
  readonly dispose: () => void
  readonly on: FromEventTargetAdd<T>
}

export interface FromEventTargetAdd<T extends EventTarget> {
  <const K extends keyof EventMap<T>>(
    event: K | readonly K[],
    listener: (
      this: T,
      ev: EventMap<T>[K] extends Event ? EventMap<T>[K] : Event
    ) => void,
    options?: boolean | AddEventListenerOptions
  ): EventWithTarget<T>
  (
    event: string | readonly string[],
    listener: EventListener | EventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): EventWithTarget<T>
}

export function fromEventTarget<T extends EventTarget>(
  target: T,
  ref?: Lifecycle.Ref
) {
  const [store, dispose] = Lifecycle.store(ref)
  const handler = {
    on: ((
      event: string | readonly string[],
      listener: EventListener | EventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) => {
      store.push(addEvent(target, event, listener, options))
      return handler
    }) as unknown as FromEventTargetAdd<T>,
    dispose
  } as EventWithTarget<T>
}

export interface EventFactory {
  readonly dispose: () => void
  readonly on: AddEvent<EventFactory>
}

export function event(ref?: Lifecycle.Ref) {
  const [store, dispose] = Lifecycle.store(ref)
  const handler = {
    on: (
      target: EventTarget,
      event: string | readonly string[],
      listener: EventListener | EventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) => {
      store.push(addEvent(target, event, listener, options))
      return handler
    },
    dispose
  }

  return handler as EventFactory
}

import * as Lifecycle from '../../lifecycle/src'

export type EventMap<T extends EventTarget> = T extends Window
  ? WindowEventMap
  : T extends Document
    ? DocumentEventMap
    : T extends HTMLMediaElement
      ? HTMLMediaElementEventMap
      : T extends HTMLElement
        ? HTMLElementEventMap & { input: InputEvent }
        : T extends SVGElement
          ? SVGElementEventMap
          : T extends EventSource
            ? EventSourceEventMap
            : T extends AbortSignal
              ? AbortSignalEventMap
              : T extends Worker
                ? WorkerEventMap
                : T extends Animation
                  ? AnimationEventMap
                  : T extends AudioScheduledSourceNode
                    ? AudioScheduledSourceNodeEventMap
                    : T extends BaseAudioContext
                      ? BaseAudioContextEventMap
                      : T extends AudioWorkletNode
                        ? AudioWorkletNodeEventMap
                        : T extends BroadcastChannel
                          ? BroadcastChannelEventMap
                          : T extends TextTrackCue
                            ? TextTrackCueEventMap
                            : T extends TextTrackList
                              ? TextTrackListEventMap
                              : T extends WebSocket
                                ? WebSocketEventMap
                                : T extends XMLHttpRequest
                                  ? XMLHttpRequestEventMap
                                  : T extends XMLHttpRequestEventTarget
                                    ? XMLHttpRequestEventTargetEventMap
                                    : T extends RTCPeerConnection
                                      ? RTCPeerConnectionEventMap
                                      : T extends Element
                                        ? ElementEventMap
                                        : T extends EventTarget
                                          ? Record<string, Event>
                                          : never

export type AddEvent<T extends EventTarget> = {
  <const K extends keyof EventMap<T>>(
    event: K | readonly K[],
    listener: (
      this: T,
      ev: EventMap<T>[K] extends Event ? EventMap<T>[K] : Event
    ) => void,
    options?: boolean | AddEventListenerOptions
  ): Lifecycle.Dispose
  <const K extends keyof EventMap<T>>(
    event: K | readonly K[],
    listener: (
      this: T,
      ev: EventMap<T>[K] extends Event ? EventMap<T>[K] : Event
    ) => void,
    lifecycleRef?: Lifecycle.Ref
  ): Lifecycle.Dispose
  <const K extends keyof EventMap<T>>(
    event: K | readonly K[],
    listener: (
      this: T,
      ev: EventMap<T>[K] extends Event ? EventMap<T>[K] : Event
    ) => void,
    options: boolean | AddEventListenerOptions,
    lifecycleRef: Lifecycle.Ref
  ): Lifecycle.Dispose
  (
    event: string | readonly string[],
    listener: EventListener,
    optionsOrLifecycleRef?: boolean | AddEventListenerOptions | Lifecycle.Ref,
    lifecycleRef?: Lifecycle.Ref
  ): Lifecycle.Dispose
}

const noop = () => {}

export function fromEventTarget<T extends EventTarget>(
  target: T,
  lifecycleRef?: Lifecycle.Ref
): AddEvent<T> {
  let disposableSet: Set<Lifecycle.Dispose> | undefined
  let disposed = false

  if (lifecycleRef) {
    disposableSet = new Set()
    Lifecycle.connect(() => {
      if (disposed) return
      disposed = true
      disposableSet!.forEach(d => d())
      disposableSet = undefined
    }, lifecycleRef)
  }

  const addEvent = ((
    event: string | string[],
    listener: EventListener,
    optionsOrLRef?: boolean | AddEventListenerOptions | Lifecycle.Ref,
    lRef?: Lifecycle.Ref
  ) => {
    if (disposed) return noop
    const events = Array.isArray(event) ? [...event] : [event]
    let options: boolean | AddEventListenerOptions | undefined
    if (Lifecycle.isRef(optionsOrLRef)) {
      lRef = optionsOrLRef
      options = undefined
    } else {
      options = optionsOrLRef
    }

    events.forEach(event => target.addEventListener(event, listener, options))
    let removed = false
    const remove = () => {
      if (removed) return
      removed = true
      events.forEach(event =>
        target.removeEventListener(event, listener, options)
      )
      disposableSet?.delete(remove)
    }
    disposableSet?.add(remove)
    Lifecycle.connect(remove, lRef)
    return remove
  }) as AddEvent<T>

  return addEvent
}

export function getClientX(e: MouseEvent | TouchEvent | HTMLElement) {
  if (e instanceof HTMLElement) {
    return e.getBoundingClientRect().left
  }
  if ('touches' in e) {
    return e.touches[0].clientX
  }
  return e.clientX
}

export function getClientY(e: MouseEvent | TouchEvent | HTMLElement) {
  if (e instanceof HTMLElement) {
    return e.getBoundingClientRect().top
  }
  if ('touches' in e) {
    return e.touches[0].clientX
  }
  return e.clientX
}

export interface DragHandler {
  onDrag: (handler: (e: MouseEvent | TouchEvent) => void) => Lifecycle.Dispose
  onDragEnd: (
    handler: (e: MouseEvent | TouchEvent) => void
  ) => Lifecycle.Dispose
  onDragCancel: (
    handler: (e: FocusEvent | TouchEvent | KeyboardEvent) => void
  ) => Lifecycle.Dispose
  dispose: Lifecycle.Dispose
}

export type DragEvent = (
  e: MouseEvent | TouchEvent,
  handler: DragHandler
) => boolean | void

export function fromDragEvent(
  target: HTMLElement | Window | Document,
  lifecycleRef?: Lifecycle.Ref
): (e: DragEvent) => Lifecycle.Dispose {
  return (dragEvent: DragEvent) => {
    const [base, dispose] = Lifecycle.store(lifecycleRef)
    const [dragMut] = Lifecycle.mut(base)

    fromEventTarget(target, base)(['mousedown', 'touchstart'], e => {
      const [store, disposeDoc] = Lifecycle.store(dragMut)
      const addDoc = fromEventTarget(document, store)
      const dragHandler: DragHandler = {
        onDrag: handler =>
          addDoc('touches' in e ? 'touchmove' : 'mousemove', handler, {
            passive: true
          }),
        onDragEnd: handler =>
          addDoc('touches' in e ? 'touchend' : 'mouseup', handler, {
            passive: true
          }),
        onDragCancel: handler => {
          const [store, disposeEvt] = Lifecycle.store()
          addDoc(
            'touches' in e ? 'touchcancel' : 'blur',
            handler,
            { passive: true },
            store
          )
          addDoc(
            'keydown',
            e => e.key === 'Escape' && handler(e),
            { passive: true },
            store
          )
          return disposeEvt
        },
        dispose: disposeDoc
      }

      const dragging = dragEvent(e, dragHandler) ?? true

      if (!dragging) {
        disposeDoc()
        return
      }

      e.preventDefault()

      addDoc('touches' in e ? 'touchmove' : 'mousemove', moveE =>
        moveE.preventDefault()
      )
      addDoc(
        'touches' in e ? ['touchend', 'touchcancel'] : ['mouseup', 'blur'],
        disposeDoc
      )
      addDoc('keydown', e => e.key === 'Escape' && disposeDoc())
    })

    return dispose
  }
}

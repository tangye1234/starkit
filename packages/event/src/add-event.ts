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

export type AddEvent<R = () => void> = {
  <T extends EventTarget, const K extends keyof EventMap<T>>(
    target: T,
    event: K | readonly K[],
    listener: (
      this: T,
      ev: EventMap<T>[K] extends Event ? EventMap<T>[K] : Event
    ) => void,
    options?: boolean | AddEventListenerOptions
  ): R
  (
    target: EventTarget,
    event: string | readonly string[],
    listener: EventListener | EventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): R
}

const addEvent = ((
  target: EventTarget,
  event: string | string[],
  listener: EventListener,
  options?: boolean | AddEventListenerOptions
) => {
  const events = Array.isArray(event) ? [...event] : [event]

  let disposed = false
  events.forEach(event => target.addEventListener(event, listener, options))

  return () => {
    if (disposed) return
    disposed = true
    events.forEach(event =>
      target.removeEventListener(event, listener, options)
    )
  }
}) as AddEvent

export { addEvent }

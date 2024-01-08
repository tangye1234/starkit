export type EventMap<T extends EventTarget> = T extends Window
  ? WindowEventMap
  : T extends Document
    ? DocumentEventMap
    : T extends HTMLBodyElement
      ? HTMLBodyElementEventMap
      : T extends HTMLMediaElement
        ? HTMLMediaElementEventMap
        : T extends MediaSource
          ? MediaSourceEventMap
          : T extends MediaStream
            ? MediaStreamEventMap
            : T extends MediaStreamTrack
              ? MediaStreamTrackEventMap
              : T extends HTMLElement
                ? HTMLElementEventMap & { input: InputEvent }
                : T extends OffscreenCanvas
                  ? OffscreenCanvasEventMap
                  : T extends SVGElement
                    ? SVGElementEventMap
                    : T extends EventSource
                      ? EventSourceEventMap
                      : T extends AbortSignal
                        ? AbortSignalEventMap
                        : T extends PaymentRequest
                          ? PaymentRequestEventMap
                          : T extends Performance
                            ? PerformanceEventMap
                            : T extends Worker
                              ? WorkerEventMap
                              : T extends MessagePort
                                ? MessagePortEventMap
                                : T extends Notification
                                  ? NotificationEventMap
                                  : T extends Animation
                                    ? AnimationEventMap
                                    : T extends AudioScheduledSourceNode
                                      ? AudioScheduledSourceNodeEventMap
                                      : T extends OfflineAudioContext
                                        ? OfflineAudioContextEventMap
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
                                                  : T extends VideoEncoder
                                                    ? VideoEncoderEventMap
                                                    : T extends VideoDecoder
                                                      ? VideoDecoderEventMap
                                                      : T extends WakeLockSentinel
                                                        ? WakeLockSentinelEventMap
                                                        : T extends WebSocket
                                                          ? WebSocketEventMap
                                                          : T extends EventSource
                                                            ? EventSourceEventMap
                                                            : T extends FileReader
                                                              ? FileReaderEventMap
                                                              : T extends FontFaceSet
                                                                ? FontFaceSetEventMap
                                                                : T extends XMLHttpRequest
                                                                  ? XMLHttpRequestEventMap
                                                                  : T extends XMLHttpRequestEventTarget
                                                                    ? XMLHttpRequestEventTargetEventMap
                                                                    : T extends RTCDTMFSender
                                                                      ? RTCDTMFSenderEventMap
                                                                      : T extends RTCIceTransport
                                                                        ? RTCIceTransportEventMap
                                                                        : T extends RTCSctpTransport
                                                                          ? RTCSctpTransportEventMap
                                                                          : T extends RTCDataChannel
                                                                            ? RTCDataChannelEventMap
                                                                            : T extends RTCDtlsTransport
                                                                              ? RTCDtlsTransportEventMap
                                                                              : T extends RTCPeerConnection
                                                                                ? RTCPeerConnectionEventMap
                                                                                : T extends MediaDevices
                                                                                  ? MediaDevicesEventMap
                                                                                  : T extends MediaKeySession
                                                                                    ? MediaKeySessionEventMap
                                                                                    : T extends MediaQueryList
                                                                                      ? MediaQueryListEventMap
                                                                                      : T extends MediaRecorder
                                                                                        ? MediaRecorderEventMap
                                                                                        : T extends IDBTransaction
                                                                                          ? IDBTransactionEventMap
                                                                                          : T extends IDBDatabase
                                                                                            ? IDBDatabaseEventMap
                                                                                            : T extends IDBOpenDBRequest
                                                                                              ? IDBOpenDBRequestEventMap
                                                                                              : T extends MIDIPort
                                                                                                ? MIDIPortEventMap
                                                                                                : T extends MIDIAccess
                                                                                                  ? MIDIAccessEventMap
                                                                                                  : T extends MIDIInput
                                                                                                    ? MIDIInputEventMap
                                                                                                    : T extends MathMLElement
                                                                                                      ? MathMLElementEventMap
                                                                                                      : T extends PermissionStatus
                                                                                                        ? PermissionStatusEventMap
                                                                                                        : T extends PictureInPictureWindow
                                                                                                          ? PictureInPictureWindowEventMap
                                                                                                          : T extends RemotePlayback
                                                                                                            ? RemotePlaybackEventMap
                                                                                                            : T extends Element
                                                                                                              ? ElementEventMap
                                                                                                              : T extends EventTarget
                                                                                                                ? Record<
                                                                                                                    string,
                                                                                                                    Event
                                                                                                                  >
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

export type AddEventWithTarget<T extends EventTarget, R = () => void> = {
  <const K extends keyof EventMap<T>>(
    event: K | readonly K[],
    listener: (
      this: T,
      ev: EventMap<T>[K] extends Event ? EventMap<T>[K] : Event
    ) => void,
    options?: boolean | AddEventListenerOptions
  ): R
  (
    event: string | readonly string[],
    listener: EventListener | EventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): R
}

const addEvent = ((
  target: EventTarget,
  event: string | string[],
  listener: EventListener | EventListenerObject,
  options?: boolean | AddEventListenerOptions
) => {
  const events = Array.isArray(event) ? [...event] : [event]
  events.forEach(event => target.addEventListener(event, listener, options))

  return () => {
    let evt: string | undefined
    while ((evt = events.pop()))
      target.removeEventListener(evt, listener, options)
  }
}) as AddEvent

function fromEventTarget<T extends EventTarget>(
  target: T
): AddEventWithTarget<T> {
  return function addEventWithTarget(
    event: string | string[],
    listener: EventListener | EventListenerObject,
    options: boolean | AddEventListenerOptions
  ) {
    return addEvent(target, event, listener, options)
  } as AddEventWithTarget<T>
}

export { addEvent, fromEventTarget }

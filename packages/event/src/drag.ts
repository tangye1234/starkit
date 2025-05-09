import * as Lifecycle from '@starkit/lifecycle'
import { once } from '@starkit/utils/once'
import { queueTask } from '@starkit/utils/queue-task'

import { addEvent } from './add-event'
import { getPointerPos } from './pointer'

type Identifier<E> = E extends MouseEvent
  ? 'mouse'
  : E extends TouchEvent
    ? number
    : E extends FocusEvent
      ? 'blur'
      : E extends KeyboardEvent
        ? 'escape'
        : null

export interface DefaultSubject {
  readonly x: number
  readonly y: number
}

/** support the browser which dose not have TouchEvent */
const TouchEvent =
  (typeof window !== 'undefined' ? window.TouchEvent : null) ||
  (function TouchEvent() {} as unknown as typeof window.TouchEvent)

export interface SubjectEvent<
  E extends MouseEvent | TouchEvent = MouseEvent | TouchEvent
> {
  readonly x: number
  readonly y: number
  readonly nativeEvent: E
}

export interface DragEvent<E, S, Type extends string, Target> {
  /**
   * the target which is registered with event listeners.
   */
  readonly target: Target
  readonly x: number
  readonly y: number
  readonly dx: number
  readonly dy: number
  readonly type: Type
  readonly identifier: Identifier<E>
  readonly nativeEvent: E
  readonly subject: S
  readonly defaultPrevented: boolean
  /**
   * Call this method in start or drag listener to quit the dragging state for a next queue.
   */
  preventDefault(): void
  [symbolPrevented]: boolean
}

const symbolRef = Symbol('drag.ref')
const symbolTarget = Symbol('drag.target')
const symbolContainer = Symbol('drag.container')
const symbolTouchable = Symbol('drag.touchable')
const symbolEscapable = Symbol('drag.escapable')
const symbolSubject = Symbol('drag.subject')
const symbolPrevented = Symbol('drag.prevented')
const symbolListener = Symbol('drag.listener')

type HasKeyboardEvent<ESC extends boolean> = ESC extends true
  ? KeyboardEvent
  : never

type HasTouchEvent<E extends MouseEvent | TouchEvent> = TouchEvent extends E
  ? TouchEvent
  : never

type CancelEvent<E extends MouseEvent | TouchEvent, ESC extends boolean> =
  | FocusEvent
  | HasKeyboardEvent<ESC>
  | HasTouchEvent<E>
  | void

interface DragEventMap<
  E extends MouseEvent | TouchEvent,
  S,
  ESC extends boolean
> {
  start: DragEvent<E, S, 'start', DragHandler<E, S, ESC>>
  drag: DragEvent<E, S, 'drag', DragHandler<E, S, ESC>>
  end: DragEvent<E, S, 'end', DragHandler<E, S, ESC>>
  cancel: DragEvent<CancelEvent<E, ESC>, S, 'cancel', DragHandler<E, S, ESC>>
}

export interface DragFactory<
  E extends MouseEvent | TouchEvent = MouseEvent | TouchEvent,
  S = DefaultSubject,
  ESC extends boolean = true
> {
  target(target: HTMLElement | (() => HTMLElement)): DragFactory<E, S, ESC>
  /**
   * A container which is used to compute the offset x and offset y position.
   *
   * Default is parentNode, but if the target is Canvas of OffsetCanvas, the
   * container is itself.
   * @param el
   */
  container(
    el: HTMLElement | ((target: HTMLElement) => HTMLElement)
  ): DragFactory<E, S, ESC>
  /**
   * Whether to use touch event for dragging.
   * Default is to detect the touch device.
   * @param touchable set to true to enable touch dragging as well
   */
  useTouch<T extends boolean>(
    touchable: T | ((target: HTMLElement) => T)
  ): DragFactory<T extends false ? MouseEvent : MouseEvent | TouchEvent, S, ESC>
  /**
   * Whether to listen to the escape key press for a release of drag.
   * Default is true.
   * @param escapable if set to false, no keyboard cancel event will be fired
   */
  useEscape<B extends boolean>(
    escapable: B | ((target: HTMLElement) => B)
  ): DragFactory<E, S, B>
  /**
   * Add a subject function so that each of the following event has a static subject.
   * If return void or undefined or null, the following event would be prevented from emitting.
   * @param sub the subject rule method
   */
  subject<R>(
    sub: (ev: SubjectEvent, target: HTMLElement) => R
  ): DragFactory<E, R, ESC>
  on<K extends keyof DragEventMap<E, S, ESC>>(
    type: K | K[],
    listener: (ev: DragEventMap<E, S, ESC>[K]) => void
  ): DragHandler<E, S, ESC>
}

export interface DragHandler<
  E extends MouseEvent | TouchEvent = MouseEvent | TouchEvent,
  S = NonNullable<unknown>,
  ESC extends boolean = boolean
> {
  on<K extends keyof DragEventMap<E, S, ESC>>(
    type: K | K[],
    listener: (ev: DragEventMap<E, S, ESC>[K]) => void
  ): this
  readonly dispose: () => void
}

const dragEventProto = {
  preventDefault() {
    this[symbolPrevented] = true
  },
  get defaultPrevented() {
    return this[symbolPrevented]
  }
} as {
  [symbolPrevented]: boolean
  readonly defaultPrevented: boolean
  preventDefault(): void
}

class DragHandlerImpl implements DragHandler {
  private readonly [symbolListener] = new Map<
    string,
    Set<(...args: [any]) => void>
  >()

  constructor(public readonly dispose: () => void) {}

  on(type: string | string[], listener: (...args: [any]) => void): this {
    const map = this[symbolListener]
    const events = Array.isArray(type) ? type : [type]
    events.forEach(event => {
      let set = map.get(event)
      if (!set) {
        set = new Set()
        map.set(event, set)
      }
      set.add(listener)
    })
    return this
  }
}

class DragFactoryImpl<
  E extends MouseEvent | TouchEvent = MouseEvent | TouchEvent,
  S = NonNullable<unknown>,
  ESC extends boolean = true
> implements DragFactory<E, S, ESC>
{
  private readonly [symbolTarget]: HTMLElement | (() => HTMLElement)
  private readonly [symbolContainer]:
    | HTMLElement
    | ((t: HTMLElement) => HTMLElement)
  private readonly [symbolSubject]: (ev: SubjectEvent, target: HTMLElement) => S
  private readonly [symbolEscapable]: ESC | ((target: HTMLElement) => ESC)
  private readonly [symbolTouchable]:
    | boolean
    | ((target: HTMLElement) => boolean)

  private readonly [symbolRef]?: Lifecycle.Ref

  constructor(
    target: HTMLElement | (() => HTMLElement),
    container: HTMLElement | ((target: HTMLElement) => HTMLElement),
    subject: (ev: SubjectEvent, target: HTMLElement) => S,
    escapable: ESC | ((target: HTMLElement) => ESC),
    touchable: boolean | ((target: HTMLElement) => boolean),
    ref?: Lifecycle.Ref | undefined
  ) {
    this[symbolTarget] = target
    this[symbolContainer] = container
    this[symbolSubject] = subject
    this[symbolEscapable] = escapable
    this[symbolTouchable] = touchable
    this[symbolRef] = ref
  }

  target(target: HTMLElement | (() => HTMLElement)) {
    return new DragFactoryImpl<E, S, ESC>(
      target,
      this[symbolContainer],
      this[symbolSubject],
      this[symbolEscapable],
      this[symbolTouchable],
      this[symbolRef]
    )
  }

  container(el: HTMLElement | ((target: HTMLElement) => HTMLElement)) {
    return new DragFactoryImpl<E, S, ESC>(
      this[symbolTarget],
      el,
      this[symbolSubject],
      this[symbolEscapable],
      this[symbolTouchable],
      this[symbolRef]
    )
  }

  subject<R>(sub: (ev: SubjectEvent, target: HTMLElement) => R) {
    return new DragFactoryImpl<E, R, ESC>(
      this[symbolTarget],
      this[symbolContainer],
      sub,
      this[symbolEscapable],
      this[symbolTouchable],
      this[symbolRef]
    )
  }

  useEscape<NE extends boolean>(escapable: NE | ((target: HTMLElement) => NE)) {
    return new DragFactoryImpl<E, S, NE>(
      this[symbolTarget],
      this[symbolContainer],
      this[symbolSubject],
      escapable,
      this[symbolTouchable],
      this[symbolRef]
    )
  }

  useTouch<NE extends boolean>(touchable: NE | ((target: HTMLElement) => NE)) {
    return new DragFactoryImpl<
      NE extends false ? MouseEvent : MouseEvent | TouchEvent,
      S,
      ESC
    >(
      this[symbolTarget],
      this[symbolContainer],
      this[symbolSubject],
      this[symbolEscapable],
      touchable,
      this[symbolRef]
    )
  }

  on<K extends keyof DragEventMap<E, S, ESC>>(
    type: K | K[],
    listener: (ev: DragEventMap<E, S, ESC>[K]) => void
  ): DragHandler<E, S, ESC> {
    const get = <T>(
      fn: T,
      ...args: any[]
    ): T extends (...args: any[]) => infer R ? R : T => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return typeof fn === 'function' ? fn(...args) : (fn as any)
    }
    const ref = this[symbolRef]
    const targetFn = this[symbolTarget]
    const subjectFn = this[symbolSubject]
    const containerFn = this[symbolContainer]
    const touchableFn = this[symbolTouchable]
    const escapableFn = this[symbolEscapable]

    const [store, dispose] = Lifecycle.store(ref)
    const [dragMut] = Lifecycle.mut(store)
    const target = get(targetFn)
    const touchable = get(touchableFn, target)

    let subject: S
    let container: HTMLElement

    store.push(
      addEvent(
        target,
        touchable ? ['mousedown', 'touchstart'] : 'mousedown',
        e => {
          // filter out the unwanted event
          if (!filter(e)) return

          container = get(containerFn, target)
          const pos = getPointerPos(e, container)
          const identifier = getIdentifier(e)
          const subjectEvent: SubjectEvent<MouseEvent | TouchEvent> = {
            ...pos,
            nativeEvent: e
          }
          const escapable = get(escapableFn, target)
          subject = get(subjectFn, subjectEvent, target)
          if (subject === null || subject === undefined) {
            return handler
          }

          const [dragStore, disposeDrag] = Lifecycle.store(dragMut)

          const evt = {
            target: handler,
            x: subjectEvent.x,
            y: subjectEvent.y,
            dx: 0,
            dy: 0,
            type: 'start',
            identifier,
            nativeEvent: e,
            subject,
            [symbolPrevented]: false
          } as DragEvent<MouseEvent | TouchEvent, S, 'start', DragHandlerImpl>
          Object.setPrototypeOf(evt, dragEventProto)

          const endListener = once(
            (
              e:
                | MouseEvent
                | TouchEvent
                | KeyboardEvent
                | FocusEvent
                | void
                | undefined
            ) => {
              const type =
                e &&
                (e instanceof MouseEvent ||
                  (e instanceof TouchEvent && e.type === 'touchend'))
                  ? 'end'
                  : 'cancel'

              const pos =
                e instanceof MouseEvent || e instanceof TouchEvent
                  ? getPointerPos(e, container, identifier)
                  : {
                      x: lastEvt.x,
                      y: lastEvt.y
                    }

              const evt = {
                target: handler,
                x: pos.x,
                y: pos.y,
                dx: pos.x - lastEvt.x,
                dy: pos.y - lastEvt.y,
                type,
                identifier:
                  e instanceof TouchEvent ? identifier : getIdentifier(e),
                nativeEvent: e,
                subject,
                defaultPrevented: false,
                preventDefault: () => {}
              } as DragEvent<
                MouseEvent | TouchEvent,
                S,
                typeof type,
                DragHandlerImpl
              >
              dispatch(evt)

              // remove all listeners bound to document or window
              disposeDrag()
            }
          )

          dispatch(evt)

          let lastEvt: DragEvent<
            MouseEvent | TouchEvent,
            S,
            'start' | 'drag',
            DragHandler
          > = evt

          if (evt.defaultPrevented) {
            queueTask(disposeDrag)
            return handler
          }

          // prevent event touchstart default
          if (identifier !== 'mouse') e.preventDefault()

          const dragListener = (e: MouseEvent | TouchEvent) => {
            const pos = getPointerPos(e, container, identifier)
            const evt = {
              target: handler,
              x: pos.x,
              y: pos.y,
              dx: pos.x - lastEvt.x,
              dy: pos.y - lastEvt.y,
              type: 'drag',
              identifier,
              nativeEvent: e,
              subject,
              [symbolPrevented]: false
            } as DragEvent<
              MouseEvent | TouchEvent,
              typeof subject,
              'drag',
              typeof handler
            >
            Object.setPrototypeOf(evt, dragEventProto)
            dispatch(evt)
            lastEvt = evt
            if (evt.defaultPrevented) {
              queueTask(disposeDrag)
            }
          }

          dragStore.push(
            addEvent(
              document,
              identifier === 'mouse' ? 'mousemove' : 'touchmove',
              e => filter(e, identifier) && dragListener(e)
            ),
            addEvent(
              document,
              identifier === 'mouse' ? 'mouseup' : ['touchend', 'touchcancel'],
              e => filter(e, identifier) && endListener(e)
            ),
            addEvent(window, 'blur', endListener),
            addEvent(
              document,
              escapable ? 'keydown' : [],
              e => e.key === 'Escape' && endListener(e)
            ),
            endListener
          )
        }
      )
    )

    const handler = new DragHandlerImpl(dispose)
    handler.on(type, listener)
    return handler as DragHandler<E, S, ESC>
  }
}

function getIdentifier<T>(evt: T) {
  if (!evt) return null as Identifier<T>
  if (evt instanceof MouseEvent) return 'mouse' as Identifier<T>
  if (evt instanceof TouchEvent)
    return evt.changedTouches[0].identifier as Identifier<T>
  if (evt instanceof KeyboardEvent && evt.key === 'Escape')
    return 'escape' as Identifier<T>
  if (evt instanceof FocusEvent && evt.type === 'blur')
    return 'blur' as Identifier<T>
  return null as Identifier<T>
}

function dispatch(
  evt: DragEvent<
    MouseEvent | TouchEvent | KeyboardEvent | FocusEvent | void | undefined,
    unknown,
    'start' | 'drag' | 'end' | 'cancel',
    DragHandlerImpl
  >
) {
  const { target, type } = evt
  const map = target[symbolListener]
  const set = map.get(type)
  set?.forEach(listener => listener(evt))
  // const size = set?.size || 0
  // return size > 0
}

const defaultTouchable: DragFactoryImpl[typeof symbolTouchable] = el =>
  !!navigator.maxTouchPoints || 'ontouchstart' in el
const defaultSubject: DragFactoryImpl[typeof symbolSubject] = ({ x, y }) => ({
  x,
  y
})
const defaultContainer: DragFactoryImpl[typeof symbolContainer] = el =>
  el instanceof HTMLCanvasElement || el instanceof OffscreenCanvas
    ? el
    : el.parentElement || document.body
const defaultTarget = () => document.body

const filter = <T extends MouseEvent | TouchEvent>(
  e: T,
  identifier = null as Identifier<T>
) => {
  if (e instanceof MouseEvent) {
    // not the left button
    return e.button === 0 && (identifier === null || identifier === 'mouse')
  }
  if (e instanceof TouchEvent) {
    return (
      identifier === null ||
      (typeof identifier === 'number' &&
        Array.from(e.changedTouches).some(
          touch => touch.identifier === identifier
        ))
    )
  }
  return true
}

export function drag(ref?: Lifecycle.Ref) {
  return new DragFactoryImpl(
    defaultTarget,
    defaultContainer,
    defaultSubject,
    true,
    defaultTouchable,
    ref
  ) as DragFactory
}

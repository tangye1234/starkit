import Lifecycle from '@fine/lifecycle'
import { once, queueTask } from '@fine/utils'

import { addEvent } from './add-event'

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

export interface SubjectEvent<E extends MouseEvent | TouchEvent> {
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

interface DragMeta<
  R extends Lifecycle.Ref | undefined,
  E extends MouseEvent | TouchEvent = MouseEvent | TouchEvent,
  S extends NonNullable<unknown> = NonNullable<unknown>,
  ESC extends boolean = true
> {
  [symbolRef]: R
  [symbolTarget]: HTMLElement | (() => HTMLElement)
  [symbolContainer]: HTMLElement | ((target: HTMLElement) => HTMLElement)
  [symbolTouchable]: boolean | ((target: HTMLElement) => boolean)
  [symbolEscapable]: ESC | ((target: HTMLElement) => ESC)
  [symbolSubject]: (
    ev: SubjectEvent<E>,
    target: HTMLElement
  ) => S | undefined | void
}

interface DraggingMeta {
  [symbolListener]: Map<string, Set<(...args: [any]) => void>>
}

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
  S extends NonNullable<unknown>,
  ESC extends boolean
> {
  start: DragEvent<E, S, 'start', DisposableDrag<E, S, ESC>>
  drag: DragEvent<E, S, 'drag', DisposableDrag<E, S, ESC>>
  end: DragEvent<E, S, 'end', DisposableDrag<E, S, ESC>>
  cancel: DragEvent<CancelEvent<E, ESC>, S, 'cancel', DisposableDrag<E, S, ESC>>
}

export interface DragEventMeta<
  E extends MouseEvent | TouchEvent = MouseEvent | TouchEvent,
  S extends NonNullable<unknown> = DefaultSubject,
  ESC extends boolean = true
> {
  target(target: HTMLElement | (() => HTMLElement)): DragEventMeta<E, S, ESC>
  /**
   * A container which is used to compute the offset x and offset y position.
   *
   * Default is parentNode, but if the target is Canvas of OffsetCanvas, the
   * container is itself.
   * @param el
   */
  container(
    el: HTMLElement | ((target: HTMLElement) => HTMLElement)
  ): DragEventMeta<E, S, ESC>
  /**
   * Whether to use touch event for dragging.
   * Default is to detect the touch device.
   * @param touchable set to true to enable touch dragging as well
   */
  useTouch<T extends boolean>(
    touchable: T | ((target: HTMLElement) => T)
  ): T extends true
    ? DragEventMeta<MouseEvent | TouchEvent, S, ESC>
    : T extends false
      ? DragEventMeta<MouseEvent, S, ESC>
      : DragEventMeta<MouseEvent | TouchEvent, S, ESC>
  /**
   * Whether to listen to the escape key press for a release of drag.
   * Default is true.
   * @param escapable if set to false, no keyboard cancel event will be fired
   */
  useEscape<B extends boolean>(
    escapable: B | ((target: HTMLElement) => B)
  ): DragEventMeta<E, S, B>
  /**
   * Add a subject function so that each of the following event has a static subject.
   * If return void or undefined or null, the following event would be prevented from emitting.
   * @param sub the subject rule method
   */
  subject<R>(
    sub: (ev: E, target: HTMLElement) => R
  ): R extends NonNullable<unknown>
    ? DragEventMeta<E, R, ESC>
    : DragEventMeta<E, never, ESC>
  on<K extends keyof DragEventMap<E, S, ESC>>(
    type: K | K[],
    listener: (ev: DragEventMap<E, S, ESC>[K]) => void
  ): DisposableDrag<E, S, ESC>
}

export interface DisposableDrag<
  E extends MouseEvent | TouchEvent = MouseEvent | TouchEvent,
  S extends NonNullable<unknown> = NonNullable<unknown>,
  ESC extends boolean = boolean
> {
  on<K extends keyof DragEventMap<E, S, ESC>>(
    type: K | K[],
    listener: (ev: DragEventMap<E, S, ESC>[K]) => void
  ): DisposableDrag<E, S, ESC>
  dispose: () => void
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

const disposableDragProto = {
  on(type, listener) {
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
  }
} as DisposableDrag & DraggingMeta

const dragMetaProto = {
  target(el) {
    return Object.assign(
      Object.create(dragMetaProto),
      { [symbolTarget]: el },
      this
    )
  },
  container(el) {
    return Object.assign(
      Object.create(dragMetaProto),
      { [symbolContainer]: el },
      this
    )
  },
  subject(sub) {
    return Object.assign(
      Object.create(dragMetaProto),
      { [symbolSubject]: sub },
      this
    )
  },
  useEscape(escapable) {
    return Object.assign(
      Object.create(dragMetaProto),
      { [symbolEscapable]: escapable },
      this
    )
  },
  useTouch(touchable) {
    return Object.assign(
      Object.create(dragMetaProto),
      { [symbolTouchable]: touchable },
      this
    )
  },
  on(type, listener) {
    const get = <T>(
      fn: T,
      ...args: any[]
    ): T extends (...args: any[]) => infer R ? R : T => {
      return typeof fn === 'function' ? fn(...args) : fn
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let subject: any
    let container!: HTMLElement

    store.push(
      addEvent(
        target,
        touchable ? ['mousedown', 'touchstart'] : 'mousedown',
        e => {
          container = get(containerFn, target)
          const pointer = getEventPointer(e)
          const subjectEvent: SubjectEvent<MouseEvent | TouchEvent> = {
            x: pointer.clientX - container.clientLeft,
            y: pointer.clientY - container.clientTop,
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
            identifier: getIdentifier(e),
            nativeEvent: e,
            subject,
            [symbolPrevented]: false
          } as DragEvent<
            MouseEvent | TouchEvent,
            typeof subject,
            'start',
            typeof handler
          >
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

              const pointer =
                e && (e instanceof MouseEvent || e instanceof TouchEvent)
                  ? getEventPointer(e)
                  : {
                      clientX: lastEvt.x,
                      clientY: lastEvt.y
                    }

              const pos = {
                x: pointer.clientX - container.clientLeft,
                y: pointer.clientY - container.clientTop
              }

              const evt = {
                target: handler,
                x: pos.x,
                y: pos.y,
                dx: pos.x - lastEvt.x,
                dy: pos.y - lastEvt.y,
                type,
                identifier: getIdentifier(e),
                nativeEvent: e,
                subject,
                defaultPrevented: false,
                preventDefault: () => {}
              } as DragEvent<
                typeof e,
                typeof subject,
                typeof type,
                typeof handler
              >
              dispatch(evt)
            }
          )

          const finalize = () => {
            endListener()
            disposeDrag()
          }

          dispatch(evt)

          let lastEvt: DragEvent<
            MouseEvent | TouchEvent,
            typeof subject,
            'start' | 'drag',
            typeof handler
          > = evt

          if (evt.defaultPrevented) {
            queueTask(finalize)
            return handler
          }

          const dragListener = (e: MouseEvent | TouchEvent) => {
            const pointer = getEventPointer(e)
            const pos = {
              x: pointer.clientX - container.clientLeft,
              y: pointer.clientY - container.clientTop
            }
            const evt = {
              target: handler,
              x: pos.x,
              y: pos.y,
              dx: pos.x - lastEvt.x,
              dy: pos.y - lastEvt.y,
              type: 'drag',
              identifier: getIdentifier(e),
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
              queueTask(finalize)
            }
          }

          dragStore.push(
            addEvent(
              document,
              evt.identifier === 'mouse' ? 'mousemove' : 'touchmove',
              dragListener
            ),
            addEvent(
              document,
              evt.identifier === 'mouse'
                ? 'mouseup'
                : ['touchend', 'touchcancel'],
              endListener
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

    const handler = Object.create(disposableDragProto) as DisposableDrag &
      DraggingMeta
    handler[symbolListener] = new Map()
    handler.dispose = dispose
    handler.on(type, listener)
    return handler as DisposableDrag
  }
} as DragMeta<
  Lifecycle.Ref | undefined,
  MouseEvent | TouchEvent,
  NonNullable<unknown>,
  boolean
> &
  DragEventMeta<MouseEvent | TouchEvent, NonNullable<unknown>, boolean>

function getEventPointer(e: MouseEvent | TouchEvent) {
  return 'touches' in e ? e.touches[0] : e
}

function getIdentifier<T>(evt: T) {
  if (!evt) {
    return null as Identifier<T>
  }
  if (evt instanceof MouseEvent) {
    return 'mouse' as Identifier<T>
  }
  if (evt instanceof TouchEvent) {
    return evt.touches[0].identifier as Identifier<T>
  }
  if (evt instanceof KeyboardEvent && evt.key === 'Escape') {
    return 'escape' as Identifier<T>
  }
  if (evt instanceof FocusEvent && evt.type === 'blur') {
    return 'blur' as Identifier<T>
  }
  return null as Identifier<T>
}

function dispatch(
  evt: DragEvent<
    MouseEvent | TouchEvent | KeyboardEvent | FocusEvent | void | undefined,
    NonNullable<unknown>,
    'start' | 'drag' | 'end' | 'cancel',
    DraggingMeta
  >
) {
  const { target, type } = evt
  const map = target[symbolListener]
  const set = map.get(type)
  set?.forEach(listener => listener(evt))
}

export function drag(ref?: Lifecycle.Ref) {
  const meta = Object.create(dragMetaProto) as DragMeta<
    Lifecycle.Ref | undefined,
    MouseEvent | TouchEvent,
    NonNullable<unknown>,
    boolean
  > &
    DragEventMeta

  meta[symbolRef] = ref
  meta[symbolTarget] = () => document.body
  meta[symbolContainer] = (el: HTMLElement) => {
    if (el instanceof HTMLCanvasElement || el instanceof OffscreenCanvas) {
      return el
    }
    return el.parentElement || document.body
  }
  meta[symbolEscapable] = true
  meta[symbolTouchable] = (el: HTMLElement) =>
    !!navigator.maxTouchPoints || 'ontouchstart' in el
  meta[symbolSubject] = ev => ({
    x: ev.x,
    y: ev.y
  })

  return meta as DragEventMeta
}

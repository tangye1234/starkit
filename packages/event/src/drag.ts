import Lifecycle from '@fine/lifecycle'

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

export interface DragStartEvent {
  x: number
  y: number
  clientX: number
  clientY: number
  nativeEvent: MouseEvent | TouchEvent
}

export interface DragEventMap<T> {
  start: [DragStartEvent, T]
  move: DragMoveEvent<T>
  end: DragEndEvent
  cancel: DragCancelEvent
}

export interface DragFactory<T = DragStartEvent> {
  readonly dispose: () => void
  readonly subject: <R>(listener: (ev: DragStartEvent) => R) => DragFactory<R>
  readonly on: <K extends keyof DragEventMap<T>>(
    key: K | K[],
    listener: (ev: DragEventMap<T>[K][0]) => DragEventMap<T>[K][1]
  ) => DragFactory<T>
  readonly target: (target: EventTarget) => DragFactory
}

export function drag(ref?: Lifecycle.Ref): (e: DragEvent) => Lifecycle.Dispose {
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

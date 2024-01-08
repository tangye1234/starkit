export interface Pointer {
  readonly clientX: number
  readonly clientY: number
  readonly pageX?: number
  readonly pageY?: number
  readonly currentTarget?: EventTarget
}

export function getPointerPos(
  evt: MouseEvent | TouchEvent | Pointer,
  node?: EventTarget | null | undefined
) {
  const pointer = getEventPointer(evt)
  if (!node) node = evt.currentTarget

  if (node instanceof Element) {
    const rect = node.getBoundingClientRect()
    return {
      x: pointer.clientX - rect.left - node.clientLeft,
      y: pointer.clientY - rect.top - node.clientTop
    }
  }

  return {
    x: pointer.pageX ?? pointer.clientX,
    y: pointer.pageY ?? pointer.clientY
  }
}

export function getEventPointer(e: MouseEvent | TouchEvent | Pointer) {
  return 'touches' in e ? e.touches[0] : e
}

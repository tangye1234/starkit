export interface Pointer {
  readonly clientX: number
  readonly clientY: number
  readonly pageX?: number
  readonly pageY?: number
  readonly currentTarget?: EventTarget
}

/**
 * Get the event position to the target node
 * @see https://github.com/d3/d3-selection/blob/main/src/pointer.js
 */
export function getPointerPos(
  evt: MouseEvent | TouchEvent | Pointer,
  node?: EventTarget | null | undefined
) {
  const pointer = getEventPointer(evt)
  if (!node) node = evt.currentTarget

  if (node instanceof SVGSVGElement) {
    let point = node.createSVGPoint()
    point.x = pointer.clientX
    point.y = pointer.clientY
    point = point.matrixTransform(node.getScreenCTM()?.inverse())
    return {
      x: point.x,
      y: point.y
    }
  }

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

export function getEventPointer<T extends MouseEvent | TouchEvent | Pointer>(
  e: T
) {
  return (e instanceof TouchEvent ? e.touches[0] : e) as T extends TouchEvent
    ? Touch
    : T
}

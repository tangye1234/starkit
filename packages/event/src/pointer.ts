/**
 * Get the event position to the target node
 * @see https://github.com/d3/d3-selection/blob/main/src/pointer.js
 */
export function getPointerPos(
  evt: MouseEvent | TouchEvent,
  node?: EventTarget | null | undefined,
  identifier?: unknown
) {
  const pointer = getEventPointer(evt, identifier)
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

export function getEventPointer<T extends MouseEvent | TouchEvent>(
  e: T,
  identifier?: unknown
) {
  if ('changedTouches' in e) {
    if (typeof identifier === 'number') {
      const touch = Array.from(e.changedTouches).find(
        touch => touch.identifier === identifier
      )
      if (touch) return touch as T extends TouchEvent ? Touch : MouseEvent
    }
    return e.changedTouches[0] as T extends TouchEvent ? Touch : MouseEvent
  }
  return e as MouseEvent as T extends TouchEvent ? Touch : MouseEvent
}

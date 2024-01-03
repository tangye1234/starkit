type ObserverInit = Omit<IntersectionObserverInit, 'threshold'>
type ObserverCallback = (entry: IntersectionObserverEntry) => void
type Identifier = {
  readonly root: Element | Document | null
  readonly margin: string
}
type ElementState = {
  listeners: Set<ObserverCallback>
  entry?: IntersectionObserverEntry
}

const observers = new Map<Identifier, IntersectionObserver>()
// const idList: Identifier[] = []
const elementStateMap = new WeakMap<
  Element,
  WeakMap<IntersectionObserver, ElementState>
>()
const listenerCounterMap = new WeakMap<
  IntersectionObserver,
  Map<Element, number>
>()
const identifierMap = new Map<
  Element | Document | null,
  Map<string, Identifier>
>()

function getIdentifier({
  root,
  rootMargin
}: ObserverInit): Identifier | undefined {
  root = root || null
  const margin = rootMargin || ''
  return identifierMap.get(root)?.get(margin)
}

function getOrCreateIdentifier({ root, rootMargin }: ObserverInit): Identifier {
  root = root || null
  const margin = rootMargin || ''
  let map = identifierMap.get(root)
  if (!map) {
    map = new Map()
    identifierMap.set(root, map)
  }
  let id = map.get(margin)
  if (!id) {
    id = { root, margin }
    map.set(margin, id)
  }
  return id
}

function deleteIdentifier({ root, rootMargin }: ObserverInit): boolean {
  root = root || null
  const margin = rootMargin || ''
  const map = identifierMap.get(root)
  if (!map) return false
  const deleted = map.delete(margin)
  if (map.size === 0) identifierMap.delete(root)
  return deleted
}

function getElementState(element: Element, observer: IntersectionObserver) {
  let map = elementStateMap.get(element)
  if (!map) {
    map = new WeakMap()
    elementStateMap.set(element, map)
  }

  let state = map.get(observer)
  if (!state) {
    state = { listeners: new Set() }
    map.set(observer, state)
  }

  return state
}

function bindCallbackToElementState(
  element: Element,
  observer: IntersectionObserver,
  callback: ObserverCallback
) {
  const state = getElementState(element, observer)
  state.listeners.add(callback)
  return state
}

function unbindCallbackFromElementState(
  element: Element,
  observer: IntersectionObserver,
  callback: ObserverCallback
) {
  const map = elementStateMap.get(element)
  const state = map?.get(observer)
  state?.listeners.delete(callback)
  if (state?.listeners.size === 0) {
    map?.delete(observer)
  }
}

function createObserver(options: ObserverInit): IntersectionObserver {
  const id = getOrCreateIdentifier(options)

  const instance = observers.get(id)
  if (instance) {
    return instance
  }

  const observer = new IntersectionObserver((entries, ob) => {
    entries.forEach(entry => {
      const state = getElementState(entry.target, ob)
      state.entry = entry
      const { listeners } = state
      listeners.forEach(listener => listener(entry))
    })
  }, options)

  observers.set(id, observer)
  return observer
}

function deleteObserver(options: ObserverInit) {
  const index = idList.findIndex(
    obj => obj.root === root && obj.margin === margin
  )

  if (index > -1) {
    const [id] = idList.splice(index, 1)
    return observers.delete(id)
  }

  return false
}

export function addIntersection(
  element: Element,
  callback: ObserverCallback,
  options: ObserverInit
): () => void {
  const observer = createObserver(options)
  const state = bindCallbackToElementState(element, observer, callback)

  let l = listenerCounterMap.get(observer)
  if (!l) {
    l = new Map()
    listenerCounterMap.set(observer, l)
  }

  let h = 0
  const listeners = l
  let counter = listeners.get(element)
  if (typeof counter !== 'number' || counter < 1) {
    counter = 0
    observer.observe(element)
  } else {
    h = window.setTimeout(() => {
      h = 0
      const entry = state.entry
      entry && callback(entry)
    })
  }

  listeners.set(element, counter + 1)

  let haveUnobserved = false

  return function unobserve(): void {
    if (haveUnobserved) return
    haveUnobserved = true

    h && clearTimeout(h)

    unbindCallbackFromElementState(element, observer, callback)

    const counter = listeners.get(element)
    if (typeof counter === 'undefined' || counter <= 1) {
      listeners.delete(element)
      observer.unobserve(element)

      // Destroy observer when there's nothing left to watch:
      if (listeners.size === 0) {
        observer.disconnect()
        listenerCounterMap.delete(observer)
        deleteObserver(options)
      }
    } else {
      listeners.set(element, counter - 1)
    }
  }
}

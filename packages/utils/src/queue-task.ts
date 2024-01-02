export const queueTask =
  typeof queueMicrotask === 'function'
    ? (queueMicrotask as (cb: () => void) => void)
    : (cb: () => void) => void Promise.resolve().then(cb)

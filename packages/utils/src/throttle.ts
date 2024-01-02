// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => R, R>(
  callback: T,
  delay = 166
): T {
  const name = callback.name || 'anonymous'
  let ref: { current: R } | undefined

  return {
    [name]: function (this: unknown, ...args: Parameters<T>) {
      if (ref) return ref.current
      ref = {
        current: callback.apply(this, args)
      }
      setTimeout(() => {
        ref = undefined
      }, delay)
      return ref.current
    } as T
  }[name]
}

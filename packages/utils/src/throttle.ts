import { hoc } from './hoc'

export function throttle<T extends (...args: any[]) => R, R = unknown>(
  fn: T,
  delay = 166
): T {
  let ref: { current: R } | undefined

  return hoc(
    function (this: unknown, ...args: Parameters<T>) {
      if (ref) return ref.current
      ref = {
        current: fn.apply(this, args)
      }
      setTimeout(() => {
        ref = undefined
      }, delay)
      return ref.current
    } as T,
    fn
  )
}

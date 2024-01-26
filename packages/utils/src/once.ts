import { hoc } from './hoc'

export function once<Fn extends (...args: any[]) => R, R>(fn: Fn): Fn {
  let result: { current: R } | undefined
  return hoc(
    function (this: unknown, ...args: Parameters<Fn>) {
      if (result) return result.current
      result = {
        current: fn.apply(this, args)
      }
      return result?.current
    } as Fn,
    fn
  )
}

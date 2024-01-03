export function once<Fn extends (...args: any[]) => R, R>(fn: Fn): Fn {
  let result: { current: R } | undefined
  const name = fn.name || 'anonymous'
  return {
    [name]: function (this: unknown, ...args: Parameters<Fn>) {
      if (result) return result.current

      result = {
        current: fn.apply(this, args)
      }

      return result?.current
    } as Fn
  }[name]
}

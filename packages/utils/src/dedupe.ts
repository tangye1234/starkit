import { hoc } from './hoc'

export function dedupe<F extends (...args: any[]) => R, R>(
  fn: F,
  cacheTime = 1000
): F {
  let lastTime = 0
  let lastCalled: readonly [Parameters<F>, R] | undefined

  return hoc(
    function (this: unknown, ...args: Parameters<F>) {
      const now = Date.now()
      const [lastArgs, lastResult] = lastCalled || []
      if (now - lastTime < cacheTime && args.length === lastArgs?.length) {
        let same = true
        for (let i = 0; i < args.length; i++) {
          if (args[i] !== lastArgs[i]) {
            same = false
            break
          }
        }
        if (same) {
          return lastResult
        }
      }
      lastTime = now
      lastCalled = [args, fn.apply(this, args)]
      return lastCalled[1]
    } as F,
    fn
  )
}

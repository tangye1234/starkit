import { sleep } from './sleep'
import { Runnable } from './types'

export function retry<Fn extends Runnable>(
  fn: Fn,
  opts: { times?: number; interval?: number | Runnable } = {}
) {
  const { times = 3, interval = 0 } = opts
  const name = fn.name || 'anonymous'

  return {
    [name]: async function (this: unknown, s?: AbortSignal) {
      let i = 0
      while (i++ < times) {
        try {
          return fn(s)
        } catch (e) {
          if (i === times) throw e
          await (typeof interval === 'number' ? sleep(interval) : interval(s))
        }
      }
    } as ReturnType<Fn> extends Promise<unknown>
      ? Fn
      : (...args: Parameters<Fn>) => Promise<ReturnType<Fn>>
  }[name]
}

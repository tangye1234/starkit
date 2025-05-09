import { isAbortError } from '@starkit/utils/error'
import { hoc } from '@starkit/utils/hoc'

import { sleep } from './sleep'
import { Runnable } from './types'

export type RetryFn<Fn extends Runnable> =
  ReturnType<Fn> extends Promise<unknown>
    ? Fn
    : (...args: Parameters<Fn>) => Promise<ReturnType<Fn>>

export type RetryOptions =
  | {
      times?: number
      interval?: number | Runnable
    }
  | {
      onError: (
        err: unknown,
        times: number,
        s?: AbortSignal
      ) => void | Promise<void>
    }

export function retryOnError(opts: RetryOptions = {}) {
  if ('onError' in opts) {
    return opts.onError
  } else {
    return async (err: unknown, times: number, signal?: AbortSignal) => {
      if (isAbortError(err)) throw err
      const { times: maxTimes = 3, interval = 0 } = opts
      if (times >= maxTimes) throw err
      if (interval !== 0) {
        await (typeof interval === 'number'
          ? sleep(interval, signal)
          : interval(signal))
      }
    }
  }
}

export function retry(
  opts: RetryOptions
): <Fn extends Runnable>(fn: Fn) => RetryFn<Fn>
export function retry<Fn extends Runnable>(
  fn: Fn,
  opts?: RetryOptions
): RetryFn<Fn>
export function retry<Fn extends Runnable>(
  fnOrOpts: Fn | RetryOptions,
  opts: RetryOptions = {}
) {
  if (typeof fnOrOpts !== 'function') {
    return (fn: Fn) => retry(fn, fnOrOpts)
  }

  const fn = fnOrOpts as Fn
  const onError = retryOnError(opts)

  return hoc(
    async function (this: unknown, s?: AbortSignal) {
      let times = 0
      while (true) {
        try {
          return await fn(s)
        } catch (err) {
          times++
          await onError(err, times, s)
        }
      }
    } as ReturnType<Fn> extends Promise<unknown>
      ? Fn
      : (...args: Parameters<Fn>) => Promise<ReturnType<Fn>>,
    fn
  )
}

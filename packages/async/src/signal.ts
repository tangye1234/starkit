import { TimeoutError } from '@starkit/utils/error'

export const abort: typeof AbortSignal.abort =
  typeof AbortSignal.abort === 'function'
    ? AbortSignal.abort.bind(AbortSignal)
    : reason => {
        const c = new AbortController()
        c.abort(reason)
        return c.signal
      }

export const timeout: typeof AbortSignal.timeout =
  typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout.bind(AbortSignal)
    : milliseconds => {
        const c = new AbortController()
        setTimeout(() => c.abort(new TimeoutError()), milliseconds)
        return c.signal
      }

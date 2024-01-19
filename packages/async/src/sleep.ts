import { deferred } from '@starkit/utils/deferred'
import { AbortError } from '@starkit/utils/error'

export function sleep(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(signal.reason || new AbortError())

  const { promise, resolve, reject } = deferred<void>()
  const timeoutId = setTimeout(resolve, ms)
  promise.catch(() => clearTimeout(timeoutId))

  if (signal) {
    const abort = () => reject(signal.reason || new AbortError())
    signal.addEventListener('abort', abort)
    promise.then(() => signal.removeEventListener('abort', abort))
  }

  return promise
}

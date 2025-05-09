import { AbortError } from '@starkit/utils/error'

import { runLoop } from './run-loop'
import type { RunnableQueue } from './types'

export async function runParallel(
  queue: RunnableQueue,
  concurrency: number,
  s?: AbortSignal
) {
  if (concurrency < 1)
    throw new Error('concurrency must be greater than or equal to 1')

  if (concurrency === 1) {
    await runLoop(queue, s)
  }

  const c = new AbortController()
  const signal = c.signal
  const abort = () => c.abort()

  if (s) {
    s.addEventListener('abort', abort, { once: true })
  }

  try {
    await Promise.all(
      Array.from({ length: concurrency }).map(() => runLoop(queue, signal))
    )
  } catch (e) {
    if (s?.aborted) {
      throw s.reason || new AbortError({ cause: e })
    }
    if (signal.aborted) {
      throw signal.reason || new AbortError({ cause: e })
    }
    abort()
    throw e
  } finally {
    if (s) {
      s.removeEventListener('abort', abort)
    }
  }
}

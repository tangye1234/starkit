import { runLoop } from './run-loop'
import type { RunnableQueue } from './types'

export async function runParallel(
  queue: RunnableQueue,
  concurrency: number,
  s?: AbortSignal
) {
  if (concurrency < 1)
    throw new Error('concurrency must be greater than or equal to 1')

  await Promise.all(
    Array.from({ length: concurrency }).map(() => runLoop(queue, s))
  )
}

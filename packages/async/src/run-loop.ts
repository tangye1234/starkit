import { Runnable, RunnableQueue } from './types'

export async function runLoop(queue: RunnableQueue, s?: AbortSignal) {
  let r: Runnable | undefined
  while ((r = await queue.read(s))) await r(s)
}

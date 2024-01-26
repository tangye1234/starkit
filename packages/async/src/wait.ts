import { deferred } from '@starkit/utils/deferred'

export async function wait(signal: AbortSignal): Promise<unknown> {
  if (signal.aborted) return signal.reason
  const { promise, resolve } = deferred()
  signal.addEventListener('abort', resolve, { once: true })
  await promise
  return signal.reason
}

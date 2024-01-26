import { useMemo } from 'react'
import { buffer } from '@starkit/utils/buffer'

import { useCallbackRef } from './use-callback-ref'

export function useBuffer<T extends (...args: any[]) => unknown>(
  fn: T,
  delay = 166
) {
  const referencedFn = useCallbackRef(fn)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const buferredFn = useMemo(() => buffer(referencedFn, delay), [delay])

  return buferredFn
}

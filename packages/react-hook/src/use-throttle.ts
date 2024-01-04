import { useMemo } from 'react'
import { throttle } from '@fine/utils'

import { useCallbackRef } from './use-callback-ref'

export function useThrottle<T extends (...args: any[]) => void>(
  fn: T,
  delay = 166
) {
  const referencedFn = useCallbackRef(fn)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const throttledFn = useMemo(() => throttle(referencedFn, delay), [delay])

  return throttledFn
}

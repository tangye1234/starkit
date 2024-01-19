import { useMemo } from 'react'
import { debounce } from '@starkit/utils/debounce'

import { useCallbackRef } from './use-callback-ref'

const useDebounce = function <T extends (...args: any[]) => void>(
  fn: T,
  delay = 166
) {
  const referencedFn = useCallbackRef(fn)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFn = useMemo(() => debounce(referencedFn, delay), [delay])

  return debouncedFn
} as typeof debounce

export { useDebounce }

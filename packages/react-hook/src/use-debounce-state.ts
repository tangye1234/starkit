import { useEffect, useMemo, useState } from 'react'
import { debounce } from '@starkit/utils/debounce'

export function useDebounceState<T>(value: T, delay = 1000) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  const setDebounce = useMemo(() => debounce(setDebouncedValue, delay), [delay])
  useEffect(() => setDebounce(value), [value, setDebounce])

  return debouncedValue
}

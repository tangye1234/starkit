import { useMemo, useRef } from 'react'

import { useLayoutEffect } from './use-layout-effect'

export function useCallbackRef<T extends (...args: any[]) => void>(
  callback: T
) {
  const callbackRef = useRef(callback)

  useLayoutEffect(() => {
    callbackRef.current = callback
  })

  return useMemo(
    () =>
      function (this: unknown, ...args) {
        return callbackRef.current?.apply(this, args)
      } as T,
    []
  )
}

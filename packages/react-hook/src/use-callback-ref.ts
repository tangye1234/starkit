import { useEffect, useMemo, useRef } from 'react'

export function useCallbackRef<T extends (...args: any[]) => void>(
  callback: T
) {
  const callbackRef = useRef(callback)

  useEffect(() => {
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

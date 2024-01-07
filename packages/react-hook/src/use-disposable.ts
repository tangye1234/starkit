import { type DependencyList, useMemo, useRef } from 'react'
import { queueTask } from '@starkit/utils'

import { useMount } from './use-mount'

/**
 * Get or create an instance which is automatically disposed by this hook.
 *
 * @param create an dispose factory
 * @param deps when to create a new one
 * @returns the instance
 */
export default function useDisposable<const T>(
  create: () => readonly [instance: T, dispose: () => void],
  deps: DependencyList = []
): T {
  const disposeRef = useRef<() => void>()
  const instance = useMemo(() => {
    disposeRef.current?.()
    const [instance, dispose] = create()
    if (typeof window === 'undefined') queueTask(dispose)
    else disposeRef.current = dispose
    return instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useMount(() => {
    const dispose = disposeRef.current
    if (!dispose) return

    return () => {
      dispose()
      disposeRef.current = undefined
    }
  })

  return instance
}

export { useDisposable }

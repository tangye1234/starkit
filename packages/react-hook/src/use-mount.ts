import { type EffectCallback, useEffect, useRef } from 'react'
import { queueTask } from '@starkit/utils'

import { useIsStrictMode } from './use-is-strict-mode'

const useStrictOnMount = (effect: EffectCallback) => {
  const effectRef = useRef<{ readonly dispose: ReturnType<EffectCallback> }>()

  useEffect(() => {
    let effectResult = effectRef.current
    if (effectResult) {
      effectRef.current = undefined
    } else {
      effectResult = { dispose: effect() }
    }

    return () => {
      effectRef.current = effectResult
      queueTask(() => effectRef.current?.dispose?.())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

// eslint-disable-next-line react-hooks/exhaustive-deps
const useNormalOnMount = (effect: EffectCallback) => useEffect(effect, [])

/**
 * Will only mount once and unmount once at last if mount returns a callback,
 * event for react 18 dev strict mode.
 * @param effect
 */
export function useMount(effect: EffectCallback) {
  const useOnMount = useIsStrictMode() ? useStrictOnMount : useNormalOnMount
  useOnMount(effect)
}

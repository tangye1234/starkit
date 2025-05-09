import { useEffect, useState } from 'react'

import { useIsSSR } from './use-is-ssr'

function getDevicePixelRatio() {
  if (typeof window !== 'undefined') {
    return window.devicePixelRatio || 1
  }
  return 1
}

export function useDevicePixelRatio() {
  const ssr = useIsSSR()
  const [devicePixelRatio, setDevicePixelRatio] = useState(
    ssr ? 1 : getDevicePixelRatio()
  )

  useEffect(() => {
    let mql = window.matchMedia(`(resolution: ${devicePixelRatio}dppx)`)

    const handleDPRChange = () => {
      const current = getDevicePixelRatio()
      setDevicePixelRatio(current)

      // 更新媒体查询条件
      mql.removeEventListener('change', handleDPRChange)
      mql = window.matchMedia(`(resolution: ${current}dppx)`)
      mql.addEventListener('change', handleDPRChange)
    }

    mql.addEventListener('change', handleDPRChange)
    return () => mql.removeEventListener('change', handleDPRChange)
  }, [devicePixelRatio])

  return devicePixelRatio
}

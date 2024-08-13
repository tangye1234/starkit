import { useSyncExternalStore } from 'react'

const noopEffect = () => () => {}
const clientPredicate = () => false
const serverPredicate = () => true

export function useIsSSR() {
  return useSyncExternalStore(noopEffect, clientPredicate, serverPredicate)
}

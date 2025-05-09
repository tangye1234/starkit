import { useReducer } from 'react'

export function useUpdate() {
  const [, forceUpdate] = useReducer(() => ({}), {})
  return forceUpdate
}

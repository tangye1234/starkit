import * as React from 'react'

/**
 * @returns Current react fiber being rendered
 * @see https://github.com/microsoft/use-disposable/blob/main/src/useIsStrictMode.ts
 */
export const getCurrentOwner = () => {
  try {
    // React 19
    // @ts-expect-error - using react internals
    return React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.A.getOwner()
  } catch {}

  try {
    // React <18
    // @ts-expect-error - using react internals
    return React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
      .ReactCurrentOwner.current
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        'getCurrentOwner: failed to get current fiber, please report this bug to maintainers'
      )
    }
  }
}

const REACT_STRICT_MODE_TYPE = /*#__PURE__*/ Symbol.for('react.strict_mode')

/**
 * Traverses up the React fiber tree to find the StrictMode component.
 * Note: This only detects strict mode from React >= 18
 * https://github.com/reactwg/react-18/discussions/19
 * @returns If strict mode is being used in the React tree
 */
export const useIsStrictMode = (): boolean => {
  // This check violates Rules of Hooks, but "process.env.NODE_ENV" does not change in bundle
  // or during application lifecycle
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const isStrictMode = React.useRef<boolean | undefined>(undefined)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const reactMajorVersion = React.useMemo(() => {
    return Number(React.version.split('.')[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [React.version])

  if (isNaN(reactMajorVersion) || reactMajorVersion < 18) {
    return false
  }

  if (isStrictMode.current === undefined) {
    let currentOwner = getCurrentOwner()
    while (currentOwner && currentOwner.return) {
      currentOwner = currentOwner.return
      if (
        currentOwner.type === REACT_STRICT_MODE_TYPE ||
        currentOwner.elementType === REACT_STRICT_MODE_TYPE
      ) {
        isStrictMode.current = true
      }
    }
  }

  return !!isStrictMode.current
}

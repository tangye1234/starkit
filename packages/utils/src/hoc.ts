type Signature =
  | {
      name?: string
      length?: number
    }
  | ((...args: any[]) => unknown)

export function hoc<Fn extends (...args: any[]) => unknown>(
  fn: Fn,
  signature: Signature
): Fn {
  if (signature === fn) return fn

  const name = signature.name || 'anonymous'
  const length = signature.length || 0

  return Object.defineProperties(fn, {
    name: { value: name, configurable: true },
    length: { value: length, configurable: true }
  })
}

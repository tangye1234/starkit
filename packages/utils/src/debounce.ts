type Fn<A extends unknown[], R> = (...args: A) => R

export function debounce<A extends unknown[], R>(
  func: Fn<A, R>,
  wait = 166
): Fn<A, () => void> {
  let t: ReturnType<typeof setTimeout> | undefined
  const dispose = () => void (t && clearTimeout(t))
  const name = func.name || 'anonymous'

  return {
    [name]: function (this: unknown, ...args: A) {
      t && clearTimeout(t)
      t = setTimeout(func.bind(this), wait, ...args)
      return dispose
    }
  }[name]
}

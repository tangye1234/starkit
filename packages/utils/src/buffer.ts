import { hoc } from './hoc'

/**
 * A buffered throttle hoc, but ensures the last call
 */
export function buffer<T extends (...args: any[]) => R, R = unknown>(
  fn: T,
  delay = 166
): T {
  let ref: { current: R } | undefined
  let arg:
    | {
        context: unknown
        args: Parameters<T>
      }
    | undefined

  const run = () => {
    ref = undefined
    if (!arg) return
    ref = {
      current: fn.apply(arg.context, arg.args)
    }
    arg = undefined
    setTimeout(run, delay)
    return ref.current
  }

  return hoc(
    function (this: unknown, ...args: Parameters<T>) {
      arg = { context: this, args }
      if (ref) return ref.current
      return run()
    } as T,
    fn
  )
}

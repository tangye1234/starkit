import { hoc } from '@starkit/utils/hoc'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Result<T> = { ok: true; value: T } | { ok: false; reason: any }

export function safe<A extends unknown[], T>(fn: (...args: A) => T) {
  return hoc(
    function (this: unknown, ...args: A) {
      try {
        const r = fn.apply(this, args)
        if (r instanceof Promise) {
          return r.then(
            value => ({ ok: true, value }),
            reason => ({ ok: false, reason })
          )
        } else {
          return { ok: true, value: r }
        }
      } catch (reason) {
        return { ok: false, reason }
      }
    } as (
      ...args: A
    ) => T extends Promise<unknown> ? Promise<Result<Awaited<T>>> : Result<T>,
    fn
  )
}

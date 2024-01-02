export interface PromiseResolvers<T> {
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
  promise: Promise<T>
}

export const deferred = (
  'withResolvers' in Promise && typeof Promise.withResolvers === 'function'
    ? Promise.withResolvers.bind(Promise)
    : <T>() => {
        let resolve!: (value: T) => void
        let reject!: (reason?: unknown) => void
        const promise = new Promise<T>((s, j) => ([resolve, reject] = [s, j]))
        return { resolve, reject, promise }
      }
) as <T>() => PromiseResolvers<T>

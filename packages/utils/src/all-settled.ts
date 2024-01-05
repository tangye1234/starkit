type AllSettled = typeof Promise.allSettled

export const allSettled =
  typeof Promise.allSettled !== 'undefined'
    ? Promise.allSettled.bind(Promise)
    : (function allSettled(promises: unknown[] | Iterable<unknown>) {
        return Promise.all(
          Array.from(promises).map(p =>
            Promise.resolve(p).then(
              v => ({ status: 'fulfilled', value: v }),
              r => ({ status: 'rejected', reason: r })
            )
          )
        )
      } as AllSettled)

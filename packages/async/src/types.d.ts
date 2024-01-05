// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Runnable = (s?: AbortSignal) => any

export type RunnableQueue = {
  read(s?: AbortSignal): Promise<Runnable | undefined>
}

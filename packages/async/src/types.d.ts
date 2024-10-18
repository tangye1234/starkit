export type Runnable = (s?: AbortSignal) => any

export type RunnableQueue = {
  read(s?: AbortSignal): Promise<Runnable | undefined>
}

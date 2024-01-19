export class AbortError extends Error {
  constructor(opt?: ErrorOptions) {
    super('This operation was aborted', opt)
  }
  get name() {
    return 'AbortError'
  }
  get cancelled() {
    return true
  }
  get code() {
    return 20
  }
}

export class TimeoutError extends Error {
  constructor(opt?: ErrorOptions) {
    super('The operation timed out', opt)
  }
  get name() {
    return 'TimeoutError'
  }
  get code() {
    return 23
  }
}

export class StatusError extends Error {
  public readonly status: number

  constructor(status: number, message: string, opt?: ErrorOptions) {
    super(message, opt)
    this.status = status
  }
  get name() {
    return 'StatusError'
  }
}

export function isUnAuthenticated(
  err: unknown
): err is StatusError & { status: 401 } {
  return err instanceof StatusError && err.status === 401
}

export function isAbortError(
  err: unknown
): err is Error & { name: 'AbortError' } {
  return err instanceof Error && err.name === 'AbortError'
}

export function isTimeoutError(
  err: unknown
): err is Error & { name: 'TimeoutError' } {
  return err instanceof Error && err.name === 'TimeoutError'
}

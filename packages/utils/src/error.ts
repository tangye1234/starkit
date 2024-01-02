export class AbortError extends Error {
  constructor(opt?: ErrorOptions) {
    super('The operation was aborted', opt)
  }
  get name() {
    return 'AbortError'
  }
  get cancelled() {
    return true
  }
}

export class TimeoutError extends Error {
  constructor(opt?: ErrorOptions) {
    super('The operation timed out', opt)
  }
  get name() {
    return 'TimeoutError'
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

import { StatusError } from './error'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetcher<JSON = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<JSON> {
  const res = await fetch(input, init)

  if (!res.ok) {
    const isJson = res.headers
      .get('content-type')
      ?.match(/^application\/json\b/i)
    let message = 'An unexpected error occurred'
    let cause = undefined
    const status = res.status
    if (isJson) {
      cause = await res.json()
      const info =
        cause.Message ||
        cause.Msg ||
        cause.message ||
        cause.msg ||
        cause.Error ||
        cause.error ||
        cause.Detail ||
        cause.detail ||
        cause.Info ||
        cause.info
      if (info && typeof info === 'string') {
        message = info
      }
    }

    throw new StatusError(status, message, { cause })
  }

  return res.json()
}

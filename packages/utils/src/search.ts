export type QueryObject = {
  [key: string]: unknown
}

export function parseSearchParams(search: string | QueryObject) {
  if (typeof search === 'string') {
    return new URLSearchParams(search)
  }
  const params = new URLSearchParams()
  Object.entries(search).forEach(([key, value]) =>
    setSearchParamsValue(params, key, value)
  )
  return params
}

export function setSearchParamsValue(
  params: URLSearchParams,
  key: string,
  value: unknown,
  method: 'append' | 'set' = 'set'
) {
  if (typeof value === 'string') {
    value ? params[method](key, value) : params.delete(key)
  } else if (typeof value === 'number') {
    isFinite(value) ? params[method](key, value.toString()) : params.delete(key)
  } else if (typeof value === 'boolean') {
    params[method](key, value.toString())
  } else if (Array.isArray(value)) {
    method === 'set' && params.delete(key)
    value.forEach(v => setSearchParamsValue(params, key, v, 'append'))
  } else if (value === null || value === undefined) {
    params.delete(key)
  }
}

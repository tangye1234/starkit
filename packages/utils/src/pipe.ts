import { Duplex } from './duplex'
import { AbortError, ClosedError } from './error'
import type { Reader } from './reader'
import type { Writer } from './writer'

export interface PipeOptions {
  signal?: AbortSignal
  preventAbort?: boolean
  preventClose?: boolean
}

function isAbortSignal(s: unknown): s is AbortSignal {
  return (
    s instanceof AbortSignal || (!!s && typeof s === 'object' && 'aborted' in s)
  )
}

export async function pipe<T>(
  reader: Reader<T> | Duplex<T>,
  writer: Writer<T> | Duplex<T>,
  s: AbortSignal | PipeOptions = {}
) {
  const {
    signal,
    preventAbort = false,
    preventClose = false
  } = isAbortSignal(s) ? { signal: s } : s

  const r = reader instanceof Duplex ? reader.reader : reader
  const w = writer instanceof Duplex ? writer.writer : writer

  if (r.closed) throw new ClosedError('reader is closed')

  try {
    while (!r.closed) {
      const item = await reader.read(signal)
      await writer.write(item, signal)
    }

    if (!preventClose) {
      w.close()
      await w.finished
    }
  } catch (e) {
    if (preventAbort) {
      throw e
    }

    if (!w.closed) {
      w.abort(e)
      await w.finished
      return
    }

    if (signal && signal.aborted && e !== signal.reason) {
      throw new AbortError({ cause: e })
    }

    throw e
  }
}

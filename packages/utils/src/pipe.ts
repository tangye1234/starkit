import type { Duplex } from './duplex'
import type { Reader } from './reader'
import type { Writer } from './writer'

export async function pipe<T>(
  reader: Reader<T> | Duplex<T>,
  writer: Writer<T> | Duplex<T>,
  s?: AbortSignal
) {
  let r: T | undefined
  while ((r = await reader.read(s))) await writer.write(r, s)
}

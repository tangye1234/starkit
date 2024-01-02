export function findSortedIndex(
  min: number,
  max: number,
  compare: (input: number) => number
): number {
  let [i, j] = [min, max]

  while (i < j) {
    const mid = (i + j) >> 1
    const cmp = compare(mid)

    if (cmp === 0) {
      return mid
    }

    if (cmp < 0) {
      i = mid + 1
    } else {
      j = mid
    }
  }

  return -1
}

// find the index where the item is larger than or equal to the target
export function searchSortedRangeIndex(
  min: number,
  max: number,
  compare: (input: number) => number
): number {
  let [i, j] = [min, max]

  while (i < j) {
    const mid = (i + j) >> 1
    const cmp = compare(mid)

    if (cmp === 0) {
      return mid
    }

    if (cmp < 0) {
      i = mid + 1
    } else {
      j = mid
    }
  }

  return i
}

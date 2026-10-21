export type DiffKind = 'same' | 'added' | 'removed'

export interface DiffLine {
  kind: DiffKind
  text: string
}

const MAX_LINES = 1500

export function diffLines(before: string, after: string): DiffLine[] {
  const left = before.split('\n').slice(0, MAX_LINES)
  const right = after.split('\n').slice(0, MAX_LINES)
  const table: number[][] = Array.from({ length: left.length + 1 }, () => new Array<number>(right.length + 1).fill(0))

  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      table[i][j] = left[i] === right[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }

  const result: DiffLine[] = []
  let i = 0
  let j = 0

  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      result.push({ kind: 'same', text: left[i] })
      i++
      j++
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      result.push({ kind: 'removed', text: left[i] })
      i++
    } else {
      result.push({ kind: 'added', text: right[j] })
      j++
    }
  }

  while (i < left.length) {
    result.push({ kind: 'removed', text: left[i++] })
  }

  while (j < right.length) {
    result.push({ kind: 'added', text: right[j++] })
  }

  return result
}

export function formatPointValue(value: number, mode: 'plain' | 'positive' | 'negative' | 'signed') {
  if (mode === 'positive') {
    return `+${value}`
  }

  if (mode === 'negative') {
    return `-${Math.abs(value)}`
  }

  if (mode === 'signed') {
    return value > 0 ? `+${value}` : `${value}`
  }

  return `${value}`
}

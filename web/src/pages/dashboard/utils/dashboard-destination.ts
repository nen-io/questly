export type DashboardDestination =
  | { kind: 'path'; path: string }
  | { kind: 'win'; path: string; runId: number }

export const getPositiveInteger = (value: unknown) => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value)
    return parsed > 0 ? parsed : null
  }

  return null
}

export const getMetadataRecord = (value: unknown) => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
)

export const normalizeInternalPath = (link: string | null) => (
  typeof link === 'string' && link.startsWith('/app/')
    ? link
    : null
)

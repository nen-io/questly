export function formatTaskExpiryWindow(expiresInHours: number) {
  if (expiresInHours < 24) {
    return `${expiresInHours} hour${expiresInHours === 1 ? '' : 's'}`
  }

  const days = Math.floor(expiresInHours / 24)
  const hours = expiresInHours % 24

  if (hours === 0) {
    return `${days} day${days === 1 ? '' : 's'}`
  }

  return `${days}d ${hours}h`
}

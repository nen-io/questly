function toKebabCase(value: string) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
}

function buildThemeVariables(tokens?: Record<string, string>) {
  if (!tokens) {
    return {}
  }

  const fallbackEntries: Record<string, string> = {
    popover: tokens.card || '#ffffff',
    popoverForeground: tokens.cardForeground || '#171717',
    destructive: '#b42318',
    radius: '1rem',
    input: tokens.border || '#d4d4d8',
    heroFrom: tokens.heroFrom || tokens.background || '#ffffff',
    heroVia: tokens.heroVia || tokens.background || '#f5f5f5',
    heroTo: tokens.heroTo || tokens.background || '#e5e5e5',
    surface: tokens.surface || tokens.background || '#ffffff',
    surfaceAlt: tokens.surfaceAlt || tokens.muted || '#f5f5f5',
    fontEmoji: tokens.fontEmoji || '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif',
    fontSans: tokens.fontSans || '"Nunito", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
    fontDisplay: tokens.fontDisplay || '"Pixelify Sans", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", cursive',
  }

  const normalized = {
    background: tokens.background,
    foreground: tokens.foreground,
    card: tokens.card,
    cardForeground: tokens.cardForeground,
    primary: tokens.primary,
    primaryForeground: tokens.primaryForeground,
    secondary: tokens.secondary,
    secondaryForeground: tokens.secondaryForeground,
    muted: tokens.muted,
    mutedForeground: tokens.mutedForeground,
    accent: tokens.accent,
    accentForeground: tokens.accentForeground,
    border: tokens.border,
    ring: tokens.ring,
    ...fallbackEntries,
  }

  return Object.fromEntries(
    Object.entries(normalized).flatMap(([key, value]) => {
      if (!value) {
        return []
      }

      const kebabKey = toKebabCase(key)
      return kebabKey === key
        ? [[`--${key}`, value]]
        : [[`--${key}`, value], [`--${kebabKey}`, value]]
    }),
  )
}

export function getThemeStyle(tokens?: Record<string, string>) {
  return buildThemeVariables(tokens)
}

export function applyTheme(tokens?: Record<string, string>) {
  if (!tokens || typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  const variables = buildThemeVariables(tokens)

  for (const [key, value] of Object.entries(variables)) {
    root.style.setProperty(key, value)
  }
}

function toKebabCase(value: string) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
}

interface RgbColor {
  r: number
  g: number
  b: number
}

const white: RgbColor = { r: 255, g: 255, b: 255 }
const black: RgbColor = { r: 0, g: 0, b: 0 }

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function parseHexColor(value: string) {
  const normalized = value.slice(1)

  if (normalized.length === 3) {
    return {
      r: Number.parseInt(normalized[0] + normalized[0], 16),
      g: Number.parseInt(normalized[1] + normalized[1], 16),
      b: Number.parseInt(normalized[2] + normalized[2], 16),
    }
  }

  if (normalized.length === 6) {
    return {
      r: Number.parseInt(normalized.slice(0, 2), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      b: Number.parseInt(normalized.slice(4, 6), 16),
    }
  }

  return null
}

function parseRgbColor(value: string) {
  const match = value.match(/^rgba?\((.+)\)$/i)
  if (!match) {
    return null
  }

  const [rawChannels] = match.slice(1)
  const channels = rawChannels
    .replace(/\//g, ',')
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (channels.length < 3) {
    return null
  }

  return {
    r: clampChannel(Number.parseFloat(channels[0])),
    g: clampChannel(Number.parseFloat(channels[1])),
    b: clampChannel(Number.parseFloat(channels[2])),
  }
}

function parseColor(value?: string) {
  if (!value) {
    return null
  }

  const normalized = value.trim()
  if (normalized.startsWith('#')) {
    return parseHexColor(normalized)
  }

  if (normalized.startsWith('rgb')) {
    return parseRgbColor(normalized)
  }

  return null
}

function mixColors(base: RgbColor, tint: RgbColor, tintWeight: number) {
  const clampedTintWeight = Math.max(0, Math.min(1, tintWeight))
  const baseWeight = 1 - clampedTintWeight

  return {
    r: clampChannel((base.r * baseWeight) + (tint.r * clampedTintWeight)),
    g: clampChannel((base.g * baseWeight) + (tint.g * clampedTintWeight)),
    b: clampChannel((base.b * baseWeight) + (tint.b * clampedTintWeight)),
  }
}

function toRgbString(color: RgbColor) {
  return `rgb(${color.r} ${color.g} ${color.b})`
}

function toRgbaString(color: RgbColor, alpha: number) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.max(0, Math.min(1, alpha))})`
}

function relativeLuminance(color: RgbColor) {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })

  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2])
}

function buildOverlayVariables(tokens: Record<string, string>) {
  const surfaceColor = parseColor(tokens.surface || tokens.background) ?? white
  const backgroundColor = parseColor(tokens.background) ?? surfaceColor
  const cardColor = parseColor(tokens.card) ?? mixColors(surfaceColor, white, 0.12)
  const foregroundColor = parseColor(tokens.foreground || tokens.cardForeground) ?? black
  const mutedColor = parseColor(tokens.mutedForeground) ?? mixColors(foregroundColor, surfaceColor, 0.42)
  const borderColor = parseColor(tokens.border) ?? mixColors(foregroundColor, surfaceColor, 0.76)
  const primaryColor = parseColor(tokens.primary) ?? foregroundColor
  const isDarkTheme = relativeLuminance(surfaceColor) < 0.42

  const overlayBaseColor = isDarkTheme
    ? mixColors(cardColor, backgroundColor, 0.22)
    : mixColors(cardColor, white, 0.42)
  const overlayStrongColor = isDarkTheme
    ? mixColors(overlayBaseColor, primaryColor, 0.08)
    : mixColors(overlayBaseColor, white, 0.38)
  const overlaySoftColor = isDarkTheme
    ? mixColors(overlayBaseColor, backgroundColor, 0.34)
    : mixColors(overlayBaseColor, surfaceColor, 0.18)
  const overlayForegroundColor = isDarkTheme
    ? mixColors(foregroundColor, white, 0.05)
    : mixColors(foregroundColor, black, 0.06)
  const overlayMutedColor = isDarkTheme
    ? mixColors(mutedColor, foregroundColor, 0.18)
    : mixColors(mutedColor, foregroundColor, 0.48)
  const overlaySoftTextColor = isDarkTheme
    ? mixColors(mutedColor, foregroundColor, 0.08)
    : mixColors(mutedColor, foregroundColor, 0.28)
  const overlayBorderColor = isDarkTheme
    ? mixColors(borderColor, foregroundColor, 0.26)
    : mixColors(borderColor, white, 0.44)
  const overlayIconColor = isDarkTheme
    ? mixColors(cardColor, white, 0.12)
    : mixColors(cardColor, white, 0.84)
  const overlayTrackColor = isDarkTheme
    ? mixColors(cardColor, white, 0.1)
    : white

  return {
    overlaySurface: toRgbaString(overlayBaseColor, isDarkTheme ? 0.82 : 0.74),
    overlaySurfaceStrong: toRgbaString(overlayStrongColor, isDarkTheme ? 0.94 : 0.88),
    overlaySurfaceSoft: toRgbaString(overlaySoftColor, isDarkTheme ? 0.68 : 0.64),
    overlayBorder: toRgbaString(overlayBorderColor, isDarkTheme ? 0.48 : 0.78),
    overlayForeground: toRgbString(overlayForegroundColor),
    overlayMuted: toRgbString(overlayMutedColor),
    overlaySoft: toRgbString(overlaySoftTextColor),
    overlayIconSurface: toRgbaString(overlayIconColor, isDarkTheme ? 0.22 : 0.84),
    overlayInputSurface: toRgbaString(overlayBaseColor, isDarkTheme ? 0.9 : 0.9),
    overlayTrack: toRgbaString(overlayTrackColor, isDarkTheme ? 0.44 : 0.82),
    overlayHighlight: toRgbaString(white, isDarkTheme ? 0.12 : 0.82),
    overlayShadow: toRgbaString(mixColors(backgroundColor, black, isDarkTheme ? 0.72 : 0.54), isDarkTheme ? 0.32 : 0.08),
    overlayShadowStrong: toRgbaString(mixColors(backgroundColor, black, isDarkTheme ? 0.84 : 0.68), isDarkTheme ? 0.46 : 0.15),
  }
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
    ...buildOverlayVariables({
      ...tokens,
      ...fallbackEntries,
    }),
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

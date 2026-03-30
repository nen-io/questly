import { defaultFontPresetKey, fontPresets, themeFontPresetKeyMap } from './constants'

export function resolveFontPreset(key?: string | null) {
  return fontPresets.find((preset) => preset.key === key) ?? fontPresets[0]
}

export function resolveThemeFontPresetKey(themeKey?: string | null) {
  return themeKey ? (themeFontPresetKeyMap[themeKey] ?? defaultFontPresetKey) : defaultFontPresetKey
}

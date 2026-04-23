import type { FontPreset } from './types'

export const fontPresets: FontPreset[] = [
  {
    key: 'pixel-arcade',
    name: 'Pixel Arcade',
    description: 'Classic cabinet headings with a soft readable body for longer play sessions.',
    fontSans: '"Nunito", var(--font-emoji), sans-serif',
    fontDisplay: '"Pixelify Sans", var(--font-emoji), cursive',
  },
  {
    key: 'terminal-grid',
    name: 'Terminal Grid',
    description: 'CRT scoreboard flavor with monospace body copy and pixel headers.',
    fontSans: '"Courier New", "Lucida Console", "Andale Mono", monospace',
    fontDisplay: '"Pixelify Sans", var(--font-emoji), cursive',
  },
  {
    key: 'neon-poster',
    name: 'Neon Poster',
    description: 'Bright flyer energy with bolder UI copy and arcade-style headings.',
    fontSans: '"Trebuchet MS", "Verdana", var(--font-emoji), sans-serif',
    fontDisplay: '"Pixelify Sans", var(--font-emoji), cursive',
  },
  {
    key: 'retro-lounge',
    name: 'Retro Lounge',
    description: 'Softer late-night arcade vibe with rounded body copy and pixel titles.',
    fontSans: '"Nunito", var(--font-emoji), sans-serif',
    fontDisplay: '"Pixelify Sans", var(--font-emoji), cursive',
  },
] as const

export const defaultFontPresetKey = fontPresets[0].key

export const themeFontPresetKeyMap: Record<string, string> = {
  'couples-glow': 'pixel-arcade',
  'kids-spark': 'pixel-arcade',
  'friends-arcade': 'terminal-grid',
  'family-camp': 'pixel-arcade',
  'bubble-blast': 'neon-poster',
  'glitch-carnival': 'terminal-grid',
  'gummy-grid': 'pixel-arcade',
  'midnight-laser': 'terminal-grid',
  'sunset-synth': 'neon-poster',
}

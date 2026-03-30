import type { FontPreset } from './types'

export const fontPresets: FontPreset[] = [
  {
    key: 'pixel-arcade',
    name: 'Pixel Arcade',
    description: 'Classic cabinet energy with a soft readable body.',
    fontSans: '"Nunito", var(--font-emoji), sans-serif',
    fontDisplay: '"Pixelify Sans", var(--font-emoji), cursive',
  },
  {
    key: 'terminal-grid',
    name: 'Terminal Grid',
    description: 'Sharper command-line flavor with mono display text.',
    fontSans: '"Trebuchet MS", "Verdana", var(--font-emoji), sans-serif',
    fontDisplay: '"Courier New", "Lucida Console", monospace',
  },
  {
    key: 'neon-poster',
    name: 'Neon Poster',
    description: 'Bold arcade flyer styling with heavier display text.',
    fontSans: '"Helvetica Neue", "Arial", var(--font-emoji), sans-serif',
    fontDisplay: '"Arial Black", "Impact", sans-serif',
  },
  {
    key: 'retro-lounge',
    name: 'Retro Lounge',
    description: 'Sleeker serif-forward look for a more stylish cabinet.',
    fontSans: '"Gill Sans", "Trebuchet MS", var(--font-emoji), sans-serif',
    fontDisplay: '"Georgia", "Times New Roman", serif',
  },
] as const

export const defaultFontPresetKey = fontPresets[0].key

export const themeFontPresetKeyMap: Record<string, string> = {
  'couples-glow': 'pixel-arcade',
  'kids-spark': 'neon-poster',
  'friends-arcade': 'terminal-grid',
  'family-camp': 'retro-lounge',
  'bubble-blast': 'neon-poster',
  'glitch-carnival': 'terminal-grid',
  'gummy-grid': 'pixel-arcade',
  'midnight-laser': 'terminal-grid',
  'sunset-synth': 'retro-lounge',
}

export interface ThemeAtmosphereParticleConfig {
  id: string
  tone: 'primary' | 'accent' | 'secondary'
  left: number
  top: number
  size: number
  blur: number
  delay: number
  duration: number
  driftX: number
  driftY: number
  opacity: number
}

export interface ThemeAtmosphereVariantConfig {
  meshOpacity: number
  orbOpacity: number
  orbBlurPx: number
  particlesOpacity: number
  patternOpacity: number
  accentOpacity: number
  particleShellColor: string
  particleFadeColor: string
  particleBorderAlpha: string
  particleGlowAlpha: string
  particleGlowBlurRem: number
  particleCoreWhite: string
  particleCoreOpacity: number
  particleCoreScale: number
}

export const themeAtmosphereConfig = {
  // These are the main presets the shared atmosphere component can request.
  // `default` is used for the app shell/dashboard, while `soft` is used where
  // the UI asks for a calmer presentation.
  variants: {
    default: {
      meshOpacity: 0.95,
      orbOpacity: 0.38,
      orbBlurPx: 22,
      particlesOpacity: 1,
      patternOpacity: 0.34,
      accentOpacity: 0.34,
      particleShellColor: '90%',
      particleFadeColor: '52%',
      particleBorderAlpha: '12%',
      particleGlowAlpha: '22%',
      particleGlowBlurRem: 1.95,
      particleCoreWhite: '72%',
      particleCoreOpacity: 0.88,
      particleCoreScale: 0.82,
    },
    soft: {
      meshOpacity: 0.86,
      orbOpacity: 0.32,
      orbBlurPx: 24,
      particlesOpacity: 0.9,
      patternOpacity: 0.3,
      accentOpacity: 0.28,
      particleShellColor: '89%',
      particleFadeColor: '48%',
      particleBorderAlpha: '10%',
      particleGlowAlpha: '19%',
      particleGlowBlurRem: 1.7,
      particleCoreWhite: '74%',
      particleCoreOpacity: 0.84,
      particleCoreScale: 0.82,
    },
  },
  // This overlay is merged on top of the chosen preset whenever the
  // atmosphere sits above real sign-in media so it stays visible but restrained.
  mediaOverlay: {
    meshOpacity: 0.58,
    orbOpacity: 0.21,
    orbBlurPx: 28,
    particlesOpacity: 0.74,
    patternOpacity: 0.2,
    accentOpacity: 0.18,
    particleBorderAlpha: '8%',
    particleGlowAlpha: '15%',
    particleGlowBlurRem: 1.3,
  } satisfies Partial<ThemeAtmosphereVariantConfig>,
  // Increase `particlesOpacity`, `particleGlowAlpha`, and
  // `particleGlowBlurRem` first if you want the effect to read more clearly.
  particles: [
    { id: 'p-1', tone: 'primary', left: 8, top: 18, size: 0.8, blur: 0.4, delay: 0.3, duration: 18, driftX: 1.4, driftY: -2.6, opacity: 0.2 },
    { id: 'p-2', tone: 'accent', left: 18, top: 72, size: 0.65, blur: 0.8, delay: 1.8, duration: 22, driftX: -1.2, driftY: -2.1, opacity: 0.16 },
    { id: 'p-3', tone: 'secondary', left: 24, top: 34, size: 0.5, blur: 0.2, delay: 0.9, duration: 20, driftX: 1.1, driftY: -1.8, opacity: 0.18 },
    { id: 'p-4', tone: 'primary', left: 34, top: 14, size: 0.72, blur: 0.5, delay: 2.4, duration: 24, driftX: -1.5, driftY: -2.4, opacity: 0.15 },
    { id: 'p-5', tone: 'accent', left: 42, top: 62, size: 0.58, blur: 0.4, delay: 3.1, duration: 19, driftX: 0.8, driftY: -1.6, opacity: 0.17 },
    { id: 'p-6', tone: 'secondary', left: 49, top: 28, size: 0.88, blur: 0.7, delay: 1.2, duration: 26, driftX: -1.7, driftY: -2.8, opacity: 0.14 },
    { id: 'p-7', tone: 'primary', left: 58, top: 76, size: 0.52, blur: 0.1, delay: 2.8, duration: 21, driftX: 1.3, driftY: -2, opacity: 0.18 },
    { id: 'p-8', tone: 'accent', left: 66, top: 18, size: 0.78, blur: 0.6, delay: 0.4, duration: 23, driftX: -1.1, driftY: -2.2, opacity: 0.17 },
    { id: 'p-9', tone: 'secondary', left: 74, top: 54, size: 0.62, blur: 0.9, delay: 1.5, duration: 20, driftX: 1, driftY: -1.9, opacity: 0.15 },
    { id: 'p-10', tone: 'primary', left: 82, top: 26, size: 0.48, blur: 0.3, delay: 3.6, duration: 17, driftX: 0.7, driftY: -1.5, opacity: 0.16 },
    { id: 'p-11', tone: 'accent', left: 88, top: 68, size: 0.84, blur: 0.8, delay: 2.1, duration: 25, driftX: -1.4, driftY: -2.7, opacity: 0.14 },
    { id: 'p-12', tone: 'secondary', left: 12, top: 48, size: 0.56, blur: 0.3, delay: 1.1, duration: 18, driftX: 1, driftY: -1.7, opacity: 0.17 },
    { id: 'p-13', tone: 'primary', left: 54, top: 86, size: 0.7, blur: 0.6, delay: 0.7, duration: 24, driftX: -0.9, driftY: -2.1, opacity: 0.13 },
    { id: 'p-14', tone: 'accent', left: 92, top: 42, size: 0.54, blur: 0.4, delay: 2.9, duration: 19, driftX: -0.8, driftY: -1.8, opacity: 0.15 },
    { id: 'p-15', tone: 'secondary', left: 28, top: 84, size: 0.76, blur: 0.5, delay: 1.4, duration: 23, driftX: 1.2, driftY: -2.3, opacity: 0.16 },
    { id: 'p-16', tone: 'primary', left: 38, top: 44, size: 0.6, blur: 0.2, delay: 3.2, duration: 20, driftX: -1, driftY: -1.9, opacity: 0.19 },
    { id: 'p-17', tone: 'accent', left: 62, top: 8, size: 0.66, blur: 0.4, delay: 2.5, duration: 21, driftX: 0.9, driftY: -1.7, opacity: 0.17 },
    { id: 'p-18', tone: 'secondary', left: 78, top: 82, size: 0.58, blur: 0.7, delay: 0.6, duration: 24, driftX: -1.1, driftY: -2.4, opacity: 0.15 },
    { id: 'p-19', tone: 'primary', left: 6, top: 60, size: 0.72, blur: 0.5, delay: 2.2, duration: 22, driftX: 1.4, driftY: -2.2, opacity: 0.18 },
    { id: 'p-20', tone: 'accent', left: 70, top: 38, size: 0.5, blur: 0.1, delay: 1.7, duration: 18, driftX: -0.7, driftY: -1.5, opacity: 0.18 },
  ] satisfies ThemeAtmosphereParticleConfig[],
} as const

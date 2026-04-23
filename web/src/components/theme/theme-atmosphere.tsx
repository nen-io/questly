import type { CSSProperties } from 'react'

import { themeAtmosphereConfig } from './theme-atmosphere.config'

interface ThemeAtmosphereProps {
  themeKey?: string
  className?: string
  intensity?: 'default' | 'soft'
  mediaAware?: boolean
}

type ThemeAtmosphereStyle = CSSProperties & Record<
  '--theme-atmosphere-mesh-opacity'
  | '--theme-atmosphere-orb-opacity'
  | '--theme-atmosphere-orb-blur'
  | '--theme-atmosphere-particles-opacity'
  | '--theme-atmosphere-pattern-opacity'
  | '--theme-atmosphere-accent-opacity'
  | '--theme-atmosphere-particle-shell-color'
  | '--theme-atmosphere-particle-fade-color'
  | '--theme-atmosphere-particle-border-alpha'
  | '--theme-atmosphere-particle-glow-alpha'
  | '--theme-atmosphere-particle-glow-blur'
  | '--theme-atmosphere-particle-core-white'
  | '--theme-atmosphere-particle-core-opacity'
  | '--theme-atmosphere-particle-core-scale',
  string
>

type ThemeAtmosphereParticleStyle = CSSProperties & Record<
  '--theme-particle-drift-x' | '--theme-particle-drift-y' | '--theme-particle-opacity',
  string
>

export function ThemeAtmosphere({
  themeKey = 'default',
  className = '',
  intensity = 'default',
  mediaAware = false,
}: ThemeAtmosphereProps) {
  const resolvedVariant = mediaAware
    ? { ...themeAtmosphereConfig.variants[intensity], ...themeAtmosphereConfig.mediaOverlay }
    : themeAtmosphereConfig.variants[intensity]
  const style: ThemeAtmosphereStyle = {
    '--theme-atmosphere-mesh-opacity': `${resolvedVariant.meshOpacity}`,
    '--theme-atmosphere-orb-opacity': `${resolvedVariant.orbOpacity}`,
    '--theme-atmosphere-orb-blur': `${resolvedVariant.orbBlurPx}px`,
    '--theme-atmosphere-particles-opacity': `${resolvedVariant.particlesOpacity}`,
    '--theme-atmosphere-pattern-opacity': `${resolvedVariant.patternOpacity}`,
    '--theme-atmosphere-accent-opacity': `${resolvedVariant.accentOpacity}`,
    '--theme-atmosphere-particle-shell-color': resolvedVariant.particleShellColor,
    '--theme-atmosphere-particle-fade-color': resolvedVariant.particleFadeColor,
    '--theme-atmosphere-particle-border-alpha': resolvedVariant.particleBorderAlpha,
    '--theme-atmosphere-particle-glow-alpha': resolvedVariant.particleGlowAlpha,
    '--theme-atmosphere-particle-glow-blur': `${resolvedVariant.particleGlowBlurRem}rem`,
    '--theme-atmosphere-particle-core-white': resolvedVariant.particleCoreWhite,
    '--theme-atmosphere-particle-core-opacity': `${resolvedVariant.particleCoreOpacity}`,
    '--theme-atmosphere-particle-core-scale': `${resolvedVariant.particleCoreScale}`,
  }

  return (
    <div
      aria-hidden="true"
      className={`theme-atmosphere ${className}`.trim()}
      data-theme-atmosphere={themeKey}
      style={style}
    >
      <div className="theme-atmosphere__mesh" />
      <div className="theme-atmosphere__orb theme-atmosphere__orb--a" />
      <div className="theme-atmosphere__orb theme-atmosphere__orb--b" />
      <div className="theme-atmosphere__orb theme-atmosphere__orb--c" />
      <div className="theme-atmosphere__particles">
        {themeAtmosphereConfig.particles.map((particle) => {
          const style: ThemeAtmosphereParticleStyle = {
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: `${particle.size}rem`,
            height: `${particle.size}rem`,
            filter: `blur(${particle.blur}px)`,
            animationDelay: `-${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            '--theme-particle-drift-x': `${particle.driftX}rem`,
            '--theme-particle-drift-y': `${particle.driftY}rem`,
            '--theme-particle-opacity': `${particle.opacity}`,
          }

          return (
            <span
              key={particle.id}
              className={`theme-atmosphere__particle theme-atmosphere__particle--${particle.tone}`}
              style={style}
            />
          )
        })}
      </div>
      <div className="theme-atmosphere__pattern" />
      <div className="theme-atmosphere__accent" />
    </div>
  )
}

import { motion } from 'framer-motion'
import { ZoomIn } from 'lucide-react'
import { useState, type CSSProperties } from 'react'

import { LoginExpandableMessage } from './login-expandable-message'
import { useLoginHeroContrast } from '../hooks/use-login-hero-contrast'

export function LoginHeroPanel({
  imageUrl,
  message,
  onOpenZoom,
  platformName,
  preview,
  shouldReduceMotion,
  title,
}: {
  imageUrl: string | null
  message: string
  onOpenZoom: () => void
  platformName: string
  preview: boolean
  shouldReduceMotion: boolean
  title: string
}) {
  const [eyebrowExpanded, setEyebrowExpanded] = useState(false)
  const contrast = useLoginHeroContrast(imageUrl)
  const hasHeroImage = Boolean(imageUrl)
  const heroImageUrl = imageUrl ?? ''
  const useDarkText = contrast === 'black'
  const heroAlt = `${platformName} sign-in spotlight`
  const desktopImageClassName = preview
    ? 'min-h-[21rem] sm:min-h-[26rem] xl:min-h-[36rem]'
    : 'h-[min(42vh,33rem)] sm:h-[min(46vh,36rem)]'
  const heroToneStyle: CSSProperties & Record<`--${string}`, string> = {
    '--login-hero-foreground': hasHeroImage
      ? useDarkText ? 'rgb(17 24 39)' : 'rgb(255 255 255)'
      : 'var(--foreground)',
    '--login-hero-muted': hasHeroImage
      ? useDarkText ? 'rgba(17,24,39,0.84)' : 'rgba(255,255,255,0.9)'
      : 'rgba(59, 31, 48, 0.76)',
    '--login-hero-panel-surface': hasHeroImage
      ? useDarkText ? 'rgba(255,255,255,0.28)' : 'rgba(9,14,24,0.22)'
      : 'rgba(255,255,255,0.52)',
    '--login-hero-panel-border': hasHeroImage
      ? useDarkText ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.24)'
      : 'rgba(255,255,255,0.7)',
    '--login-hero-mobile-overlay-start': hasHeroImage
      ? useDarkText ? 'rgba(255,255,255,0.2)' : 'rgba(6,10,20,0.18)'
      : 'transparent',
    '--login-hero-mobile-overlay-end': hasHeroImage
      ? useDarkText ? 'rgba(255,255,255,0.82)' : 'rgba(6,10,20,0.74)'
      : 'transparent',
  }

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className={`theme-shell-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:p-10 ${preview ? 'h-full' : ''}`}
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
      style={heroToneStyle as CSSProperties}
      transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {hasHeroImage ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center xl:hidden"
          style={{
            backgroundImage: `linear-gradient(180deg,var(--login-hero-mobile-overlay-start) 0%,var(--login-hero-mobile-overlay-end) 100%), url(${heroImageUrl})`,
          }}
        />
      ) : null}
      <div className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.82),transparent_28%),radial-gradient(circle_at_bottom_left,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_34%)] ${hasHeroImage ? 'hidden xl:block' : ''}`} />

      <div className="relative z-10 flex h-full min-h-[21rem] flex-col gap-7 sm:min-h-[24rem] xl:min-h-0">
        <button
          type="button"
          className="theme-shell-pill inline-flex w-fit items-center gap-3 rounded-full px-3 py-2 text-left"
          onBlur={() => setEyebrowExpanded(false)}
          onClick={() => setEyebrowExpanded((current) => !current)}
          onFocus={() => setEyebrowExpanded(true)}
          onMouseEnter={() => setEyebrowExpanded(true)}
          onMouseLeave={() => setEyebrowExpanded(false)}
        >
          <span className="retro-ui text-[0.65rem] uppercase tracking-[0.28em] text-primary">Press Start</span>
          <span className={`theme-shell-soft overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-200 ${eyebrowExpanded ? 'max-w-xs opacity-100' : 'max-w-0 opacity-0'}`}>
            {platformName}
          </span>
        </button>

        <div className="space-y-5">
          <h1 className="max-w-[14ch] text-4xl leading-[0.96] text-[var(--login-hero-foreground)] drop-shadow-[0_10px_24px_rgba(0,0,0,0.16)] sm:text-5xl xl:text-6xl xl:text-foreground xl:drop-shadow-none">
            {title}
          </h1>
          <LoginExpandableMessage
            shouldReduceMotion={shouldReduceMotion}
            text={message}
          />
        </div>

        {hasHeroImage ? (
          <button
            type="button"
            className="theme-shell-card group relative hidden overflow-hidden rounded-[1.8rem] p-3 text-left transition hover:-translate-y-1 xl:block"
            onClick={onOpenZoom}
          >
            <img
              alt={heroAlt}
              className={`w-full rounded-[1.35rem] object-cover ${desktopImageClassName}`}
              loading="lazy"
              src={heroImageUrl}
            />
            <div className="theme-shell-panel pointer-events-none absolute inset-x-6 bottom-6 flex items-center justify-between rounded-[1.25rem] px-4 py-3">
              <div>
                <p className="retro-ui text-[0.65rem] uppercase tracking-[0.26em] text-primary">Spotlight Frame</p>
                <p className="theme-shell-soft mt-1 text-sm">Tap or click to zoom the hero art.</p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                <ZoomIn className="size-4" />
              </span>
            </div>
          </button>
        ) : null}
      </div>
    </motion.section>
  )
}

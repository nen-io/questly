import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Gift, Trophy, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { AttributeIconBadge } from './attribute-icon-badge'
import type { DashboardCelebrationHighlight, DashboardCelebrationKind, DashboardCelebrationScene } from '../utils/celebration'

interface DashboardCelebrationOverlayProps {
  celebration: DashboardCelebrationScene | null
  shouldReduceMotion: boolean
  onDismiss: () => void
}

const paletteByKind: Record<DashboardCelebrationKind, {
  icon: typeof Trophy
  backdrop: string
  spotlight: string
  panelGlow: string
}> = {
  quest_completed: {
    icon: Trophy,
    backdrop: 'linear-gradient(180deg, rgba(45, 16, 29, 0.82) 0%, rgba(23, 18, 40, 0.9) 100%)',
    spotlight: 'rgba(255, 192, 124, 0.34)',
    panelGlow: 'rgba(247, 152, 102, 0.28)',
  },
  reward_purchased: {
    icon: Gift,
    backdrop: 'linear-gradient(180deg, rgba(47, 28, 12, 0.8) 0%, rgba(28, 30, 46, 0.9) 100%)',
    spotlight: 'rgba(253, 216, 116, 0.32)',
    panelGlow: 'rgba(133, 241, 187, 0.2)',
  },
  reward_redeemed: {
    icon: CheckCircle2,
    backdrop: 'linear-gradient(180deg, rgba(14, 40, 55, 0.82) 0%, rgba(17, 24, 39, 0.92) 100%)',
    spotlight: 'rgba(118, 223, 255, 0.32)',
    panelGlow: 'rgba(93, 223, 184, 0.24)',
  },
}

const detailCopyByKind: Record<DashboardCelebrationKind, {
  highlightTitle: string
  highlightDescription: string
}> = {
  quest_completed: {
    highlightTitle: 'Points gained',
    highlightDescription: 'These balances were applied to your account immediately.',
  },
  reward_purchased: {
    highlightTitle: 'Points used',
    highlightDescription: 'These costs were deducted as part of the purchase.',
  },
  reward_redeemed: {
    highlightTitle: 'Reward state',
    highlightDescription: 'Redemption updates the locker state without moving points again.',
  },
}

const ringScales = [0.74, 1.02, 1.28, 1.56]
const beamRotations = [-24, -8, 24, 56]
const panelEntranceDelaySeconds = 0.46

export function DashboardCelebrationOverlay({
  celebration,
  shouldReduceMotion,
  onDismiss,
}: DashboardCelebrationOverlayProps) {
  const celebrationColors = useMemo(
    () => celebration?.paletteColors.length
      ? celebration.paletteColors
      : celebration
        ? [celebration.accentColor]
        : [],
    [celebration],
  )
  const primaryColor = celebrationColors[0] ?? celebration?.accentColor ?? '#f59e0b'
  const secondaryColor = celebrationColors[1] ?? celebrationColors[0] ?? celebration?.accentColor ?? '#f472b6'
  const tertiaryColor = celebrationColors[2] ?? celebrationColors[0] ?? celebration?.accentColor ?? '#60a5fa'
  const getSceneColor = (index: number) => (
    celebrationColors.length > 0
      ? celebrationColors[index % celebrationColors.length]
      : primaryColor
  )
  const celebrationParticleIcons = useMemo(() => {
    if (!celebration) {
      return []
    }

    const iconSet = new Set<string>()

    if (celebration.icon) {
      iconSet.add(celebration.icon)
    }

    celebration.highlights.forEach((highlight) => {
      if (highlight.icon) {
        iconSet.add(highlight.icon)
      }
    })

    return Array.from(iconSet)
  }, [celebration])
  const particles = useMemo(
    () => buildCelebrationParticles(
      celebration?.kind ?? 'quest_completed',
      celebration?.paletteColors ?? [],
      celebrationParticleIcons,
      shouldReduceMotion,
    ),
    [celebration?.kind, celebration?.paletteColors, celebrationParticleIcons, shouldReduceMotion],
  )
  const floatingIcons = useMemo(
    () => buildCelebrationFloatingIcons(
      celebration?.kind ?? 'quest_completed',
      celebration?.paletteColors ?? [],
      celebrationParticleIcons,
      shouldReduceMotion,
    ),
    [celebration?.kind, celebration?.paletteColors, celebrationParticleIcons, shouldReduceMotion],
  )

  useEffect(() => {
    if (!celebration || typeof document === 'undefined') {
      return
    }

    const { body, documentElement } = document
    const scrollY = window.scrollY
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth
    const previousStyles = {
      htmlOverflow: documentElement.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyPaddingRight: body.style.paddingRight,
    }

    // Lock the page in place while the scene is active so background scroll
    // cannot drag the fixed overlay around on touch devices.
    documentElement.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      documentElement.style.overflow = previousStyles.htmlOverflow
      body.style.overflow = previousStyles.bodyOverflow
      body.style.position = previousStyles.bodyPosition
      body.style.top = previousStyles.bodyTop
      body.style.left = previousStyles.bodyLeft
      body.style.right = previousStyles.bodyRight
      body.style.width = previousStyles.bodyWidth
      body.style.paddingRight = previousStyles.bodyPaddingRight
      window.scrollTo(0, scrollY)
    }
  }, [celebration])

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <AnimatePresence mode="wait">
      {celebration ? (
        <motion.div
          key={celebration.id}
          aria-live="polite"
          className="fixed inset-0 z-[120] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          style={{
            background: paletteByKind[celebration.kind].backdrop,
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
            overscrollBehavior: 'none',
          }}
        >
          <div className="absolute inset-0 backdrop-blur-md" />
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(circle at 18% 18%, ${paletteByKind[celebration.kind].spotlight}, transparent 24%),
                radial-gradient(circle at 82% 16%, color-mix(in srgb, ${primaryColor} 36%, white), transparent 22%),
                radial-gradient(circle at 18% 76%, color-mix(in srgb, ${secondaryColor} 28%, white), transparent 24%),
                radial-gradient(circle at 50% 72%, color-mix(in srgb, ${tertiaryColor} 24%, ${paletteByKind[celebration.kind].panelGlow}), transparent 30%)
              `,
            }}
          />

          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <motion.div
              animate={shouldReduceMotion ? { opacity: 0.6, scale: 1 } : {
                opacity: [0, 0.8, 0.48],
                scale: [0.32, 1.04, 1.18],
              }}
              className="absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:h-[24rem] sm:w-[24rem]"
              style={{
                background: `radial-gradient(circle, color-mix(in srgb, ${primaryColor} 54%, ${secondaryColor}) 0%, transparent 72%)`,
              }}
              transition={{
                duration: shouldReduceMotion ? 0 : 1.05,
                ease: [0.18, 1, 0.32, 1],
              }}
            />

            {beamRotations.map((rotation, index) => (
              <motion.div
                key={`${celebration.kind}-beam-${rotation}`}
                animate={shouldReduceMotion ? { opacity: 0.16, scaleY: 1 } : {
                  opacity: [0, 0.16, 0.26, 0.12],
                  scaleY: [0.7, 1, 1.08, 0.96],
                }}
                className="absolute left-1/2 top-1/2 h-[180vmax] w-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                style={{
                  background: `linear-gradient(180deg, transparent 0%, color-mix(in srgb, ${getSceneColor(index)} 50%, white) 52%, transparent 100%)`,
                  rotate: `${rotation}deg`,
                }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 4.4 + index * 0.42,
                  repeat: shouldReduceMotion ? 0 : Infinity,
                  ease: 'easeInOut',
                  delay: shouldReduceMotion ? 0 : 0.16 + index * 0.08,
                }}
              />
            ))}

            {ringScales.map((scale, index) => (
              <motion.div
                key={`${celebration.kind}-ring-${scale}`}
                animate={shouldReduceMotion ? { opacity: 0.34, scale } : {
                  opacity: [0, 0.18, 0.4, 0.18],
                  scale: [scale * 0.7, scale * 0.94, scale, scale * 1.06],
                }}
                className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full border sm:h-[34rem] sm:w-[34rem]"
                style={{
                  borderColor: `color-mix(in srgb, ${getSceneColor(index)} ${24 - index * 3}%, white)`,
                }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 4.8 + index * 0.55,
                  repeat: shouldReduceMotion ? 0 : Infinity,
                  ease: 'easeInOut',
                  delay: shouldReduceMotion ? 0 : 0.08 + index * 0.12,
                }}
              />
            ))}

            {floatingIcons.map((item) => (
              <motion.span
                key={item.id}
                animate={shouldReduceMotion ? { opacity: item.opacity, x: 0, y: 0, rotate: item.rotate } : {
                  opacity: [item.opacity * 0.78, item.opacity, item.opacity * 0.82],
                  x: [0, item.driftX, item.driftX * -0.35, 0],
                  y: [0, item.driftY, item.driftY * -0.2, 0],
                  rotate: [item.rotate, item.rotate + item.rotateDrift, item.rotate - item.rotateDrift * 0.5, item.rotate],
                  scale: [0.96, 1.04, 0.98, 1],
                }}
                className="emoji-glyph absolute flex items-center justify-center"
                style={{
                  left: item.left,
                  top: item.top,
                  width: item.size,
                  height: item.size,
                  fontSize: `${item.size}px`,
                  color: `color-mix(in srgb, ${item.color} 82%, white)`,
                  textShadow: `0 0 24px color-mix(in srgb, ${item.color} 28%, transparent)`,
                  filter: `drop-shadow(0 0 18px color-mix(in srgb, ${item.color} 18%, transparent))`,
                }}
                transition={{
                  duration: shouldReduceMotion ? 0 : item.duration,
                  repeat: shouldReduceMotion ? 0 : Infinity,
                  ease: 'easeInOut',
                  delay: shouldReduceMotion ? 0 : item.delay,
                }}
              >
                {item.icon}
              </motion.span>
            ))}

            {particles.map((particle) => (
              <motion.span
                key={particle.id}
                animate={shouldReduceMotion ? { opacity: 0.45, scale: 1 } : {
                  opacity: [0, particle.peakOpacity, 0],
                  scale: [0.18, 1, 0.72],
                  x: [0, particle.driftX],
                  y: [0, particle.driftY],
                  rotate: [0, particle.rotate],
                }}
                className={cn(
                  'absolute flex items-center justify-center rounded-full',
                  particle.kind === 'icon' ? 'emoji-glyph' : '',
                )}
                style={{
                  left: particle.left,
                  top: particle.top,
                  width: particle.size,
                  height: particle.size,
                  background: particle.kind === 'glow'
                    ? `radial-gradient(circle, color-mix(in srgb, ${particle.color} 88%, white) 0%, transparent 72%)`
                    : `radial-gradient(circle, color-mix(in srgb, ${particle.color} 22%, white) 0%, transparent 74%)`,
                  boxShadow: particle.kind === 'glow'
                    ? `0 0 28px color-mix(in srgb, ${particle.color} 44%, transparent)`
                    : `0 0 22px color-mix(in srgb, ${particle.color} 16%, transparent)`,
                  filter: `blur(${particle.blur}px)`,
                  color: particle.kind === 'icon'
                    ? `color-mix(in srgb, ${particle.color} 78%, white)`
                    : undefined,
                  fontSize: particle.kind === 'icon' ? `${particle.size}px` : undefined,
                  textShadow: particle.kind === 'icon'
                    ? `0 0 22px color-mix(in srgb, ${particle.color} 46%, transparent)`
                    : undefined,
                }}
                transition={{
                  duration: shouldReduceMotion ? 0 : particle.duration,
                  repeat: shouldReduceMotion ? 0 : Infinity,
                  ease: 'easeOut',
                  delay: shouldReduceMotion ? 0 : 0.18 + particle.delay,
                }}
              >
                {particle.kind === 'icon' ? particle.icon : null}
              </motion.span>
            ))}
          </div>

          <div className="relative flex h-full items-center justify-center py-6 sm:py-8">
            <motion.section
              className="relative w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/15 bg-[rgba(255,252,248,0.92)] text-foreground shadow-[0_32px_140px_rgba(7,10,18,0.34)] backdrop-blur-xl"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.84, y: 42, filter: 'blur(16px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 12 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.74,
                delay: shouldReduceMotion ? 0 : panelEntranceDelaySeconds,
                ease: [0.16, 1, 0.3, 1],
              }}
              onClick={(event) => event.stopPropagation()}
              role="status"
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `
                    linear-gradient(135deg, color-mix(in srgb, ${primaryColor} 12%, white) 0%, rgba(255, 255, 255, 0) 44%),
                    radial-gradient(circle at 86% 20%, color-mix(in srgb, ${secondaryColor} 18%, white), transparent 28%),
                    radial-gradient(circle at 12% 92%, color-mix(in srgb, ${tertiaryColor} 14%, white), transparent 26%)
                  `,
                }}
              />

              <motion.div
                animate={shouldReduceMotion ? { opacity: 0.62 } : { opacity: [0.18, 0.5, 0.18] }}
                className="absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl"
                style={{
                  background: `radial-gradient(circle, color-mix(in srgb, ${secondaryColor} 58%, white), transparent 72%)`,
                }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 4.2,
                  repeat: shouldReduceMotion ? 0 : Infinity,
                  ease: 'easeInOut',
                  delay: shouldReduceMotion ? 0 : 0.22,
                }}
              />

              <div
                className="relative overflow-y-auto overflow-x-hidden"
                style={{
                  maxHeight: 'calc(100dvh - max(2rem, env(safe-area-inset-top)) - max(2rem, env(safe-area-inset-bottom)))',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                }}
              >
                <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
                  <div className="space-y-5 sm:space-y-6">
                  <div className="flex items-start justify-between gap-3">
                    <motion.div
                      animate={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.32,
                        delay: shouldReduceMotion ? 0 : panelEntranceDelaySeconds + 0.1,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <Badge
                        className="rounded-full border border-white/55 bg-white/88 px-3 py-1 text-[11px] text-foreground shadow-sm"
                        style={{
                          boxShadow: `0 0 0 1px color-mix(in srgb, ${primaryColor} 20%, transparent)`,
                        }}
                      >
                        {celebration.eyebrow}
                      </Badge>
                    </motion.div>
                    <Button
                      aria-label="Close celebration"
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                      onClick={onDismiss}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <motion.div
                      animate={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
                      className="relative self-start"
                      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.72 }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.6,
                        delay: shouldReduceMotion ? 0 : panelEntranceDelaySeconds + 0.18,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <motion.div
                        animate={shouldReduceMotion ? { opacity: 0.3, scale: 1 } : {
                          opacity: [0.14, 0.32, 0.14],
                          scale: [0.92, 1.08, 0.96],
                        }}
                        className="absolute -inset-5 rounded-full border blur-sm"
                        style={{
                          borderColor: `color-mix(in srgb, ${primaryColor} 36%, white)`,
                        }}
                        transition={{
                          duration: shouldReduceMotion ? 0 : 3.6,
                          repeat: shouldReduceMotion ? 0 : Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                      <motion.div
                        animate={shouldReduceMotion ? { scale: 1 } : {
                          scale: [1, 1.05, 1],
                          rotate: [-3, 3, -3],
                        }}
                        className="relative flex size-28 items-center justify-center rounded-[2rem] border border-white/65 bg-white/82 shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:size-32"
                        style={{
                          boxShadow: `0 0 0 1px color-mix(in srgb, ${primaryColor} 26%, transparent), 0 24px 70px rgba(15,23,42,0.18)`,
                        }}
                        transition={{
                          duration: shouldReduceMotion ? 0 : 2.8,
                          repeat: shouldReduceMotion ? 0 : Infinity,
                          ease: 'easeInOut',
                        }}
                      >
                        <div
                          className="absolute inset-3 rounded-[1.4rem]"
                          style={{
                            background: `linear-gradient(145deg, color-mix(in srgb, ${primaryColor} 22%, white), color-mix(in srgb, ${secondaryColor} 14%, white))`,
                          }}
                        />
                        <span className="emoji-glyph relative text-5xl sm:text-6xl">{celebration.icon}</span>
                      </motion.div>
                    </motion.div>

                    <motion.div
                      animate={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                      className="min-w-0 space-y-3"
                      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.42,
                        delay: shouldReduceMotion ? 0 : panelEntranceDelaySeconds + 0.24,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <h2 className="text-3xl leading-tight sm:text-5xl">
                        {celebration.title}
                      </h2>
                      <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                        {celebration.description}
                      </p>
                    </motion.div>
                  </div>

                  <motion.div
                    animate={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                    className="rounded-[1.5rem] border border-border/60 bg-white/72 p-4 shadow-sm backdrop-blur"
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.34,
                      delay: shouldReduceMotion ? 0 : panelEntranceDelaySeconds + 0.3,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      What changed
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {celebration.footnote}
                    </p>
                  </motion.div>
                  </div>

                  <div className="flex flex-col gap-4 lg:justify-end">
                    <motion.div
                      animate={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                      className="rounded-[1.5rem] border border-border/60 bg-white/72 p-4 shadow-sm backdrop-blur sm:p-5"
                      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.34,
                        delay: shouldReduceMotion ? 0 : panelEntranceDelaySeconds + 0.26,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        {detailCopyByKind[celebration.kind].highlightTitle}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {detailCopyByKind[celebration.kind].highlightDescription}
                      </p>
                      <div className="mt-4 grid gap-3">
                        {celebration.highlights.map((highlight, index) => (
                          <PointChangeCard
                            key={highlight.id}
                            highlight={highlight}
                            index={index}
                            accentColor={primaryColor}
                            shouldReduceMotion={shouldReduceMotion}
                          />
                        ))}
                      </div>
                    </motion.div>

                    {celebration.stats.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                        {celebration.stats.map((stat, index) => (
                          <motion.div
                            key={stat.id}
                            animate={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                            className="rounded-[1.5rem] border border-border/60 bg-white/72 p-4 shadow-sm backdrop-blur"
                            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                            transition={{
                              duration: shouldReduceMotion ? 0 : 0.28,
                              delay: shouldReduceMotion ? 0 : panelEntranceDelaySeconds + 0.34 + index * 0.06,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                              {stat.label}
                            </p>
                            <p className="mt-2 text-2xl leading-none font-semibold">
                              {stat.value}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    ) : null}

                    <motion.div
                      animate={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                      className="rounded-[1.5rem] border border-border/60 bg-foreground/[0.03] p-4 sm:p-5"
                      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.28,
                        delay: shouldReduceMotion ? 0 : panelEntranceDelaySeconds + 0.44,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Continue
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {shouldReduceMotion
                          ? 'Dismiss when you are ready.'
                          : 'Tap outside the card, press Esc, or use the button when you are ready to continue.'}
                      </p>
                      <Button
                        className="mt-4 w-full"
                        style={{
                          background: `linear-gradient(135deg, color-mix(in srgb, ${primaryColor} 76%, var(--primary)) 0%, color-mix(in srgb, ${secondaryColor} 62%, var(--primary)) 100%)`,
                        }}
                        type="button"
                        onClick={onDismiss}
                      >
                        Keep going
                        <ArrowRight className="size-4" />
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.section>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

function PointChangeCard({
  highlight,
  index,
  accentColor,
  shouldReduceMotion,
}: {
  highlight: DashboardCelebrationHighlight
  index: number
  accentColor: string
  shouldReduceMotion: boolean
}) {
  const toneLabel = highlight.tone === 'positive'
    ? 'Gained'
    : highlight.tone === 'negative'
      ? 'Used'
      : 'Updated'

  return (
    <motion.div
      animate={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
      className={cn(
        'rounded-[1.35rem] border px-4 py-3 shadow-sm',
        highlight.tone === 'negative' ? 'bg-[rgba(255,244,240,0.92)]' : 'bg-white/86',
      )}
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      style={{
        borderColor: `color-mix(in srgb, ${highlight.color || accentColor} 26%, white)`,
        boxShadow: `0 0 0 1px color-mix(in srgb, ${highlight.color || accentColor} 12%, transparent)`,
      }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
        delay: shouldReduceMotion ? 0 : panelEntranceDelaySeconds + 0.3 + index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="flex items-center gap-3">
        <AttributeIconBadge color={highlight.color || accentColor} icon={highlight.icon} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {highlight.label}
          </p>
          <p
            className="retro-numeric mt-1 text-xl font-semibold"
            style={{
              color: `color-mix(in srgb, ${highlight.color || accentColor} 78%, rgb(30 41 59))`,
            }}
          >
            {highlight.value}
          </p>
        </div>
        <Badge
          className="rounded-full border border-white/60 bg-white/82 px-2.5 py-1 text-[10px] text-foreground shadow-sm"
          style={{
            boxShadow: `0 0 0 1px color-mix(in srgb, ${highlight.color || accentColor} 14%, transparent)`,
          }}
        >
          {toneLabel}
        </Badge>
      </div>
    </motion.div>
  )
}

interface CelebrationParticle {
  id: string
  kind: 'glow' | 'icon'
  left: string
  top: string
  size: number
  blur: number
  delay: number
  duration: number
  driftX: number
  driftY: number
  rotate: number
  peakOpacity: number
  color: string
  icon: string | null
}

interface CelebrationFloatingIcon {
  id: string
  left: string
  top: string
  size: number
  delay: number
  duration: number
  driftX: number
  driftY: number
  rotate: number
  rotateDrift: number
  opacity: number
  color: string
  icon: string
}

function buildCelebrationParticles(
  kind: DashboardCelebrationKind,
  colors: string[],
  icons: string[],
  shouldReduceMotion: boolean,
): CelebrationParticle[] {
  const particleCount = shouldReduceMotion ? 14 : 42
  const kindOffset = kind === 'quest_completed' ? 0 : kind === 'reward_purchased' ? 17 : 31
  const fallbackColors = kind === 'quest_completed'
    ? ['#ffd27f', '#ff8da1']
    : kind === 'reward_purchased'
      ? ['#ffe27a', '#7de6bb']
      : ['#8fd8ff', '#72e8be']
  const palette = colors.length > 0 ? colors : fallbackColors

  return Array.from({ length: particleCount }, (_, index) => {
    const seed = index + 1 + kindOffset
    const left = 4 + ((seed * 13) % 92)
    const top = 6 + ((seed * 17) % 86)
    const particleKind: CelebrationParticle['kind'] = icons.length > 0 && seed % 3 === 0 ? 'icon' : 'glow'

    return {
      id: `${kind}-${seed}`,
      kind: particleKind,
      left: `${left}%`,
      top: `${top}%`,
      size: particleKind === 'icon'
        ? 18 + ((seed * 5) % 14)
        : 4 + ((seed * 7) % 10),
      blur: particleKind === 'icon'
        ? 0
        : seed % 4 === 0 ? 1.4 : 0.3,
      delay: (seed % 9) * 0.12,
      duration: 2.8 + ((seed * 3) % 6) * 0.34,
      driftX: (seed % 2 === 0 ? 1 : -1) * (18 + ((seed * 5) % 34)),
      driftY: -(24 + ((seed * 9) % 54)),
      rotate: 120 + ((seed * 11) % 240),
      peakOpacity: particleKind === 'icon'
        ? 0.28 + ((seed % 3) * 0.07)
        : 0.58 + ((seed % 4) * 0.08),
      color: palette[index % palette.length],
      icon: particleKind === 'icon' ? icons[index % icons.length] : null,
    }
  })
}

function buildCelebrationFloatingIcons(
  kind: DashboardCelebrationKind,
  colors: string[],
  icons: string[],
  shouldReduceMotion: boolean,
): CelebrationFloatingIcon[] {
  if (icons.length === 0) {
    return []
  }

  const iconCount = shouldReduceMotion ? 6 : 12
  const kindOffset = kind === 'quest_completed' ? 5 : kind === 'reward_purchased' ? 19 : 37
  const fallbackColors = kind === 'quest_completed'
    ? ['#ffd27f', '#ff8da1']
    : kind === 'reward_purchased'
      ? ['#ffe27a', '#7de6bb']
      : ['#8fd8ff', '#72e8be']
  const palette = colors.length > 0 ? colors : fallbackColors
  const edgeLefts = [6, 14, 20, 76, 84, 90, 10, 82, 16, 74, 24, 86]
  const edgeTops = [10, 22, 34, 14, 28, 42, 72, 68, 84, 80, 56, 60]

  return Array.from({ length: iconCount }, (_, index) => {
    const seed = index + 1 + kindOffset
    const baseLeft = edgeLefts[index % edgeLefts.length]
    const baseTop = edgeTops[index % edgeTops.length]

    return {
      id: `${kind}-float-${seed}`,
      left: `${baseLeft + ((seed * 3) % 6) - 3}%`,
      top: `${baseTop + ((seed * 5) % 8) - 4}%`,
      size: 22 + ((seed * 7) % 14),
      delay: (seed % 7) * 0.22,
      duration: 7.2 + ((seed * 3) % 5) * 0.8,
      driftX: (seed % 2 === 0 ? 1 : -1) * (8 + ((seed * 2) % 10)),
      driftY: (seed % 3 === 0 ? 1 : -1) * (10 + ((seed * 4) % 12)),
      rotate: ((seed * 9) % 24) - 12,
      rotateDrift: 5 + ((seed * 3) % 6),
      opacity: 0.18 + ((seed % 4) * 0.04),
      color: palette[index % palette.length],
      icon: icons[index % icons.length],
    }
  })
}

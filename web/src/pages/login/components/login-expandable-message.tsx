import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const loginMessagePreviewWordLimit = 500
const wordTokenPattern = /\S+\s*/g

function splitMessageByWordLimit(text: string) {
  // Keep the original whitespace chunks so the expanded copy reads the same after the preview boundary.
  const tokens = text.match(wordTokenPattern) ?? []
  if (tokens.length <= loginMessagePreviewWordLimit) {
    return {
      hasOverflow: false,
      previewText: text,
      overflowText: '',
    }
  }

  return {
    hasOverflow: true,
    previewText: tokens.slice(0, loginMessagePreviewWordLimit).join(''),
    overflowText: tokens.slice(loginMessagePreviewWordLimit).join(''),
  }
}

export function LoginExpandableMessage({
  text,
  shouldReduceMotion,
}: {
  text: string
  shouldReduceMotion: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const { hasOverflow, previewText, overflowText } = useMemo(() => splitMessageByWordLimit(text), [text])

  return (
    <div className="space-y-4 rounded-[1.5rem] border border-[color:var(--login-hero-panel-border)] bg-[color:var(--login-hero-panel-surface)] p-4 shadow-[0_18px_50px_var(--overlayShadow)] backdrop-blur-sm sm:p-5 xl:border-[color:var(--overlayBorder)] xl:bg-[color:var(--overlaySurfaceSoft)]">
      <div className="max-h-[19rem] overflow-y-auto pr-1 sm:max-h-[22rem] sm:pr-2">
        <p className="whitespace-pre-line text-base leading-7 text-[var(--login-hero-muted)] sm:text-lg sm:leading-8 xl:text-[color:var(--overlayMuted)]">
          {previewText}
          <AnimatePresence initial={false}>
            {expanded && hasOverflow ? (
              <motion.span
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -8 }}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                {overflowText}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </p>
      </div>

      {hasOverflow ? (
        <Button
          className={cn(
            'h-auto rounded-full px-0 py-0 text-sm tracking-[0.1em] text-[var(--login-hero-foreground)] shadow-none hover:bg-transparent hover:text-[var(--login-hero-foreground)] xl:text-primary xl:hover:text-primary',
            expanded ? 'opacity-80' : '',
          )}
          type="button"
          variant="ghost"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? 'Show less' : 'Load more'}
        </Button>
      ) : null}
    </div>
  )
}

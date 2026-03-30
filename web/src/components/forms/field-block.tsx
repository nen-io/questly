import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CircleHelp } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FieldBlockProps {
  label: string
  htmlFor?: string
  description?: string
  tooltip?: string
  error?: string
  className?: string
  children: ReactNode
}

export function FieldBlock({ label, htmlFor, description, tooltip, error, className, children }: FieldBlockProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {tooltip ? <FieldTooltip content={tooltip} /> : null}
      </div>
      {children}
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

function FieldTooltip({ content }: { content: string }) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }

      const maxWidth = 256
      const viewportPadding = 12
      const left = Math.min(
        Math.max(rect.left + rect.width / 2 - maxWidth / 2, viewportPadding),
        window.innerWidth - maxWidth - viewportPadding,
      )

      setPosition({
        left,
        top: rect.bottom + 10,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  return (
    <span className="inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-label={content}
        aria-expanded={open}
        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onBlur={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <CircleHelp className="size-3.5" />
      </button>
      {open && position
        ? createPortal(
          <span
            className="pointer-events-none fixed z-[90] w-64 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs leading-5 text-muted-foreground shadow-lg"
            style={{ left: position.left, top: position.top }}
          >
            {content}
          </span>,
          document.body,
        )
        : null}
    </span>
  )
}

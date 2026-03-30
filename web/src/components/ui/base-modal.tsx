import * as React from 'react'

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const sizeClasses = {
  sm: 'w-[min(calc(100vw-1rem),32rem)] sm:w-[min(calc(100vw-2rem),36rem)]',
  md: 'w-[min(calc(100vw-1rem),40rem)] sm:w-[min(calc(100vw-2rem),44rem)]',
  lg: 'w-[min(calc(100vw-1rem),56rem)] sm:w-[min(calc(100vw-2rem),60rem)]',
  editor: 'w-[min(calc(100vw-1rem),52rem)] sm:w-[min(calc(100vw-1.5rem),64rem)] lg:w-[min(calc(100vw-3rem),86rem)] xl:w-[min(calc(100vw-4rem),98rem)]',
  xl: 'w-[min(calc(100vw-1rem),68rem)] sm:w-[min(calc(100vw-2rem),76rem)] xl:w-[min(calc(100vw-3rem),88rem)]',
} as const

const sectionSpacingClasses = {
  header: {
    default: 'gap-3 px-6 py-6 pr-14 text-left sm:px-8 sm:pr-16',
    compact: 'gap-3 px-4 pb-4 pt-6 pr-14 text-left sm:px-6 sm:pr-16',
    none: 'text-left',
  },
  body: {
    default: 'px-6 py-6 sm:px-8 sm:py-7',
    compact: 'px-4 py-4 sm:px-6 sm:py-5',
    none: '',
  },
  footer: {
    default: 'px-6 py-5 sm:px-8',
    compact: 'px-4 py-4 sm:px-6',
    none: '',
  },
} as const

export type BaseModalSize = keyof typeof sizeClasses
type BaseModalSectionSpacing = keyof typeof sectionSpacingClasses.header

interface BaseModalContentProps extends React.ComponentProps<typeof DialogContent> {
  size?: BaseModalSize
}

export const BaseModalContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  BaseModalContentProps
>(function BaseModalContent(
  {
    className,
    children,
    size = 'md',
    onOpenAutoFocus,
    ...props
  },
  forwardedRef,
) {
  const localRef = React.useRef<React.ElementRef<typeof DialogContent> | null>(null)

  const handleRef = React.useCallback((node: React.ElementRef<typeof DialogContent> | null) => {
    localRef.current = node

    if (typeof forwardedRef === 'function') {
      forwardedRef(node)
      return
    }

    if (forwardedRef) {
      forwardedRef.current = node
    }
  }, [forwardedRef])

  return (
    <DialogContent
      ref={handleRef}
      className={cn(
        'flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-[1.9rem] border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(255,255,255,0.9))] p-0 shadow-[0_28px_90px_rgba(47,31,39,0.22)] sm:max-h-[calc(100dvh-2rem)]',
        'data-[state=closed]:slide-out-to-bottom-4 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'data-[state=open]:slide-in-from-bottom-4 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        sizeClasses[size],
        className,
      )}
      onOpenAutoFocus={(event) => {
        onOpenAutoFocus?.(event)

        if (event.defaultPrevented) {
          return
        }

        // Keep focus on the dialog shell so the first tooltip trigger or form control
        // does not receive autofocus when the modal opens.
        event.preventDefault()
        window.requestAnimationFrame(() => {
          localRef.current?.focus()
        })
      }}
      {...props}
    >
      {children}
    </DialogContent>
  )
})

interface BaseModalHeaderProps extends Omit<React.ComponentProps<typeof DialogHeader>, 'title'> {
  description?: React.ReactNode
  descriptionClassName?: string
  divider?: boolean
  spacing?: BaseModalSectionSpacing
  title?: React.ReactNode
  titleClassName?: string
}

// Keep spacing presets centralized so every modal shares the same chrome and only
// opts into different density or width when the content actually needs it.
export function BaseModalHeader({
  children,
  className,
  description,
  descriptionClassName,
  divider = true,
  spacing = 'default',
  title,
  titleClassName,
  ...props
}: BaseModalHeaderProps) {
  return (
    <DialogHeader
      className={cn(
        'shrink-0',
        divider ? 'border-b border-border/60' : null,
        sectionSpacingClasses.header[spacing],
        className,
      )}
      {...props}
    >
      {title ? <DialogTitle className={cn('leading-tight', titleClassName)}>{title}</DialogTitle> : null}
      {description ? (
        <DialogDescription className={cn('leading-6', descriptionClassName)}>
          {description}
        </DialogDescription>
      ) : null}
      {children}
    </DialogHeader>
  )
}

interface BaseModalBodyProps extends React.ComponentProps<'div'> {
  scrollable?: boolean
  spacing?: BaseModalSectionSpacing
}

export function BaseModalBody({
  className,
  scrollable = false,
  spacing = 'default',
  ...props
}: BaseModalBodyProps) {
  return (
    <div
      className={cn(
        'min-h-0 flex-1',
        scrollable ? 'overflow-y-auto overscroll-contain' : null,
        sectionSpacingClasses.body[spacing],
        className,
      )}
      {...props}
    />
  )
}

interface BaseModalFooterProps extends React.ComponentProps<'div'> {
  divider?: boolean
  spacing?: BaseModalSectionSpacing
}

export function BaseModalFooter({
  className,
  divider = true,
  spacing = 'default',
  ...props
}: BaseModalFooterProps) {
  return (
    <div
      className={cn(
        'shrink-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        divider ? 'border-t border-border/60 bg-background' : null,
        sectionSpacingClasses.footer[spacing],
        className,
      )}
      {...props}
    />
  )
}

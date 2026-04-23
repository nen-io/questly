import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, LogOut, Settings2 } from 'lucide-react'
import type { RefreshableAssetRef } from '@/types/app'

import { AvatarCircle } from './avatar-circle'

export function DashboardAccountMenu({
  avatarUrl,
  avatarAsset = null,
  displayName,
  role,
  shouldReduceMotion,
  isLoggingOut,
  onOpenSettings,
  onLogout,
}: {
  avatarUrl: string | null
  avatarAsset?: RefreshableAssetRef | null
  displayName: string
  role: 'admin' | 'player'
  shouldReduceMotion: boolean
  isLoggingOut: boolean
  onOpenSettings: () => void
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const settingsLabel = role === 'player' ? 'Player settings' : 'Account settings'

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div ref={menuRef} className="relative">
      <motion.button
        type="button"
        className="theme-shell-pill group flex items-center gap-3 rounded-full px-3 py-2 text-left transition"
        whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.01 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
        onClick={() => setOpen((current) => !current)}
      >
        <AvatarCircle avatarAsset={avatarAsset} avatarUrl={avatarUrl} name={displayName} sizeClassName="size-10" />
        <div className="min-w-0">
          <p className={`theme-shell-muted text-[0.68rem] uppercase tracking-[0.22em] transition ${open ? '!text-primary' : 'group-hover:text-[color:var(--overlayForeground)]'}`}>
            {role === 'player' ? 'Player deck' : 'Admin deck'}
          </p>
          <p className="max-w-[10rem] truncate text-sm font-semibold text-foreground">{displayName}</p>
        </div>
        <ChevronDown className={`theme-shell-muted size-4 transition ${open ? 'rotate-180 !text-[color:var(--overlayForeground)]' : 'group-hover:text-[color:var(--overlayForeground)]'}`} />
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="theme-shell-panel absolute right-0 top-full z-20 mt-3 w-64 rounded-[1.35rem] p-2"
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -6, scale: 0.98 }}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              className="flex w-full items-start gap-3 rounded-[1rem] px-3 py-3 text-left transition hover:bg-primary/8"
              type="button"
              onClick={() => {
                setOpen(false)
                onOpenSettings()
              }}
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Settings2 className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{settingsLabel}</span>
                <span className="theme-shell-muted block text-xs leading-5">Email, notifications, and account controls.</span>
              </span>
            </button>
            <button
              className="flex w-full items-start gap-3 rounded-[1rem] px-3 py-3 text-left transition hover:bg-primary/8 disabled:opacity-60"
              disabled={isLoggingOut}
              type="button"
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
            >
              <span className="theme-shell-icon mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full">
                <LogOut className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
                <span className="theme-shell-muted block text-xs leading-5">Leave the cabinet and return to sign-in.</span>
              </span>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

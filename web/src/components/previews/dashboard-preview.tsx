import { useState } from 'react'
import { ChevronDown, Crown, LayoutDashboard, LogOut, Settings2, Shield, Sparkles, Trophy } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { getThemeStyle } from '@/lib/theme'
import type { AdminBootstrap } from '@/types/app'
import { resolveFontPreset } from '@shared/font-presets'
import { ThemeAtmosphere } from '@/components/theme/theme-atmosphere'

interface DashboardPreviewValues {
  platformName: string
  themePresetKey: string
  content: {
    fontPresetKey: string
    dashboardTitle: string
    dashboardMessage: string
  }
}

interface DashboardPreviewProps {
  bootstrap: AdminBootstrap
  values: DashboardPreviewValues
}

const previewStats = [
  { label: 'Active quests', value: '6', detail: 'Live challenge queue', icon: LayoutDashboard },
  { label: 'Leaderboard lead', value: '420', detail: 'Points at the top', icon: Crown },
  { label: 'Rewards ready', value: '8', detail: 'Redeemable unlocks', icon: Sparkles },
  { label: 'Streak streak', value: '14', detail: 'Current hot run', icon: Trophy },
] as const

export function DashboardPreview({ bootstrap, values }: DashboardPreviewProps) {
  const resolvedContent = {
    ...bootstrap.settings.content,
    ...(values.content ?? {}),
  }
  const previewTheme = bootstrap.themes.find((theme) => theme.key === values.themePresetKey) ?? bootstrap.settings.theme
  const fontPreset = resolveFontPreset(resolvedContent.fontPresetKey)
  const previewTokens = {
    ...previewTheme.tokens,
    fontSans: fontPreset.fontSans,
    fontDisplay: fontPreset.fontDisplay,
  }

  return (
    <div
      className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-background shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
      style={getThemeStyle(previewTokens)}
    >
      <div className="relative isolate min-h-[42rem] overflow-hidden bg-[var(--surface)] px-4 py-4 text-foreground sm:px-6 sm:py-6">
        <ThemeAtmosphere themeKey={previewTheme.key} />
        <div className="relative mx-auto max-w-6xl space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(140deg,var(--hero-from),var(--hero-via),var(--hero-to))] p-5 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="flex justify-end">
              <PreviewAccountMenu />
            </div>
            <div className="mt-5 flex flex-col gap-6">
              <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-full bg-white/70 px-4 py-1 text-sm text-foreground shadow-sm">
                    <Shield className="mr-2 inline size-3.5" />
                    Admin mode
                  </Badge>
                  <Badge className="rounded-full bg-white/70 px-4 py-1 text-sm text-foreground shadow-sm">
                    3 unread notifications
                  </Badge>
                  <Badge className="rounded-full bg-white/70 px-4 py-1 text-sm text-foreground shadow-sm">
                    <Crown className="mr-2 inline size-3.5" />
                    Leaderboard live
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    {values.platformName}
                  </p>
                  <h2 className="text-3xl leading-tight sm:text-5xl">
                    {resolvedContent.dashboardTitle}
                  </h2>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                    {resolvedContent.dashboardMessage}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {previewStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.5rem] border border-white/60 bg-white/70 p-4 backdrop-blur"
                >
                  <item.icon className="mb-3 size-5 text-primary" />
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-3xl">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function PreviewAccountMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        className="group flex items-center gap-3 rounded-full border border-white/70 bg-white/72 px-3 py-2 text-left shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/84"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
          A
        </div>
        <div className="min-w-0">
          <p className={`text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground transition ${open ? 'text-primary' : 'group-hover:text-foreground/78'}`}>Admin deck</p>
          <p className="max-w-[10rem] truncate text-sm font-semibold text-foreground">Admin Preview</p>
        </div>
        <ChevronDown className={`size-4 text-muted-foreground transition ${open ? 'rotate-180 text-foreground' : 'group-hover:text-foreground'}`} />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-3 w-64 rounded-[1.35rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0.82))] p-2 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur">
          <button className="flex w-full items-start gap-3 rounded-[1rem] px-3 py-3 text-left transition hover:bg-primary/8" disabled type="button">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Settings2 className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">Player settings</span>
              <span className="block text-xs leading-5 text-muted-foreground">Email, notifications, and account controls.</span>
            </span>
          </button>
          <button className="flex w-full items-start gap-3 rounded-[1rem] px-3 py-3 text-left transition hover:bg-primary/8" disabled type="button">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/6 text-foreground">
              <LogOut className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">Log out</span>
              <span className="block text-xs leading-5 text-muted-foreground">Leave the cabinet and return to sign-in.</span>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  )
}

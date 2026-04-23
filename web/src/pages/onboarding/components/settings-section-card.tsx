import type { ReactNode } from 'react'

export function SettingsSectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="theme-shell-card rounded-[1.6rem] p-5 sm:p-6">
      <div className="max-w-3xl space-y-2">
        <p className="retro-ui text-xs uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
        <h3 className="text-2xl leading-tight text-foreground sm:text-3xl">{title}</h3>
        <p className="theme-shell-muted text-sm leading-7 sm:text-base">{description}</p>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

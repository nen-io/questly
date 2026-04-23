import type { ReactNode } from 'react'

export function StepPanel({
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
    <section className="theme-shell-panel rounded-[2rem] p-6 sm:p-8">
      <div className="max-w-3xl space-y-3">
        <p className="retro-ui text-xs uppercase tracking-[0.28em] text-primary">{eyebrow}</p>
        <h2 className="text-4xl leading-tight text-foreground sm:text-5xl">{title}</h2>
        <p className="theme-shell-muted text-base leading-7 sm:text-lg">{description}</p>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  )
}

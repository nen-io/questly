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
    <section className="rounded-[2rem] border border-white/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(255,255,255,0.76))] p-6 shadow-[0_20px_60px_rgba(83,31,52,0.12),0_36px_100px_rgba(83,31,52,0.10)] backdrop-blur sm:p-8">
      <div className="max-w-3xl space-y-3">
        <p className="retro-ui text-xs uppercase tracking-[0.28em] text-primary">{eyebrow}</p>
        <h2 className="text-4xl leading-tight text-foreground sm:text-5xl">{title}</h2>
        <p className="text-base leading-7 text-foreground/74 sm:text-lg">{description}</p>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  )
}

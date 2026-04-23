import { Sparkles, Swords } from 'lucide-react'

export function RequirementRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex size-8 items-center justify-center rounded-full border ${done ? 'border-primary bg-primary/15 text-primary' : 'theme-shell-chip text-[color:var(--overlaySoft)]'}`}>
        {done ? <Sparkles className="size-4" /> : <Swords className="size-4" />}
      </div>
      <p className="theme-shell-soft">{label}</p>
    </div>
  )
}

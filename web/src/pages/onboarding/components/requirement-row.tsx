import { Sparkles, Swords } from 'lucide-react'

export function RequirementRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex size-8 items-center justify-center rounded-full border ${done ? 'border-primary bg-primary/15 text-primary' : 'border-white/80 bg-white/72 text-foreground/55'}`}>
        {done ? <Sparkles className="size-4" /> : <Swords className="size-4" />}
      </div>
      <p className="text-foreground/82">{label}</p>
    </div>
  )
}

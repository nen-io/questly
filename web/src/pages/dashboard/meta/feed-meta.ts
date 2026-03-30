import {
  Activity,
  Medal,
  MessageCircle,
  Shield,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react'

export const feedMeta: Record<string, { icon: typeof Activity; accent: string }> = {
  quest_started: { icon: Swords, accent: 'bg-rose-100 text-rose-700' },
  quest_completed: { icon: Trophy, accent: 'bg-rose-100 text-rose-700' },
  quest_expired: { icon: Activity, accent: 'bg-orange-100 text-orange-700' },
  reward_purchased: { icon: Sparkles, accent: 'bg-amber-100 text-amber-700' },
  reward_redeemed: { icon: Medal, accent: 'bg-sky-100 text-sky-700' },
  quest_created: { icon: Shield, accent: 'bg-violet-100 text-violet-700' },
  quest_updated: { icon: Shield, accent: 'bg-violet-100 text-violet-700' },
  reward_created: { icon: Sparkles, accent: 'bg-amber-100 text-amber-700' },
  reward_updated: { icon: Sparkles, accent: 'bg-amber-100 text-amber-700' },
  win_commented: { icon: MessageCircle, accent: 'bg-emerald-100 text-emerald-700' },
}

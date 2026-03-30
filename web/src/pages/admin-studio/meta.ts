import { Palette, Shield, Sparkles, Trophy, Users } from 'lucide-react'

import type { AdminSection } from '@/routes/app'

export const adminSectionMeta: Array<{
  id: AdminSection
  label: string
  description: string
  icon: typeof Users
}> = [
  {
    id: 'players',
    label: 'Players',
    description: 'Add accounts and issue temporary passwords.',
    icon: Users,
  },
  {
    id: 'categories',
    label: 'Kudos',
    description: 'Define the kudos tracks your group earns and spends.',
    icon: Shield,
  },
  {
    id: 'branding',
    label: 'Branding',
    description: 'Set the theme, login copy, and dashboard copy.',
    icon: Palette,
  },
  {
    id: 'quests',
    label: 'Quests',
    description: 'Create the first repeatable goals for the group.',
    icon: Sparkles,
  },
  {
    id: 'rewards',
    label: 'Rewards',
    description: 'Create the first spendable rewards.',
    icon: Trophy,
  },
]

import {
  Activity,
  Bell,
  Crown,
  Gift,
  LayoutDashboard,
  Settings2,
  Shield,
  Swords,
  Film,
} from 'lucide-react'

import type { DashboardTab } from '@/routes/app'

export const dashboardTabMeta: Record<DashboardTab, { label: string; icon: typeof LayoutDashboard }> = {
  overview: { label: 'Overview', icon: LayoutDashboard },
  tasks: { label: 'Quests', icon: Swords },
  rewards: { label: 'Rewards', icon: Gift },
  leaderboard: { label: 'Leaderboard', icon: Crown },
  wins: { label: 'Wins', icon: Film },
  activity: { label: 'Activity', icon: Activity },
  notifications: { label: 'Notifications', icon: Bell },
  settings: { label: 'Settings', icon: Settings2 },
  admin: { label: 'Admin', icon: Shield },
}

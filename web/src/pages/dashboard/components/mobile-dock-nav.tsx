import type { DashboardTab } from '@/routes/app'

import { dashboardTabMeta } from '../meta/dashboard-tab-meta'

export function MobileDockNav({
  activeTab,
  visibleTabs,
  onSelect,
}: {
  activeTab: DashboardTab
  visibleTabs: DashboardTab[]
  onSelect: (tab: DashboardTab) => void
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-x-auto overscroll-x-contain rounded-[1.8rem] border border-border/70 bg-card/90 px-2 py-2 shadow-[0_-12px_36px_rgba(47,31,39,0.08)] backdrop-blur [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto flex w-max min-w-full items-center justify-center gap-2">
            {visibleTabs.map((tab) => {
              const meta = dashboardTabMeta[tab]
              const Icon = meta.icon
              const isActive = activeTab === tab

              return (
                <button
                  key={`mobile-${tab}`}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-w-[4.9rem] flex-col items-center justify-center gap-1 rounded-[1.15rem] px-3 py-2 text-[10px] transition ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(214,92,101,0.24)]'
                      : 'text-muted-foreground hover:bg-primary/8 hover:text-foreground'
                  }`}
                  onClick={() => onSelect(tab)}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="retro-ui truncate">{meta.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

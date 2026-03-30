import { startTransition, useEffect, useEffectEvent, useRef, useState } from 'react'

import type { DashboardCelebrationDefinition, DashboardCelebrationScene } from '../utils/celebration'

export function useDashboardCelebration() {
  const [activeCelebration, setActiveCelebration] = useState<DashboardCelebrationScene | null>(null)
  const nextCelebrationIdRef = useRef(1)

  const dismissCelebrationFromEffect = useEffectEvent(() => {
    startTransition(() => {
      setActiveCelebration(null)
    })
  })

  const dismissCelebration = () => {
    startTransition(() => {
      setActiveCelebration(null)
    })
  }

  const triggerCelebration = (definition: DashboardCelebrationDefinition) => {
    // Each celebration gets a new id so AnimatePresence always replays the scene
    // even if the same type is triggered twice in a row.
    const nextScene: DashboardCelebrationScene = {
      ...definition,
      id: nextCelebrationIdRef.current,
    }

    nextCelebrationIdRef.current += 1

    startTransition(() => {
      setActiveCelebration(nextScene)
    })
  }

  useEffect(() => {
    if (!activeCelebration) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismissCelebrationFromEffect()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeCelebration])

  return {
    activeCelebration,
    dismissCelebration,
    triggerCelebration,
  }
}

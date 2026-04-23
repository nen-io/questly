import type { OnboardingRouteStep } from '@/routes/app'
import { cn } from '@/lib/utils'

import { onboardingStepMeta } from '../meta'

export function ProgressRail({
  completedSteps,
  currentStep,
  currentIndex,
  onSelectStep,
}: {
  completedSteps: string[]
  currentStep: OnboardingRouteStep
  currentIndex: number
  onSelectStep: (step: OnboardingRouteStep) => void
}) {
  const stepCount = onboardingStepMeta.length
  const trackInset = `${100 / (stepCount * 2)}%`
  const progressRatio = stepCount > 1 ? currentIndex / (stepCount - 1) : 0

  return (
    <div className="mt-5 overflow-x-auto pb-2">
      <div className="min-w-[54rem] px-2 py-4">
        <ol
          aria-label="Onboarding progress"
          className="relative grid gap-3"
          style={{ gridTemplateColumns: `repeat(${stepCount}, minmax(0, 1fr))` }}
        >
          <span
            aria-hidden="true"
            className="theme-shell-track pointer-events-none absolute top-3.5 h-1 rounded-full"
            style={{ left: trackInset, right: trackInset }}
          >
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),color-mix(in_srgb,var(--accent)_60%,var(--primary)))] shadow-[0_0_18px_color-mix(in_srgb,var(--primary)_28%,transparent)] transition-[width] duration-300"
              style={{ width: `${Math.max(0, Math.min(1, progressRatio)) * 100}%` }}
            />
          </span>

          {onboardingStepMeta.map((item, index) => {
            const completed = completedSteps.includes(item.step)
            const active = item.step === currentStep

            return (
              <li key={item.step} className="relative flex min-w-0 flex-col items-center gap-3">
                <button
                  aria-current={active ? 'step' : undefined}
                  className="group relative flex w-full min-w-0 flex-col items-center gap-3 bg-transparent text-center outline-none"
                  type="button"
                  onClick={() => onSelectStep(item.step)}
                >
                  <span className="flex h-7 items-center justify-center">
                    <span
                      className={cn(
                        'relative z-10 flex size-6 items-center justify-center rounded-full border-2 transition-colors duration-200',
                        active && 'border-primary bg-primary shadow-[0_0_0_5px_color-mix(in_srgb,var(--primary)_14%,transparent)]',
                        !active && completed && 'border-primary/70 bg-primary/70',
                        !active && !completed && 'border-[color:var(--overlayBorder)] bg-[color:var(--overlaySurfaceStrong)]',
                      )}
                    >
                      <span
                        className={cn(
                          'size-2 rounded-full transition-colors duration-200',
                          active || completed ? 'bg-white' : 'bg-foreground/24',
                        )}
                      />
                    </span>
                  </span>

                  <span
                    className={cn(
                      'retro-ui flex min-h-11 w-full items-center justify-center rounded-full border px-4 py-2 text-center text-sm transition-colors duration-200',
                      active && 'theme-shell-pill border-primary',
                      !active && completed && 'border-primary/20 bg-primary/10 text-[color:var(--overlayForeground)] shadow-[0_8px_18px_var(--overlayShadow)]',
                      !active && !completed && 'theme-shell-chip',
                      'group-hover:border-primary/55 group-hover:text-[color:var(--overlayForeground)] group-focus-visible:border-primary group-focus-visible:ring-2 group-focus-visible:ring-primary/25',
                    )}
                  >
                    {index + 1}. {item.shortLabel}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

import { Button } from '@/components/ui/button'
import type { AdminBootstrap } from '@/types/app'

import { InfoTile } from '../components/info-tile'
import { RequirementRow } from '../components/requirement-row'
import { StepPanel } from '../components/step-panel'

export function LaunchStep({
  bootstrap,
  categoriesCount,
  launchError,
  playersCount,
  isLaunching,
  onLaunch,
}: {
  bootstrap: AdminBootstrap
  categoriesCount: number
  launchError: string[]
  playersCount: number
  isLaunching: boolean
  onLaunch: () => Promise<void>
}) {
  return (
    <StepPanel eyebrow="Review + launch" title="Run the final systems check." description="If the roster, kudos, and sign-in surface are ready, launch the realm and let the competition loose.">
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoTile title="Theme" value={bootstrap.settings.theme.name} detail={bootstrap.settings.platformName} />
        <InfoTile title="Roster" value={`${playersCount} player${playersCount === 1 ? '' : 's'}`} detail="Players can only log in after launch." />
        <InfoTile title="Kudos" value={`${categoriesCount}`} detail="At least one active kudos track is required." />
        <InfoTile title="Open blockers" value={`${bootstrap.setup.launchBlockers.length}`} detail="Launch checks these requirements when you click the button." />
      </div>
      <div className="theme-shell-card rounded-[1.5rem] p-4">
        <p className="retro-ui text-sm uppercase tracking-[0.22em] text-primary">Systems Check</p>
        <div className="mt-4 space-y-3">
          <RequirementRow done={bootstrap.setup.requirements.identityConfigured} label="Identity, theme, and sign-in surface saved" />
          <RequirementRow done={bootstrap.setup.requirements.landingConfigured} label="Sign-in surface content saved" />
          <RequirementRow done={bootstrap.setup.requirements.hasPlayer} label="At least one active player" />
          <RequirementRow done={bootstrap.setup.requirements.hasAttribute} label="At least one active kudos track" />
        </div>
        {bootstrap.setup.launchBlockers.length > 0 ? (
          <div className="theme-shell-muted mt-4 space-y-2 text-sm">
            {bootstrap.setup.launchBlockers.map((blocker) => (
              <p key={blocker}>{blocker}</p>
            ))}
          </div>
        ) : null}
      </div>
      {launchError.length > 0 ? (
        <div className="rounded-[1.5rem] border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
          <p className="font-semibold text-destructive">Finish the missing setup steps before launch.</p>
          <div className="theme-shell-muted mt-2 space-y-1">
            {launchError.map((step) => (
              <p key={step}>{step}</p>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button disabled={isLaunching} onClick={() => void onLaunch()}>
          {isLaunching ? 'Launching...' : 'Launch Realm'}
        </Button>
      </div>
    </StepPanel>
  )
}

import { PlayerAccountsCard } from '@/components/admin-studio/player-accounts-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldBlock } from '@/components/forms/field-block'
import { getFormErrorMessage } from '@/lib/form-errors'

import { StepPanel } from '../components/step-panel'
import type { OnboardingPlayer, PlayerForm, PlayerFormValues } from '../lib/types'

export function PlayerStep({
  deletePlayerPending,
  form,
  isCreating,
  players,
  onDeletePlayer,
  onSave,
}: {
  deletePlayerPending: boolean
  form: PlayerForm
  isCreating: boolean
  players: OnboardingPlayer[]
  onDeletePlayer: (playerId: number) => Promise<void>
  onSave: (values: PlayerFormValues) => Promise<void>
}) {
  return (
    <StepPanel eyebrow="Roster" title="Mint the first player profile." description="The admin stays in setup mode. Players only unlock after launch.">
      <form className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]" onSubmit={form.handleSubmit(onSave)}>
        <div className="space-y-4">
          <FieldBlock error={getFormErrorMessage(form.formState.errors.displayName)} htmlFor="playerDisplayName" label="Display name">
            <Input id="playerDisplayName" {...form.register('displayName')} />
          </FieldBlock>
          <FieldBlock error={getFormErrorMessage(form.formState.errors.username)} htmlFor="playerUsername" label="Username">
            <Input id="playerUsername" {...form.register('username')} />
          </FieldBlock>
          <FieldBlock error={getFormErrorMessage(form.formState.errors.temporaryPassword)} htmlFor="playerTemporaryPassword" label="Temporary password">
            <Input id="playerTemporaryPassword" type="password" {...form.register('temporaryPassword')} />
          </FieldBlock>
          <Button disabled={isCreating} type="submit">
            {isCreating ? 'Creating...' : 'Create Player'}
          </Button>
        </div>
        <PlayerAccountsCard
          className="theme-shell-card"
          deletePlayerPending={deletePlayerPending}
          description="Players stay locked out until launch. If you need to start the roster over, remove the entry here."
          emptyMessage="No players yet. Create one to unlock Launch."
          onDeletePlayer={onDeletePlayer}
          players={players}
          title="Active roster"
        />
      </form>
    </StepPanel>
  )
}

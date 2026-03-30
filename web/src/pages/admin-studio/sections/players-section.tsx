import { PlayerAccountsCard } from '@/components/admin-studio/player-accounts-card'
import { FieldBlock } from '@/components/forms/field-block'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getFormErrorMessage } from '@/lib/form-errors'
import type { AdminBootstrap } from '@/types/app'
import type { UseFormReturn } from 'react-hook-form'

export function AdminStudioPlayersSection({
  bootstrap,
  playerForm,
  createPlayerPending,
  deletePlayerPending,
  resetPasswordPending,
  onCreatePlayer,
  onDeletePlayer,
  onResetPassword,
}: {
  bootstrap: AdminBootstrap
  playerForm: UseFormReturn<{
    displayName: string
    username: string
    temporaryPassword: string
  }>
  createPlayerPending: boolean
  deletePlayerPending: boolean
  resetPasswordPending: boolean
  onCreatePlayer: (values: { displayName: string; username: string; temporaryPassword: string }) => void
  onDeletePlayer: (playerId: number) => Promise<unknown>
  onResetPassword: (playerId: number, temporaryPassword: string) => Promise<unknown>
}) {
  return (
    <div className="space-y-4">
      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Create player</CardTitle>
          <CardDescription>Players are created with a temporary password and must replace it on first login.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={playerForm.handleSubmit((values) => onCreatePlayer(values))}
          >
            <FieldBlock
              error={getFormErrorMessage(playerForm.formState.errors.displayName)}
              htmlFor="playerDisplayName"
              label="Display name"
              tooltip="This is the friendly name shown across the app, activity feed, wins, and leaderboard."
            >
              <Input
                id="playerDisplayName"
                aria-invalid={Boolean(playerForm.formState.errors.displayName)}
                {...playerForm.register('displayName')}
              />
            </FieldBlock>
            <FieldBlock
              error={getFormErrorMessage(playerForm.formState.errors.username)}
              htmlFor="playerUsername"
              label="Username"
              tooltip="This is the login name for the player. Keep it short and easy to type."
            >
              <Input
                id="playerUsername"
                aria-invalid={Boolean(playerForm.formState.errors.username)}
                {...playerForm.register('username')}
              />
            </FieldBlock>
            <FieldBlock
              error={getFormErrorMessage(playerForm.formState.errors.temporaryPassword)}
              htmlFor="playerTemporaryPassword"
              label="Temporary password"
              tooltip="Admins set a starter password here. The player will be forced to replace it on first login."
            >
              <Input
                id="playerTemporaryPassword"
                type="password"
                aria-invalid={Boolean(playerForm.formState.errors.temporaryPassword)}
                {...playerForm.register('temporaryPassword')}
              />
            </FieldBlock>
            <div className="md:col-span-3">
              <Button disabled={createPlayerPending} type="submit">
                Add player
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <PlayerAccountsCard
        deletePlayerPending={deletePlayerPending}
        description="See everyone in the group, reset temporary passwords, and remove players who should no longer appear in the app."
        emptyMessage="No accounts yet. Add a player to start building the roster."
        onDeletePlayer={onDeletePlayer}
        onResetPassword={onResetPassword}
        players={bootstrap.players}
        resetPasswordPending={resetPasswordPending}
        title="Current accounts"
      />
    </div>
  )
}

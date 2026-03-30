import { Trash2 } from 'lucide-react'

import { ResetPasswordInlineForm } from '@/components/admin-studio/reset-password-inline-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AdminBootstrap } from '@/types/app'

interface PlayerAccountsCardProps {
  deletePlayerPending?: boolean
  description: string
  emptyMessage: string
  onDeletePlayer?: (playerId: number) => Promise<unknown>
  onResetPassword?: (playerId: number, temporaryPassword: string) => Promise<unknown>
  players: AdminBootstrap['players']
  resetPasswordPending?: boolean
  title: string
  className?: string
}

export function PlayerAccountsCard({
  className,
  deletePlayerPending = false,
  description,
  emptyMessage,
  onDeletePlayer,
  onResetPassword,
  players,
  resetPasswordPending = false,
  title,
}: PlayerAccountsCardProps) {
  return (
    <Card className={cn('rounded-[1.75rem]', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {players.length > 0 ? players.map((player) => (
          <div key={player.id} className="rounded-2xl border border-border/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{player.displayName}</p>
                <p className="text-sm text-muted-foreground">@{player.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded-full border border-border/70 px-3 py-1 text-sm">
                  {player.role}
                </span>
                {player.mustChangePassword ? (
                  <span className="inline-flex rounded-full border border-border/70 px-3 py-1 text-sm">
                    Password reset required
                  </span>
                ) : null}
              </div>
            </div>

            {player.role === 'player' && (onResetPassword || onDeletePlayer) ? (
              <div className="mt-4 space-y-4">
                {onResetPassword ? (
                  <ResetPasswordInlineForm
                    isPending={resetPasswordPending}
                    onSubmit={(temporaryPassword) => onResetPassword(player.id, temporaryPassword)}
                  />
                ) : null}

                {onDeletePlayer ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-[var(--surface-alt)]/55 px-4 py-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">Remove player</p>
                      <p className="text-sm text-muted-foreground">
                        This signs them out, removes future quest and reward assignments, and keeps past history intact.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={deletePlayerPending}
                      onClick={() => {
                        if (!window.confirm(`Delete ${player.displayName}? This cannot be undone here.`)) {
                          return
                        }

                        void onDeletePlayer(player.id)
                      }}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

import type { FormEventHandler, ReactNode } from 'react'

import { FieldBlock } from '@/components/forms/field-block'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { AssignmentMode } from '@/pages/admin-studio/utils'

export function EntityFormCard({
  title,
  description,
  assignmentMode,
  assignmentError,
  onAssignmentModeChange,
  selectedUserIds,
  onToggleUser,
  players,
  onSubmit,
  secondaryActionLabel,
  onSecondaryAction,
  submitLabel,
  submitDisabled,
  children,
}: {
  title: string
  description: string
  assignmentMode: AssignmentMode
  assignmentError?: string
  onAssignmentModeChange: (mode: AssignmentMode) => void
  selectedUserIds: number[]
  onToggleUser: (userId: number) => void
  players: Array<{ id: number; displayName: string }>
  onSubmit: FormEventHandler<HTMLFormElement>
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  submitLabel: string
  submitDisabled?: boolean
  children: ReactNode
}) {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <FieldBlock error={assignmentError} label="Assignment" tooltip="Choose whether this should appear for everyone or only selected players.">
            <Select value={assignmentMode} onValueChange={(value) => onAssignmentModeChange(value as AssignmentMode)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_players">All players</SelectItem>
                <SelectItem value="selected_players">Selected players</SelectItem>
              </SelectContent>
            </Select>
          </FieldBlock>
          {assignmentMode === 'selected_players' && (
            <div className="grid gap-2 sm:grid-cols-2">
              {players.map((player) => (
                <label key={player.id} className="flex items-center gap-3 rounded-2xl border border-border/70 px-3 py-2">
                  <input
                    checked={selectedUserIds.includes(player.id)}
                    className="size-4"
                    type="checkbox"
                    onChange={() => onToggleUser(player.id)}
                  />
                  <span>{player.displayName}</span>
                </label>
              ))}
            </div>
          )}
          {children}
          <div className="flex flex-wrap gap-2">
            <Button disabled={submitDisabled} type="submit">
              {submitLabel}
            </Button>
            {secondaryActionLabel && onSecondaryAction ? (
              <Button type="button" variant="outline" onClick={onSecondaryAction}>
                {secondaryActionLabel}
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

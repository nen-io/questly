import { type UseFormReturn } from 'react-hook-form'

import { FieldBlock } from '@/components/forms/field-block'
import { ColorPickerField, EmojiSelectorField } from '@/components/forms/shared-form-controls'
import { emojiSuggestions } from '@/components/forms/shared-form-options'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { getFormErrorMessage } from '@/lib/form-errors'
import type { AdminCategory } from '@/types/app'
import type { AssignmentMode, RewardFormValues } from '@/pages/admin-studio/utils'
import { updateRuleValue } from '@/pages/admin-studio/utils'
import { RuleGrid } from './rule-grid'

export function RewardEditorFields({
  form,
  categories,
  players,
}: {
  form: UseFormReturn<RewardFormValues>
  categories: AdminCategory[]
  players: Array<{ id: number; displayName: string }>
}) {
  const assignmentMode = form.watch('assignmentMode')
  const selectedUserIds = form.watch('userIds')
  const costs = form.watch('costs')

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldBlock error={getFormErrorMessage(form.formState.errors.title)} htmlFor="editRewardTitle" label="Title" tooltip="Player-facing reward name shown anywhere a reward can be purchased or redeemed.">
          <Input
            id="editRewardTitle"
            aria-invalid={Boolean(form.formState.errors.title)}
            {...form.register('title')}
          />
        </FieldBlock>
        <FieldBlock error={getFormErrorMessage(form.formState.errors.icon)} htmlFor="editRewardIcon" label="Icon" tooltip="Optional emoji shown with the reward title across the catalog and purchase views.">
          <EmojiSelectorField
            inputId="editRewardIcon"
            value={form.watch('icon') ?? ''}
            suggestions={emojiSuggestions.rewards}
            onChange={(value) => form.setValue('icon', value, { shouldDirty: true, shouldValidate: true })}
          />
        </FieldBlock>
        <FieldBlock error={getFormErrorMessage(form.formState.errors.cooldownDays)} htmlFor="editRewardCooldownDays" label="Cooldown days" tooltip="How long a player must wait before this reward becomes available again after purchase.">
          <Input
            id="editRewardCooldownDays"
            type="number"
            aria-invalid={Boolean(form.formState.errors.cooldownDays)}
            {...form.register('cooldownDays')}
          />
        </FieldBlock>
        <FieldBlock error={getFormErrorMessage(form.formState.errors.color)} htmlFor="editRewardColor" label="Color" tooltip="Optional accent color for reward cards, pills, and detail views.">
          <ColorPickerField
            inputId="editRewardColor"
            value={form.watch('color')}
            onChange={(value) => form.setValue('color', value, { shouldDirty: true, shouldValidate: true })}
          />
        </FieldBlock>
        <div className="md:col-span-2">
          <FieldBlock error={getFormErrorMessage(form.formState.errors.description)} htmlFor="editRewardDescription" label="Description" tooltip="Use this to explain what the reward unlocks or what happens when it is redeemed.">
            <Textarea
              id="editRewardDescription"
              aria-invalid={Boolean(form.formState.errors.description)}
              {...form.register('description')}
            />
          </FieldBlock>
        </div>
        <FieldBlock error={getFormErrorMessage(form.formState.errors.userIds)} label="Assignment" tooltip="Choose whether this should appear for everyone or only selected players.">
          <Select value={assignmentMode} onValueChange={(value) => form.setValue('assignmentMode', value as AssignmentMode, { shouldDirty: true, shouldValidate: true })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_players">All players</SelectItem>
              <SelectItem value="selected_players">Selected players</SelectItem>
            </SelectContent>
          </Select>
        </FieldBlock>
      </div>
      {assignmentMode === 'selected_players' ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {players.map((player) => (
            <label key={`edit-reward-player-${player.id}`} className="flex items-center gap-3 rounded-2xl border border-border/70 px-3 py-2">
              <input
                checked={selectedUserIds.includes(player.id)}
                className="size-4"
                type="checkbox"
                onChange={() => form.setValue(
                  'userIds',
                  selectedUserIds.includes(player.id)
                    ? selectedUserIds.filter((value) => value !== player.id)
                    : [...selectedUserIds, player.id],
                  { shouldDirty: true, shouldValidate: true },
                )}
              />
              <span>{player.displayName}</span>
            </label>
          ))}
        </div>
      ) : null}
      <Separator />
      <RuleGrid
        title="Kudos costs"
        categories={categories}
        error={getFormErrorMessage(form.formState.errors.costs)}
        tooltip="Set how many points from each kudos track are spent when this reward is purchased."
        values={costs}
        onChange={(categoryId, value) => updateRuleValue(form, 'costs', categoryId, value)}
      />
    </>
  )
}

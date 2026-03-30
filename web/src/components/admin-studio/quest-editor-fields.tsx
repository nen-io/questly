import { Controller, type UseFormReturn } from 'react-hook-form'

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
import type { AssignmentMode, QuestFormValues } from '@/pages/admin-studio/utils'
import { updateRuleValue } from '@/pages/admin-studio/utils'
import { RuleGrid } from './rule-grid'

export function QuestEditorFields({
  form,
  categories,
  players,
}: {
  form: UseFormReturn<QuestFormValues>
  categories: AdminCategory[]
  players: Array<{ id: number; displayName: string }>
}) {
  const assignmentMode = form.watch('assignmentMode')
  const selectedUserIds = form.watch('userIds')
  const rewardRules = form.watch('rewardRules')
  const penaltyRules = form.watch('penaltyRules')

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldBlock error={getFormErrorMessage(form.formState.errors.title)} htmlFor="editQuestTitle" label="Title" tooltip="Short player-facing quest name shown in the quest board, activity feed, and wins view.">
          <Input
            id="editQuestTitle"
            aria-invalid={Boolean(form.formState.errors.title)}
            {...form.register('title')}
          />
        </FieldBlock>
        <FieldBlock error={getFormErrorMessage(form.formState.errors.icon)} htmlFor="editQuestIcon" label="Icon" tooltip="Optional emoji shown with the quest title to make it easier to scan.">
          <EmojiSelectorField
            inputId="editQuestIcon"
            value={form.watch('icon') ?? ''}
            suggestions={emojiSuggestions.quests}
            onChange={(value) => form.setValue('icon', value, { shouldDirty: true, shouldValidate: true })}
          />
        </FieldBlock>
        <FieldBlock error={getFormErrorMessage(form.formState.errors.recurrence)} label="Recurrence" tooltip="How often the quest becomes available again after completion or expiry.">
          <Controller
            control={form.control}
            name="recurrence"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="one_time">One time</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FieldBlock>
        <FieldBlock error={getFormErrorMessage(form.formState.errors.expiresInHours)} htmlFor="editQuestExpiresInHours" label="Expires in hours" tooltip="Optional timer for active quests. After a quest is accepted how long do players have to finish it.">
          <Input
            id="editQuestExpiresInHours"
            type="number"
            aria-invalid={Boolean(form.formState.errors.expiresInHours)}
            {...form.register('expiresInHours')}
          />
        </FieldBlock>
        <div className="md:col-span-2">
          <FieldBlock error={getFormErrorMessage(form.formState.errors.description)} htmlFor="editQuestDescription" label="Description" tooltip="Add detail so players know exactly what counts as completing this quest.">
            <Textarea
              id="editQuestDescription"
              aria-invalid={Boolean(form.formState.errors.description)}
              {...form.register('description')}
            />
          </FieldBlock>
        </div>
        <FieldBlock error={getFormErrorMessage(form.formState.errors.color)} htmlFor="editQuestColor" label="Color" tooltip="Optional accent color for quest cards, pills, and detail views.">
          <ColorPickerField
            inputId="editQuestColor"
            value={form.watch('color')}
            onChange={(value) => form.setValue('color', value, { shouldDirty: true, shouldValidate: true })}
          />
        </FieldBlock>
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
            <label key={`edit-quest-player-${player.id}`} className="flex items-center gap-3 rounded-2xl border border-border/70 px-3 py-2">
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
        title="Reward values"
        categories={categories}
        error={getFormErrorMessage(form.formState.errors.rewardRules)}
        tooltip="Positive values grant kudos in the matching tracks when the quest is completed."
        values={rewardRules}
        onChange={(categoryId, value) => updateRuleValue(form, 'rewardRules', categoryId, value)}
      />
      <RuleGrid
        title="Penalty values"
        categories={categories}
        tooltip="Optional deductions to apply if the quest expires."
        values={penaltyRules}
        onChange={(categoryId, value) => updateRuleValue(form, 'penaltyRules', categoryId, value)}
      />
    </>
  )
}

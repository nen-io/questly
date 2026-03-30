import { Controller } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ColorPickerField, EmojiSelectorField } from '@/components/forms/shared-form-controls'
import { emojiSuggestions } from '@/components/forms/shared-form-options'
import { FieldBlock } from '@/components/forms/field-block'
import { getFormErrorMessage } from '@/lib/form-errors'
import type { AdminTask } from '@/types/app'

import { EmptyDependencyNotice } from '../components/empty-dependency-notice'
import { OnboardingCatalogList } from '../components/onboarding-catalog-list'
import { OnboardingRuleGrid } from '../components/onboarding-rule-grid'
import { StepPanel } from '../components/step-panel'
import { formatRuleMeta, updateRuleValue } from '../lib/rules'
import type { OnboardingCategory, QuestForm, QuestFormValues } from '../lib/types'

export function QuestStep({
  adminTasks,
  categories,
  form,
  isCreating,
  onDelete,
  onEdit,
  onSave,
  onToggleVisibility,
}: {
  adminTasks: AdminTask[]
  categories: OnboardingCategory[]
  form: QuestForm
  isCreating: boolean
  onDelete: (taskId: number) => void
  onEdit: (taskId: number) => void
  onSave: (values: QuestFormValues) => Promise<void>
  onToggleVisibility: (taskId: number, nextActive: boolean) => void
}) {
  return (
    <StepPanel eyebrow="Optional quest" title="Seed the first quest." description="This step is skippable, but it gives the cabinet something playable on day one.">
      {categories.length === 0 ? (
        <EmptyDependencyNotice message="Create a kudos track first. Quests need at least one reward rule." />
      ) : (
        <div className="space-y-5">
          <form className="grid gap-4" onSubmit={form.handleSubmit(onSave)}>
            <FieldBlock error={getFormErrorMessage(form.formState.errors.title)} htmlFor="questTitle" label="Quest title" tooltip="Short player-facing quest name shown on the board and in activity history.">
              <Input id="questTitle" {...form.register('title')} />
            </FieldBlock>
            <FieldBlock error={getFormErrorMessage(form.formState.errors.description)} htmlFor="questDescription" label="Quest description" tooltip="Supporting text that explains what counts as success for this quest.">
              <Textarea id="questDescription" rows={4} {...form.register('description')} />
            </FieldBlock>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBlock error={getFormErrorMessage(form.formState.errors.color)} htmlFor="questColor" label="Quest color" tooltip="Optional accent color used on quest cards, chips, and admin views.">
                <ColorPickerField
                  inputId="questColor"
                  value={form.watch('color')}
                  onChange={(value) => form.setValue('color', value, { shouldDirty: true, shouldValidate: true })}
                />
              </FieldBlock>
              <FieldBlock error={getFormErrorMessage(form.formState.errors.icon)} htmlFor="questIcon" label="Quest icon" tooltip="Optional emoji marker shown with the quest title to make it easier to scan.">
                <EmojiSelectorField
                  inputId="questIcon"
                  value={form.watch('icon') ?? ''}
                  suggestions={emojiSuggestions.quests}
                  onChange={(value) => form.setValue('icon', value, { shouldDirty: true, shouldValidate: true })}
                />
              </FieldBlock>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBlock error={getFormErrorMessage(form.formState.errors.recurrence)} label="Recurrence">
                <Controller
                  control={form.control}
                  name="recurrence"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
              <FieldBlock error={getFormErrorMessage(form.formState.errors.expiresInHours)} htmlFor="questExpiresInHours" label="Expires in hours" tooltip="Optional timer for active quests. After a quest is accepted how long players have to finish it.">
                <Input id="questExpiresInHours" type="number" min={1} {...form.register('expiresInHours')} />
              </FieldBlock>
            </div>
            <OnboardingRuleGrid
              title="Reward values"
              categories={categories}
              error={getFormErrorMessage(form.formState.errors.rewardRules)}
              tooltip="Set the point gains for each kudos track. Leave unused tracks blank."
              values={form.watch('rewardRules')}
              onChange={(categoryId, value) => updateRuleValue(form, 'rewardRules', categoryId, value)}
            />
            <OnboardingRuleGrid
              title="Penalty values"
              categories={categories}
              tooltip="Optional deductions to apply if this quest expires or fails."
              values={form.watch('penaltyRules')}
              onChange={(categoryId, value) => updateRuleValue(form, 'penaltyRules', categoryId, value)}
            />
            <Button disabled={isCreating} type="submit">
              {isCreating ? 'Creating...' : 'Create Quest'}
            </Button>
          </form>

          <OnboardingCatalogList
            emptyMessage="No quests created yet."
            items={adminTasks.map((task) => ({
              id: task.id,
              title: task.title,
              description: `${task.recurrence} • ${task.isActive ? 'Visible' : 'Hidden'}`,
              color: task.color,
              icon: task.icon,
              isActive: task.isActive,
              meta: [
                ...(task.rewardRules ?? []).map((rule) => formatRuleMeta(categories, rule.categoryId, rule.amount, '+')),
                ...(task.penaltyRules ?? []).map((rule) => formatRuleMeta(categories, rule.categoryId, rule.amount, '-')),
              ],
            }))}
            title="Quest catalog"
            onDelete={onDelete}
            onEdit={onEdit}
            onToggleVisibility={onToggleVisibility}
          />
        </div>
      )}
    </StepPanel>
  )
}

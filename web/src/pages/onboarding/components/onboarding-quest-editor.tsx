import { Controller } from 'react-hook-form'

import { FieldBlock } from '@/components/forms/field-block'
import { ColorPickerField, EmojiSelectorField } from '@/components/forms/shared-form-controls'
import { emojiSuggestions } from '@/components/forms/shared-form-options'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getFormErrorMessage } from '@/lib/form-errors'

import { updateRuleValue } from '../lib/rules'
import type { OnboardingCategory, QuestForm } from '../lib/types'
import { OnboardingRuleGrid } from './onboarding-rule-grid'

export function OnboardingQuestEditor({
  form,
  categories,
}: {
  form: QuestForm
  categories: OnboardingCategory[]
}) {
  return (
    <div className="space-y-8">
      <FieldBlock error={getFormErrorMessage(form.formState.errors.title)} htmlFor="editQuestTitle" label="Quest title">
        <Input id="editQuestTitle" {...form.register('title')} />
      </FieldBlock>
      <FieldBlock error={getFormErrorMessage(form.formState.errors.description)} htmlFor="editQuestDescription" label="Quest description">
        <Textarea id="editQuestDescription" rows={4} {...form.register('description')} />
      </FieldBlock>
      <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
        <FieldBlock error={getFormErrorMessage(form.formState.errors.color)} htmlFor="editQuestColor" label="Quest color">
          <ColorPickerField inputId="editQuestColor" value={form.watch('color')} onChange={(value) => form.setValue('color', value, { shouldDirty: true, shouldValidate: true })} />
        </FieldBlock>
        <FieldBlock error={getFormErrorMessage(form.formState.errors.icon)} htmlFor="editQuestIcon" label="Quest icon">
          <EmojiSelectorField inputId="editQuestIcon" value={form.watch('icon') ?? ''} suggestions={emojiSuggestions.quests} onChange={(value) => form.setValue('icon', value, { shouldDirty: true, shouldValidate: true })} />
        </FieldBlock>
      </div>
      <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
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
        <FieldBlock error={getFormErrorMessage(form.formState.errors.expiresInHours)} htmlFor="editQuestExpiresInHours" label="Expires in hours">
          <Input id="editQuestExpiresInHours" type="number" min={1} {...form.register('expiresInHours')} />
        </FieldBlock>
      </div>
      <OnboardingRuleGrid
        title="Reward values"
        categories={categories}
        error={getFormErrorMessage(form.formState.errors.rewardRules)}
        tooltip="Positive values grant kudos in the matching tracks when the quest is completed."
        values={form.watch('rewardRules')}
        onChange={(categoryId, value) => updateRuleValue(form, 'rewardRules', categoryId, value)}
      />
      <OnboardingRuleGrid
        title="Penalty values"
        categories={categories}
        tooltip="Optional deductions to apply if the quest expires."
        values={form.watch('penaltyRules')}
        onChange={(categoryId, value) => updateRuleValue(form, 'penaltyRules', categoryId, value)}
      />
    </div>
  )
}

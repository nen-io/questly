import { FieldBlock } from '@/components/forms/field-block'
import { ColorPickerField, EmojiSelectorField } from '@/components/forms/shared-form-controls'
import { emojiSuggestions } from '@/components/forms/shared-form-options'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getFormErrorMessage } from '@/lib/form-errors'

import { updateRuleValue } from '../lib/rules'
import type { OnboardingCategory, RewardForm } from '../lib/types'
import { OnboardingRuleGrid } from './onboarding-rule-grid'

export function OnboardingRewardEditor({
  form,
  categories,
}: {
  form: RewardForm
  categories: OnboardingCategory[]
}) {
  return (
    <div className="space-y-8">
      <FieldBlock error={getFormErrorMessage(form.formState.errors.title)} htmlFor="editRewardTitle" label="Reward title">
        <Input id="editRewardTitle" {...form.register('title')} />
      </FieldBlock>
      <FieldBlock error={getFormErrorMessage(form.formState.errors.description)} htmlFor="editRewardDescription" label="Reward description">
        <Textarea id="editRewardDescription" rows={4} {...form.register('description')} />
      </FieldBlock>
      <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
        <FieldBlock error={getFormErrorMessage(form.formState.errors.color)} htmlFor="editRewardColor" label="Reward color">
          <ColorPickerField inputId="editRewardColor" value={form.watch('color')} onChange={(value) => form.setValue('color', value, { shouldDirty: true, shouldValidate: true })} />
        </FieldBlock>
        <FieldBlock error={getFormErrorMessage(form.formState.errors.icon)} htmlFor="editRewardIcon" label="Reward icon">
          <EmojiSelectorField inputId="editRewardIcon" value={form.watch('icon') ?? ''} suggestions={emojiSuggestions.rewards} onChange={(value) => form.setValue('icon', value, { shouldDirty: true, shouldValidate: true })} />
        </FieldBlock>
      </div>
      <FieldBlock error={getFormErrorMessage(form.formState.errors.cooldownDays)} htmlFor="editRewardCooldownDays" label="Cooldown days">
        <Input id="editRewardCooldownDays" type="number" min={0} {...form.register('cooldownDays')} />
      </FieldBlock>
      <OnboardingRuleGrid
        title="Kudos costs"
        categories={categories}
        error={getFormErrorMessage(form.formState.errors.costs)}
        tooltip="Set how many points from each kudos track are spent when this reward is purchased."
        values={form.watch('costs')}
        onChange={(categoryId, value) => updateRuleValue(form, 'costs', categoryId, value)}
      />
    </div>
  )
}

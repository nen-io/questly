import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ColorPickerField, EmojiSelectorField } from '@/components/forms/shared-form-controls'
import { emojiSuggestions } from '@/components/forms/shared-form-options'
import { FieldBlock } from '@/components/forms/field-block'
import { getFormErrorMessage } from '@/lib/form-errors'
import type { AdminReward } from '@/types/app'

import { EmptyDependencyNotice } from '../components/empty-dependency-notice'
import { OnboardingCatalogList } from '../components/onboarding-catalog-list'
import { OnboardingRuleGrid } from '../components/onboarding-rule-grid'
import { StepPanel } from '../components/step-panel'
import { formatRuleMeta, updateRuleValue } from '../lib/rules'
import type { OnboardingCategory, RewardForm, RewardFormValues } from '../lib/types'

export function RewardStep({
  adminRewards,
  categories,
  form,
  isCreating,
  onDelete,
  onEdit,
  onSave,
  onToggleVisibility,
}: {
  adminRewards: AdminReward[]
  categories: OnboardingCategory[]
  form: RewardForm
  isCreating: boolean
  onDelete: (rewardId: number) => void
  onEdit: (rewardId: number) => void
  onSave: (values: RewardFormValues) => Promise<void>
  onToggleVisibility: (rewardId: number, nextActive: boolean) => void
}) {
  return (
    <StepPanel eyebrow="Optional reward" title="Seed the first reward." description="Also skippable, but useful if you want a spend target before launch.">
      {categories.length === 0 ? (
        <EmptyDependencyNotice message="Create a kudos track first. Rewards need at least one cost rule." />
      ) : (
        <div className="space-y-5">
          <form className="grid gap-4" onSubmit={form.handleSubmit(onSave)}>
            <FieldBlock error={getFormErrorMessage(form.formState.errors.title)} htmlFor="rewardTitle" label="Reward title" tooltip="Short player-facing reward name shown in the reward shop.">
              <Input id="rewardTitle" {...form.register('title')} />
            </FieldBlock>
            <FieldBlock error={getFormErrorMessage(form.formState.errors.description)} htmlFor="rewardDescription" label="Reward description" tooltip="Supporting text that explains what players get when they redeem it.">
              <Textarea id="rewardDescription" rows={4} {...form.register('description')} />
            </FieldBlock>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBlock error={getFormErrorMessage(form.formState.errors.color)} htmlFor="rewardColor" label="Reward color" tooltip="Optional accent color used on reward cards and badges.">
                <ColorPickerField
                  inputId="rewardColor"
                  value={form.watch('color')}
                  onChange={(value) => form.setValue('color', value, { shouldDirty: true, shouldValidate: true })}
                />
              </FieldBlock>
              <FieldBlock error={getFormErrorMessage(form.formState.errors.icon)} htmlFor="rewardIcon" label="Reward icon" tooltip="Optional emoji marker shown with the reward title to make it easier to scan.">
                <EmojiSelectorField
                  inputId="rewardIcon"
                  value={form.watch('icon') ?? ''}
                  suggestions={emojiSuggestions.rewards}
                  onChange={(value) => form.setValue('icon', value, { shouldDirty: true, shouldValidate: true })}
                />
              </FieldBlock>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBlock error={getFormErrorMessage(form.formState.errors.cooldownDays)} htmlFor="rewardCooldown" label="Cooldown days">
                <Input id="rewardCooldown" type="number" min={0} {...form.register('cooldownDays')} />
              </FieldBlock>
            </div>
            <OnboardingRuleGrid
              title="Kudos costs"
              categories={categories}
              error={getFormErrorMessage(form.formState.errors.costs)}
              tooltip="Set the spend required from one or many point tracks. Leave unused tracks blank."
              values={form.watch('costs')}
              onChange={(categoryId, value) => updateRuleValue(form, 'costs', categoryId, value)}
            />
            <Button disabled={isCreating} type="submit">
              {isCreating ? 'Creating...' : 'Create Reward'}
            </Button>
          </form>

          <OnboardingCatalogList
            emptyMessage="No rewards created yet."
            items={adminRewards.map((reward) => ({
              id: reward.id,
              title: reward.title,
              description: `Cooldown ${reward.cooldownDays}d • ${reward.isActive ? 'Visible' : 'Hidden'}`,
              color: reward.color,
              icon: reward.icon,
              isActive: reward.isActive,
              meta: (reward.costs ?? []).map((cost) => formatRuleMeta(categories, cost.categoryId, cost.amount)),
            }))}
            title="Reward catalog"
            onDelete={onDelete}
            onEdit={onEdit}
            onToggleVisibility={onToggleVisibility}
          />
        </div>
      )}
    </StepPanel>
  )
}

import { AttributeCoreFields } from '@/components/attributes/attribute-core-fields'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FieldBlock } from '@/components/forms/field-block'
import { getFormErrorMessage } from '@/lib/form-errors'

import { StepPanel } from '../components/step-panel'
import type { AttributeForm, AttributeFormValues, OnboardingCategory } from '../lib/types'

export function AttributeStep({
  form,
  categories,
  isCreating,
  isEditing,
  isDeleting,
  onEdit,
  onDelete,
  onSave,
}: {
  form: AttributeForm
  categories: OnboardingCategory[]
  isCreating: boolean
  isEditing: boolean
  isDeleting: boolean
  onEdit: (categoryId: number) => void
  onDelete: (categoryId: number) => void
  onSave: (values: AttributeFormValues) => Promise<void>
}) {
  return (
    <StepPanel eyebrow="Kudos" title="Create the first kudos track." description="Kudos power both quests and rewards, so this is the first real game system.">
      <form className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]" onSubmit={form.handleSubmit(onSave)}>
        <div className="space-y-4">
          <AttributeCoreFields
            form={form}
            nameInputId="attributeName"
            colorInputId="attributeColor"
            iconInputId="attributeIcon"
            nameLabel="Kudos track name"
          />
          <FieldBlock error={getFormErrorMessage(form.formState.errors.description)} htmlFor="attributeDescription" label="Description" tooltip="Explain what this stat represents so rewards and quests stay consistent.">
            <Textarea id="attributeDescription" rows={4} {...form.register('description')} />
          </FieldBlock>
          <Button disabled={isCreating} type="submit">
            {isCreating ? 'Creating...' : 'Create kudos track'}
          </Button>
        </div>
        <div className="theme-shell-card space-y-3 rounded-[1.5rem] p-4">
          <p className="retro-ui text-sm uppercase tracking-[0.22em] text-primary">Live Stats</p>
          {categories.length > 0 ? categories.map((category) => (
            <div key={category.id} className="theme-shell-card-strong rounded-2xl px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="theme-shell-icon flex size-9 items-center justify-center rounded-full text-sm"
                    style={{ backgroundColor: category.color, color: '#fff' }}
                  >
                    {category.icon || '•'}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{category.name}</p>
                    <p className="theme-shell-soft text-xs">{category.color}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={isEditing || isDeleting}
                    size="xs"
                    type="button"
                    variant="outline"
                    onClick={() => onEdit(category.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    disabled={isEditing || isDeleting}
                    size="xs"
                    type="button"
                    variant="outline"
                    onClick={() => onDelete(category.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <p className="theme-shell-muted text-sm">{category.description || 'No description yet.'}</p>
            </div>
          )) : (
            <p className="theme-shell-muted text-sm">No active kudos tracks yet. Create one to unlock Launch.</p>
          )}
          {categories.length > 0 ? (
            <p className="theme-shell-soft text-xs">
              Editing a kudos track here only changes its display name, icon, and color. Quests, rewards, and balances stay attached by kudos track ID.
            </p>
          ) : null}
        </div>
      </form>
    </StepPanel>
  )
}

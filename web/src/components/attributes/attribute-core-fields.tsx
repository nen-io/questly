import type { UseFormReturn } from 'react-hook-form'

import { FieldBlock } from '@/components/forms/field-block'
import { ColorPickerField, EmojiSelectorField } from '@/components/forms/shared-form-controls'
import { emojiSuggestions } from '@/components/forms/shared-form-options'
import { Input } from '@/components/ui/input'
import { getFormErrorMessage } from '@/lib/form-errors'

export function AttributeCoreFields({
  form,
  nameInputId,
  colorInputId,
  iconInputId,
  nameLabel = 'Name',
}: {
  form: UseFormReturn<any>
  nameInputId: string
  colorInputId: string
  iconInputId: string
  nameLabel?: string
}) {
  return (
    <div className="space-y-4">
      <FieldBlock error={getFormErrorMessage(form.formState.errors.name)} htmlFor={nameInputId} label={nameLabel} tooltip="This is the player-facing kudos track name, such as Love, Focus, Energy, or Gold.">
        <Input
          id={nameInputId}
          aria-invalid={Boolean(form.formState.errors.name)}
          {...form.register('name')}
        />
      </FieldBlock>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldBlock error={getFormErrorMessage(form.formState.errors.color)} htmlFor={colorInputId} label="Color" tooltip="Hex color used on badges, cards, totals, and rule chips for this kudos track.">
          <ColorPickerField
            inputId={colorInputId}
            value={form.watch('color')}
            onChange={(value) => form.setValue('color', value, { shouldDirty: true, shouldValidate: true })}
          />
        </FieldBlock>
        <FieldBlock error={getFormErrorMessage(form.formState.errors.icon)} htmlFor={iconInputId} label="Icon" tooltip="Optional emoji marker shown anywhere this kudos track appears in compact UI.">
          <EmojiSelectorField
            inputId={iconInputId}
            value={form.watch('icon') ?? ''}
            suggestions={emojiSuggestions.categories}
            onChange={(value) => form.setValue('icon', value, { shouldDirty: true, shouldValidate: true })}
          />
        </FieldBlock>
      </div>
    </div>
  )
}

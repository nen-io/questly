import type { UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import {
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@/components/ui/base-modal'
import type { AdminCategory } from '@/types/app'

import { AttributeCoreFields } from './attribute-core-fields'

export function AttributeEditDialog({
  open,
  category,
  form,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  category: AdminCategory | null
  form: UseFormReturn<any>
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { name: string; color: string; icon: string }) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseModalContent className="flex overflow-hidden" size="md">
        <BaseModalHeader
          title="Edit kudos track appearance"
          description="Only the display name, icon, and color change here. Quests, rewards, balances, and point rules continue using this kudos track's ID."
        />
        {category ? (
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={form.handleSubmit((values) => onSubmit(values))}
          >
            <BaseModalBody scrollable>
              <AttributeCoreFields
                form={form}
                nameInputId={`edit-attribute-name-${category.id}`}
                colorInputId={`edit-attribute-color-${category.id}`}
                iconInputId={`edit-attribute-icon-${category.id}`}
                nameLabel="Kudos track name"
              />
            </BaseModalBody>
            <BaseModalFooter className="flex-wrap">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button disabled={isPending} type="submit">
                {isPending ? 'Saving...' : 'Save kudos track'}
              </Button>
            </BaseModalFooter>
          </form>
        ) : null}
      </BaseModalContent>
    </Dialog>
  )
}

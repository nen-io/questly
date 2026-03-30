import type { UseFormReturn } from 'react-hook-form'
import { Upload, X } from 'lucide-react'

import type { PlayerTask } from '@/types/app'
import { FieldBlock } from '@/components/forms/field-block'
import {
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@/components/ui/base-modal'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getFormErrorMessage } from '@/lib/form-errors'
import { formatFileSize } from '../utils'

interface CompletionDialogProps {
  completionTarget: PlayerTask | null
  form: UseFormReturn<{ notes?: string; files: File[] }>
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (values: { notes?: string; files: File[] }) => void
}

export function CompletionDialog({
  completionTarget,
  form,
  isSubmitting,
  onClose,
  onSubmit,
}: CompletionDialogProps) {
  const completionFiles = form.watch('files')

  return (
    <Dialog
      open={Boolean(completionTarget)}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <BaseModalContent size="md">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(onSubmit)}>
          <BaseModalHeader
            title="Complete quest"
            description="Add optional notes before locking in the completion and applying the reward values."
          />
          <BaseModalBody className="space-y-4" scrollable>
            <FieldBlock error={getFormErrorMessage(form.formState.errors.notes)} label="Notes">
              <Textarea
                placeholder="What happened, what evidence matters, or what should the other players know?"
                aria-invalid={Boolean(form.formState.errors.notes)}
                {...form.register('notes')}
              />
            </FieldBlock>
            <FieldBlock
              description="Upload images or videos. The app stores a thumbnail for the wins list and the full asset for the detail view."
              error={getFormErrorMessage(form.formState.errors.files)}
              label="Attach media"
            >
              <div className="space-y-3 rounded-[1.5rem] border border-border/70 bg-[var(--surface-alt)] p-4">
                <label
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-background px-4 py-4 text-sm font-medium transition hover:border-primary/50 hover:bg-primary/5"
                  htmlFor="completionMedia"
                >
                  <Upload className="size-4" />
                  Choose files
                </label>
                <Input
                  id="completionMedia"
                  accept="image/*,video/*"
                  className="hidden"
                  multiple
                  type="file"
                  onChange={(event) => {
                    const nextFiles = Array.from(event.target.files || [])
                    form.setValue('files', nextFiles, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                    event.target.value = ''
                  }}
                />
                {completionFiles.length > 0 && (
                  <div className="space-y-2">
                    {completionFiles.map((file, index) => (
                      <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                        <Button
                          size="icon"
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            form.setValue(
                              'files',
                              completionFiles.filter((_, fileIndex) => fileIndex !== index),
                              { shouldDirty: true, shouldValidate: true },
                            )
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FieldBlock>
          </BaseModalBody>
          <BaseModalFooter>
            <Button className="w-full sm:w-auto" disabled={!completionTarget || isSubmitting} type="submit">
              Mark quest complete
            </Button>
          </BaseModalFooter>
        </form>
      </BaseModalContent>
    </Dialog>
  )
}

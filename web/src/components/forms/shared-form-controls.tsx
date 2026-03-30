import { useRef, useState } from 'react'
import { Plus, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

import { api, ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import {
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@/components/ui/base-modal'
import { Input } from '@/components/ui/input'
import { fullEmojiSelection } from '@/components/forms/shared-form-options'

export function EmojiSelectorField({
  inputId,
  value,
  suggestions,
  onChange,
}: {
  inputId: string
  value: string
  suggestions: readonly string[]
  onChange: (value: string) => void
}) {
  const [showFullPicker, setShowFullPicker] = useState(false)

  return (
    <div className="space-y-3">
      <Input
        id={inputId}
        value={value}
        placeholder="Optional emoji"
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {suggestions.map((emoji) => (
          <Button
            key={`${inputId}-${emoji}`}
            type="button"
            size="sm"
            variant={value === emoji ? 'default' : 'outline'}
            onClick={() => onChange(value === emoji ? '' : emoji)}
          >
            {emoji}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Open full emoji picker"
          onClick={() => setShowFullPicker(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <Dialog open={showFullPicker} onOpenChange={setShowFullPicker}>
        <BaseModalContent size="md">
          <BaseModalHeader
            description="Pick any emoji to use as the icon for this item."
            descriptionClassName="max-w-[32rem]"
            spacing="compact"
            title="Choose an emoji"
          />
          <BaseModalBody className="grid max-h-[24rem] grid-cols-6 gap-2 sm:grid-cols-8" scrollable spacing="compact">
            {fullEmojiSelection.map((emoji) => (
              <Button
                key={`${inputId}-picker-${emoji}`}
                type="button"
                variant={value === emoji ? 'default' : 'outline'}
                className="h-11 text-lg"
                onClick={() => {
                  onChange(emoji)
                  setShowFullPicker(false)
                }}
              >
                {emoji}
              </Button>
            ))}
          </BaseModalBody>
          <BaseModalFooter className="justify-end" spacing="compact">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onChange('')
                setShowFullPicker(false)
              }}
            >
              Clear icon
            </Button>
          </BaseModalFooter>
        </BaseModalContent>
      </Dialog>
    </div>
  )
}

export function ColorPickerField({
  inputId,
  value,
  onChange,
}: {
  inputId: string
  value: string
  onChange: (value: string) => void
}) {
  const swatchValue = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : '#f43f5e'

  return (
    <div className="flex items-center gap-3">
      <input
        id={inputId}
        className="h-11 w-14 rounded-xl border border-border bg-transparent p-1"
        type="color"
        value={swatchValue}
        onChange={(event) => onChange(event.target.value)}
      />
      <Input
        value={value}
        placeholder="#f43f5e"
        onChange={(event) => onChange(event.target.value)}
      />
      <Button type="button" variant="ghost" onClick={() => onChange('')}>
        Clear
      </Button>
    </div>
  )
}

export function MediaAssetField({
  inputId,
  kind,
  value,
  onChange,
  placeholder,
  emptyLabel,
  compact = false,
}: {
  inputId: string
  kind: 'image' | 'video'
  value: string | null
  onChange: (value: string | null) => void
  placeholder: string
  emptyLabel: string
  compact?: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const accept = kind === 'image' ? 'image/*' : 'video/mp4,video/webm,video/quicktime'
  const frameClassName = compact ? 'max-w-2xl rounded-[1.3rem] p-3' : 'rounded-[1.5rem] p-4'
  const mediaClassName = compact ? 'aspect-[16/9] max-h-56 rounded-[1rem]' : 'aspect-[16/9] rounded-[1.25rem]'

  return (
    <div className="space-y-3">
      <div className={`border border-border/70 bg-[var(--surface-alt)] ${frameClassName}`}>
        {value ? (
          kind === 'image' ? (
            <img
              alt="Media preview"
              className={`w-full object-cover ${mediaClassName}`}
              src={value}
            />
          ) : (
            <video
              aria-label="Video preview"
              className={`w-full bg-black object-cover ${mediaClassName}`}
              controls
              loop
              muted
              playsInline
              src={value}
            />
          )
        ) : (
          <div className={`flex w-full items-center justify-center border border-dashed border-border/70 bg-background text-sm text-muted-foreground ${mediaClassName}`}>
            {emptyLabel}
          </div>
        )}
      </div>
      <Input
        id={inputId}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value.trim() || null)}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 size-4" />
          {value ? 'Replace file' : 'Choose file'}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" onClick={() => onChange(null)}>
            Remove media
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        Paste an absolute URL or upload a local {kind === 'image' ? 'image' : 'video'} file.
      </p>
      <input
        ref={fileInputRef}
        accept={accept}
        className="hidden"
        type="file"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''

          if (!file) {
            return
          }

          try {
            onChange(await readFileAsDataUrl(file))
          } catch {
            toast.error(`Unable to read ${kind} file`)
          }
        }}
      />
    </div>
  )
}

export function BackgroundMediaField({
  inputId,
  imageValue,
  imageSource,
  videoValue,
  videoSource,
  onChange,
}: {
  inputId: string
  imageValue: string | null
  imageSource: string | null
  videoValue: string | null
  videoSource: string | null
  onChange: (value: {
    imageValue: string | null
    imageSource: string | null
    videoValue: string | null
    videoSource: string | null
  }) => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const currentValue = videoValue ?? imageValue
  const hasCurrentMedia = Boolean(currentValue || videoSource || imageSource)

  return (
    <div className="space-y-3">
      <div className="max-w-2xl rounded-[1.3rem] border border-border/70 bg-[var(--surface-alt)] p-3">
        {currentValue ? (
          videoValue ? (
            <video
              aria-label="Backdrop media preview"
              className="aspect-[16/9] max-h-56 w-full rounded-[1rem] bg-black object-cover"
              controls
              loop
              muted
              playsInline
              src={videoValue}
            />
          ) : (
            <img
              alt="Backdrop media preview"
              className="aspect-[16/9] max-h-56 w-full rounded-[1rem] object-cover"
              src={imageValue ?? ''}
            />
          )
        ) : (
          <div className="flex aspect-[16/9] max-h-56 w-full items-center justify-center rounded-[1rem] border border-dashed border-border/70 bg-background text-sm text-muted-foreground">
            No backdrop media selected
          </div>
        )}
      </div>
      <Input
        id={inputId}
        value={currentValue ?? ''}
        placeholder="Paste an absolute image or video URL"
        onChange={(event) => onChange(classifyMediaValue(event.target.value.trim() || null))}
      />
      <div className="flex flex-wrap gap-3">
        <Button disabled={isUploading} type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 size-4" />
          {isUploading ? 'Uploading background...' : hasCurrentMedia ? 'Replace background' : 'Choose background'}
        </Button>
        {hasCurrentMedia ? (
          <Button
            disabled={isUploading}
            type="button"
            variant="ghost"
            onClick={() => onChange({
              imageValue: null,
              imageSource: null,
              videoValue: null,
              videoSource: null,
            })}
          >
            Remove background
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        Upload a single image or video file, or paste a direct URL. Videos stay muted and loop in the sign-in scene.
      </p>
      <input
        ref={fileInputRef}
        accept="image/*,video/mp4,video/webm,video/quicktime"
        className="hidden"
        type="file"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''

          if (!file) {
            return
          }

          try {
            setIsUploading(true)
            const uploaded = await api.uploadLoginBackgroundMedia(file)
            onChange(uploaded.mediaType === 'video'
              ? {
                  imageValue: null,
                  imageSource: null,
                  videoValue: uploaded.url,
                  videoSource: uploaded.source,
                }
              : {
                  imageValue: uploaded.url,
                  imageSource: uploaded.source,
                  videoValue: null,
                  videoSource: null,
                })
          } catch (error) {
            const message = error instanceof ApiError ? error.message : 'Unable to upload background media'
            toast.error(message)
          } finally {
            setIsUploading(false)
          }
        }}
      />
    </div>
  )
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function classifyMediaValue(value: string | null) {
  if (!value) {
    return {
      imageValue: null,
      imageSource: null,
      videoValue: null,
      videoSource: null,
    }
  }

  const normalized = value.toLowerCase()
  const isVideo = normalized.startsWith('data:video/')
    || /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(value)

  return isVideo
    ? {
        imageValue: null,
        imageSource: null,
        videoValue: value,
        videoSource: value,
      }
    : {
        imageValue: value,
        imageSource: value,
        videoValue: null,
        videoSource: null,
      }
}

import { useRef, useState } from 'react'
import { UserRound } from 'lucide-react'
import Cropper, { type Area } from 'react-easy-crop'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import {
  Dialog,
} from '@/components/ui/dialog'
import {
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@/components/ui/base-modal'

const avatarSize = 256

interface AvatarCropFieldProps {
  value: string | null
  fallbackValue?: string | null
  onChange: (value: string | null) => void
}

export function AvatarCropField({
  value,
  fallbackValue = null,
  onChange,
}: AvatarCropFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [draftImage, setDraftImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const resolvedValue = value ?? fallbackValue

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-[var(--surface-alt)]">
          {resolvedValue ? (
            <img alt="Avatar preview" className="h-full w-full object-cover" src={resolvedValue} />
          ) : (
            <UserRound className="size-10 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              {resolvedValue ? 'Replace avatar' : 'Choose avatar'}
            </Button>
            {value && (
              <Button type="button" variant="ghost" onClick={() => onChange(null)}>
                Remove avatar
              </Button>
            )}
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            Optional. Crop to a square so the overview and player chips always stay consistent.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        type="file"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''

          if (!file) {
            return
          }

          try {
            setCrop({ x: 0, y: 0 })
            setZoom(1)
            setDraftImage(await readFileAsDataUrl(file))
          } catch {
            toast.error('Unable to read avatar image')
          }
        }}
      />

      <Dialog
        open={Boolean(draftImage)}
        onOpenChange={(open) => {
          if (!open) {
            setDraftImage(null)
            setCroppedAreaPixels(null)
          }
        }}
      >
        <BaseModalContent size="lg">
          <BaseModalHeader
            title="Crop avatar"
            description="Center the subject so the avatar still reads well at small sizes."
          />
          <BaseModalBody className="space-y-4">
            <div className="relative h-[24rem] overflow-hidden rounded-[1.5rem] bg-black/80">
              {draftImage && (
                <Cropper
                  aspect={1}
                  crop={crop}
                  cropShape="round"
                  image={draftImage}
                  showGrid={false}
                  zoom={zoom}
                  onCropChange={setCrop}
                  onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                  onZoomChange={setZoom}
                />
              )}
            </div>
            <label className="block space-y-2 text-sm font-medium">
              Zoom
              <input
                className="w-full"
                max={3}
                min={1}
                step={0.05}
                type="range"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
            </label>
          </BaseModalBody>
          <BaseModalFooter>
            <Button type="button" variant="outline" onClick={() => setDraftImage(null)}>
              Cancel
            </Button>
            <Button
              disabled={!draftImage || !croppedAreaPixels || isSaving}
              type="button"
              onClick={async () => {
                if (!draftImage || !croppedAreaPixels) {
                  return
                }

                try {
                  setIsSaving(true)
                  onChange(await createCroppedAvatar(draftImage, croppedAreaPixels))
                  setDraftImage(null)
                  toast.success('Avatar updated')
                } catch {
                  toast.error('Unable to crop avatar')
                } finally {
                  setIsSaving(false)
                }
              }}
            >
              Save avatar
            </Button>
          </BaseModalFooter>
        </BaseModalContent>
      </Dialog>
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

async function createCroppedAvatar(source: string, crop: Area) {
  const image = await loadImage(source)
  const canvas = document.createElement('canvas')
  canvas.width = avatarSize
  canvas.height = avatarSize

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is unavailable')
  }

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    avatarSize,
    avatarSize,
  )

  return canvas.toDataURL('image/jpeg', 0.92)
}

async function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load image'))
    image.src = source
  })
}

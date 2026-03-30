import { useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import {
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@/components/ui/base-modal'

const loginImageAspect = 5 / 4
const loginImageWidth = 1280
const loginImageHeight = 1024

interface LoginImageCropFieldProps {
  value: string | null
  onChange: (value: string | null) => void
}

export function LoginImageCropField({ value, onChange }: LoginImageCropFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [draftImage, setDraftImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  return (
    <div className="space-y-3">
      <div className="max-w-2xl rounded-[1.3rem] border border-border/70 bg-[var(--surface-alt)] p-3">
        {value ? (
          <img
            alt="Login hero preview"
            className="aspect-[5/4] max-h-72 w-full rounded-[1rem] object-cover"
            src={value}
          />
        ) : (
          <div className="flex aspect-[5/4] max-h-72 w-full items-center justify-center rounded-[1rem] border border-dashed border-border/70 bg-background text-sm text-muted-foreground">
            No login image selected
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          {value ? 'Replace image' : 'Choose image'}
        </Button>
        {value && (
          <Button type="button" variant="ghost" onClick={() => onChange(null)}>
            Remove image
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Crop area: 5:4 hero frame. The image is resized before save so the login page gets a consistent layout.
      </p>
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
            const nextImage = await readFileAsDataUrl(file)
            setCrop({ x: 0, y: 0 })
            setZoom(1)
            setDraftImage(nextImage)
          } catch {
            toast.error('Unable to read image file')
          }
        }}
      />

      <Dialog open={Boolean(draftImage)} onOpenChange={(open) => {
        if (!open) {
          setDraftImage(null)
          setCroppedAreaPixels(null)
        }
      }}>
        <BaseModalContent size="xl">
          <BaseModalHeader
            title="Crop login image"
            description="Position the image so it fits the login hero panel cleanly on desktop and mobile."
          />
          <BaseModalBody className="space-y-4">
            <div className="relative h-[26rem] overflow-hidden rounded-[1.5rem] bg-black/80">
              {draftImage && (
                <Cropper
                  aspect={loginImageAspect}
                  crop={crop}
                  image={draftImage}
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
                  const croppedImage = await createCroppedImage(draftImage, croppedAreaPixels)
                  onChange(croppedImage)
                  setDraftImage(null)
                  toast.success('Login image updated')
                } catch {
                  toast.error('Unable to crop image')
                } finally {
                  setIsSaving(false)
                }
              }}
            >
              Save crop
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

async function createCroppedImage(source: string, crop: Area) {
  const image = await loadImage(source)
  const canvas = document.createElement('canvas')
  canvas.width = loginImageWidth
  canvas.height = loginImageHeight

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
    loginImageWidth,
    loginImageHeight,
  )

  return canvas.toDataURL('image/jpeg', 0.9)
}

async function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load image'))
    image.src = source
  })
}

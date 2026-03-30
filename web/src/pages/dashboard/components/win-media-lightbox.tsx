import { Download } from 'lucide-react'

import type { ActivityMediaItem } from '@/types/app'
import { RefreshableImage } from '@/components/previews/refreshable-image'
import { RefreshableVideo } from '@/components/previews/refreshable-video'
import {
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@/components/ui/base-modal'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { api } from '@/api/client'
import { formatFileSize } from '../utils'

interface WinMediaLightboxProps {
  media: ActivityMediaItem | null
  open: boolean
  taskTitle: string
  onOpenChange: (open: boolean) => void
}

export function WinMediaLightbox({
  media,
  open,
  taskTitle,
  onOpenChange,
}: WinMediaLightboxProps) {
  if (!media) {
    return null
  }

  const displayTitle = media.originalName?.trim() || `${taskTitle} media`
  const mediaMetadata = [media.mimeType, media.sizeBytes ? formatFileSize(media.sizeBytes) : null]
    .filter(Boolean)
    .join(' • ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseModalContent size="xl">
        <BaseModalHeader
          description="View the original media at full size and save a fresh copy when you need it."
          descriptionClassName="max-w-2xl"
          spacing="compact"
          title={displayTitle}
          titleClassName="break-words"
        />

        <BaseModalBody className="flex min-h-0 flex-1 flex-col" spacing="compact">
          <div className="flex h-full min-h-[18rem] items-center justify-center overflow-hidden rounded-[1.6rem] border border-border/60 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(249,225,233,0.92))] p-2 sm:min-h-[24rem] sm:p-4">
            {media.mediaType === 'video' ? (
              <RefreshableVideo
                className="max-h-[72dvh] w-full rounded-[1.2rem] bg-black object-contain"
                controls
                playsInline
                poster={media.thumbnailUrl}
                posterAsset={media.thumbnailAsset}
                preload="metadata"
                src={media.fullUrl}
                srcAsset={media.fullAsset}
              />
            ) : (
              <RefreshableImage
                alt={displayTitle}
                asset={media.fullAsset}
                className="max-h-[72dvh] w-full rounded-[1.2rem] object-contain"
                loading="eager"
                src={media.fullUrl}
              />
            )}
          </div>
        </BaseModalBody>

        <BaseModalFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" spacing="compact">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{mediaMetadata || 'Original media file'}</p>
          </div>
          <Button asChild className="w-full sm:w-auto" size="lg">
            <a
              download
              href={api.getTaskRunMediaDownloadUrl(media.id)}
              rel="noreferrer"
              target="_blank"
            >
              <Download />
              Download original
            </a>
          </Button>
        </BaseModalFooter>
      </BaseModalContent>
    </Dialog>
  )
}

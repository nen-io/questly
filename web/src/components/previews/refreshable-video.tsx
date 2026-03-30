import { useEffectEvent, type SyntheticEvent, type VideoHTMLAttributes } from 'react'

import { useRefreshableAsset } from '@/hooks/use-refreshable-asset'
import type { RefreshableAssetRef } from '@/types/app'

interface RefreshableVideoProps extends Omit<VideoHTMLAttributes<HTMLVideoElement>, 'poster' | 'src'> {
  src: string | null
  srcAsset?: RefreshableAssetRef | null
  poster?: string | null
  posterAsset?: RefreshableAssetRef | null
}

export function RefreshableVideo({
  src,
  srcAsset,
  poster,
  posterAsset,
  onError,
  ...props
}: RefreshableVideoProps) {
  const { resolvedUrl, refreshUrl } = useRefreshableAsset(src, srcAsset)
  const { resolvedUrl: resolvedPosterUrl } = useRefreshableAsset(poster, posterAsset)

  const handleError = useEffectEvent((event: SyntheticEvent<HTMLVideoElement, Event>) => {
    onError?.(event)
    void refreshUrl()
  })

  if (!resolvedUrl) {
    return null
  }

  return (
    <video
      {...props}
      onError={handleError}
      poster={resolvedPosterUrl ?? undefined}
      src={resolvedUrl}
    />
  )
}

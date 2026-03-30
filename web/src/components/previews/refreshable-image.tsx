import { useEffectEvent, type ImgHTMLAttributes, type SyntheticEvent } from 'react'

import { useRefreshableAsset } from '@/hooks/use-refreshable-asset'
import type { RefreshableAssetRef } from '@/types/app'

interface RefreshableImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null
  asset?: RefreshableAssetRef | null
}

export function RefreshableImage({
  src,
  asset,
  onError,
  ...props
}: RefreshableImageProps) {
  const { resolvedUrl, refreshUrl } = useRefreshableAsset(src, asset)

  const handleError = useEffectEvent((event: SyntheticEvent<HTMLImageElement, Event>) => {
    onError?.(event)
    void refreshUrl()
  })

  if (!resolvedUrl) {
    return null
  }

  return (
    <img
      {...props}
      onError={handleError}
      src={resolvedUrl}
    />
  )
}

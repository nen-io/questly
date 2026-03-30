import { useEffect, useEffectEvent, useRef, useState } from 'react'

import { api } from '@/api/client'
import type { RefreshableAssetRef } from '@/types/app'

const serializeAsset = (asset: RefreshableAssetRef | null | undefined) => (
  asset ? JSON.stringify(asset) : ''
)

export function useRefreshableAsset(
  initialUrl: string | null | undefined,
  asset: RefreshableAssetRef | null | undefined,
) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(initialUrl ?? null)
  const attemptedUrlRef = useRef<string | null>(null)
  const refreshInFlightRef = useRef(false)
  const assetKey = serializeAsset(asset)

  useEffect(() => {
    setResolvedUrl(initialUrl ?? null)
    attemptedUrlRef.current = null
  }, [assetKey, initialUrl])

  const refreshUrl = useEffectEvent(async () => {
    if (!asset || !resolvedUrl || refreshInFlightRef.current || attemptedUrlRef.current === resolvedUrl) {
      return
    }

    // Signed S3 URLs can legitimately expire while the dashboard stays open.
    // Retry once for the current URL, then allow future retries after a new
    // signed URL is issued and becomes the current value.
    attemptedUrlRef.current = resolvedUrl
    refreshInFlightRef.current = true

    try {
      const refreshed = await api.refreshAsset(asset)
      setResolvedUrl(refreshed.url)
    } catch {
      // Keep the broken URL in place when refresh fails so the UI stays stable.
    } finally {
      refreshInFlightRef.current = false
    }
  })

  return {
    resolvedUrl,
    refreshUrl,
  }
}

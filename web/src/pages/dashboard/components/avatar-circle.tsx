import { UserRound } from 'lucide-react'
import type { RefreshableAssetRef } from '@/types/app'
import { useRefreshableAsset } from '@/hooks/use-refreshable-asset'

export function AvatarCircle({
  avatarUrl,
  avatarAsset = null,
  name,
  sizeClassName,
  showIndicator = false,
}: {
  avatarUrl: string | null
  avatarAsset?: RefreshableAssetRef | null
  name: string
  sizeClassName?: string
  showIndicator?: boolean
}) {
  const { resolvedUrl, refreshUrl } = useRefreshableAsset(avatarUrl, avatarAsset)

  return (
    <div className={`relative rounded-full border border-white/60 bg-background ${sizeClassName || 'size-10'}`}>
      {resolvedUrl ? (
        <img
          alt={name}
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
          src={resolvedUrl}
          onError={() => {
            void refreshUrl()
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--surface-alt)] text-muted-foreground">
          <UserRound className="size-5" />
        </div>
      )}
      {showIndicator ? <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-emerald-500" /> : null}
    </div>
  )
}

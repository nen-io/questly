export interface AvatarAssetRef {
  kind: 'avatar'
  userId: number
}

export type ContentMediaSlot = 'login_background_image' | 'login_background_video'

export interface ContentMediaAssetRef {
  kind: 'content_media'
  slot: ContentMediaSlot
}

export interface TaskRunMediaAssetRef {
  kind: 'task_run_media'
  mediaId: number
  variant: 'full' | 'thumbnail'
}

export type RefreshableAssetRef = AvatarAssetRef | ContentMediaAssetRef | TaskRunMediaAssetRef

export interface RefreshedAsset {
  asset: RefreshableAssetRef
  url: string | null
}

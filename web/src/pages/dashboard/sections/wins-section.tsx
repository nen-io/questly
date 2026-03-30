import { useEffect, useState } from 'react'
import { Film, Search } from 'lucide-react'

import type { ActivityComment, ActivityMediaItem, ActivityRun, PlatformPlayer } from '@/types/app'
import { FieldBlock } from '@/components/forms/field-block'
import { RefreshableImage } from '@/components/previews/refreshable-image'
import { RefreshableVideo } from '@/components/previews/refreshable-video'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { getFormErrorMessage } from '@/lib/form-errors'
import type { UseFormReturn } from 'react-hook-form'
import {
  AttributePillList,
  AvatarCircle,
  CommentRow,
  EmptyState,
  ListSkeleton,
  PaginationBar,
  WinMediaLightbox,
} from '../components'
import { ensureArray, formatDateTime } from '../utils'

interface WinsSectionProps {
  winsSearch: string
  winsPlayerFilter: string
  filterablePlayers: PlatformPlayer[]
  winResults: ActivityRun[]
  winsIsLoading: boolean
  winsPage: number
  winsTotalPages: number
  selectedRunId: number | null
  selectedRun: ActivityRun | null
  activityMedia: ActivityMediaItem[]
  activityMediaIsLoading: boolean
  selectedMediaId: number | null
  activityComments: ActivityComment[]
  activityCommentsIsLoading: boolean
  activityCommentsPage: number
  activityCommentsTotalPages: number
  activityCommentsTotal: number
  commentForm: UseFormReturn<{ body: string }>
  isAddingComment: boolean
  onWinsSearchChange: (value: string) => void
  onWinsPlayerFilterChange: (value: string) => void
  onRunSelect: (runId: number) => void
  onWinsPageChange: (page: number) => void
  onMediaSelect: (mediaId: number) => void
  onCommentsPageChange: (page: number) => void
  onCommentSubmit: (values: { body: string }) => void
}

export function WinsSection({
  winsSearch,
  winsPlayerFilter,
  filterablePlayers,
  winResults,
  winsIsLoading,
  winsPage,
  winsTotalPages,
  selectedRunId,
  selectedRun,
  activityMedia,
  activityMediaIsLoading,
  selectedMediaId,
  activityComments,
  activityCommentsIsLoading,
  activityCommentsPage,
  activityCommentsTotalPages,
  activityCommentsTotal,
  commentForm,
  isAddingComment,
  onWinsSearchChange,
  onWinsPlayerFilterChange,
  onRunSelect,
  onWinsPageChange,
  onMediaSelect,
  onCommentsPageChange,
  onCommentSubmit,
}: WinsSectionProps) {
  const selectedMedia = activityMedia.find((item) => item.id === selectedMediaId) || activityMedia[0] || null
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  useEffect(() => {
    setIsLightboxOpen(false)
  }, [selectedRunId])

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Wins</CardTitle>
            <CardDescription>See everyone’s completions, filter by player, and search the shared history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search wins by quest, note, or player"
                  value={winsSearch}
                  onChange={(event) => onWinsSearchChange(event.target.value)}
                />
              </div>
              <Select value={winsPlayerFilter} onValueChange={onWinsPlayerFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by player" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All players</SelectItem>
                  {filterablePlayers.map((player) => (
                    <SelectItem key={player.id} value={String(player.id)}>
                      {player.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {winsIsLoading && winResults.length === 0 ? (
              <ListSkeleton rows={4} />
            ) : winResults.length > 0 ? (
              <>
                <div className="space-y-3">
                  {winResults.map((run) => (
                    <button
                      key={run.id}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selectedRunId === run.id ? 'border-primary bg-primary/5' : 'border-border/70 hover:border-primary/40'
                      }`}
                      type="button"
                      onClick={() => onRunSelect(run.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <AvatarCircle
                            avatarAsset={run.playerAvatarAsset}
                            avatarUrl={run.playerAvatarUrl}
                            name={run.playerName}
                            sizeClassName="size-11"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{run.taskTitle}</p>
                            <p className="truncate text-sm text-muted-foreground">{run.playerName}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDateTime(run.resolvedAt)}</span>
                      </div>
                      {run.notes && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{run.notes}</p>}
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{run.mediaCount} media</span>
                        {run.pendingMediaCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{run.pendingMediaCount} processing</span>
                          </>
                        )}
                        <span>•</span>
                        <span>
                          {ensureArray(run.pointSnapshot).length}{' '}
                          {ensureArray(run.pointSnapshot).length === 1 ? 'kudos update' : 'kudos updates'}
                        </span>
                      </div>
                      {ensureArray(run.pointSnapshot).length > 0 ? (
                        <AttributePillList
                          className="mt-3"
                          entries={ensureArray(run.pointSnapshot)}
                          valueMode="signed"
                        />
                      ) : null}
                      {run.previewMedia.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                          {run.previewMedia.map((media) => (
                            <div
                              key={media.id}
                              className="relative size-14 shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-[var(--surface-alt)]"
                            >
                              <RefreshableImage
                                alt={media.originalName || `${run.taskTitle} preview`}
                                asset={media.thumbnailAsset}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                src={media.thumbnailUrl}
                              />
                              {media.mediaType === 'video' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                                  <Film className="size-4" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <PaginationBar
                  page={winsPage}
                  totalPages={winsTotalPages}
                  onPageChange={onWinsPageChange}
                />
              </>
            ) : (
              <EmptyState message="No wins match this search yet." />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Win details</CardTitle>
            <CardDescription>View the full media set and talk about the moment together.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedRun ? (
              <>
                <div className="rounded-[1.5rem] border border-border/70 bg-[var(--surface-alt)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <AvatarCircle
                        avatarAsset={selectedRun.playerAvatarAsset}
                        avatarUrl={selectedRun.playerAvatarUrl}
                        name={selectedRun.playerName}
                        sizeClassName="size-12"
                      />
                      <div>
                        <p className="font-semibold">{selectedRun.taskTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedRun.playerName} • {formatDateTime(selectedRun.resolvedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{selectedRun.mediaCount} media item(s)</Badge>
                      {selectedRun.pendingMediaCount > 0 ? (
                        <Badge variant="outline">{selectedRun.pendingMediaCount} processing</Badge>
                      ) : null}
                    </div>
                  </div>
                  {selectedRun.notes && (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{selectedRun.notes}</p>
                  )}
                  {ensureArray(selectedRun.pointSnapshot).length > 0 && (
                    <AttributePillList
                      className="mt-4"
                      entries={ensureArray(selectedRun.pointSnapshot)}
                      valueMode="signed"
                    />
                  )}
                </div>

                {selectedRun.pendingMediaCount > 0 ? (
                  <div className="rounded-[1.25rem] border border-border/70 bg-[var(--surface-alt)] px-4 py-3 text-sm text-muted-foreground">
                    Attachment processing is still running in the background. Media will appear here automatically as soon as the server finishes it.
                  </div>
                ) : null}

                {activityMedia.length > 0 && selectedMedia && (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-black/5">
                      {selectedMedia.mediaType === 'video' ? (
                        <RefreshableVideo
                          className="aspect-video w-full bg-black object-contain"
                          controls
                          playsInline
                          posterAsset={selectedMedia.thumbnailAsset}
                          poster={selectedMedia.thumbnailUrl}
                          preload="metadata"
                          srcAsset={selectedMedia.fullAsset}
                          src={selectedMedia.fullUrl}
                        />
                      ) : (
                        <button
                          aria-label={`Open ${selectedMedia.originalName || `${selectedRun.taskTitle} media`} full size`}
                          className="block w-full cursor-zoom-in bg-transparent"
                          type="button"
                          onClick={() => setIsLightboxOpen(true)}
                        >
                          <RefreshableImage
                            alt={selectedMedia.originalName || `${selectedRun.taskTitle} media`}
                            asset={selectedMedia.fullAsset}
                            className="max-h-[28rem] w-full object-contain"
                            loading="lazy"
                            src={selectedMedia.fullUrl}
                          />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {activityMedia.map((media) => (
                        <button
                          key={media.id}
                          className={`relative size-20 shrink-0 overflow-hidden rounded-2xl border transition ${
                            selectedMedia.id === media.id ? 'border-primary ring-2 ring-primary/30' : 'border-border/70'
                          }`}
                          type="button"
                          onClick={() => onMediaSelect(media.id)}
                        >
                          <RefreshableImage
                            alt={media.originalName || 'Media preview'}
                            asset={media.thumbnailAsset}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            src={media.thumbnailUrl}
                          />
                          {media.mediaType === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                              <Film className="size-4" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activityMediaIsLoading && activityMedia.length === 0 && (
                  <div className="space-y-3">
                    <Skeleton className="h-72 rounded-[1.5rem]" />
                    <div className="flex gap-2">
                      <Skeleton className="size-20 rounded-2xl" />
                      <Skeleton className="size-20 rounded-2xl" />
                      <Skeleton className="size-20 rounded-2xl" />
                    </div>
                  </div>
                )}

                {!activityMediaIsLoading && activityMedia.length === 0 && (
                  <div className="rounded-[1.5rem] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                    No media attached to this win yet.
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Comments</p>
                    <span className="text-sm text-muted-foreground">{activityCommentsTotal} total</span>
                  </div>
                  {activityCommentsIsLoading && activityComments.length === 0 ? (
                    <ListSkeleton rows={3} />
                  ) : activityComments.length > 0 ? (
                    <div className="space-y-3">
                      {activityComments.map((comment) => (
                        <CommentRow key={comment.id} comment={comment} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No comments yet. Start the conversation." />
                  )}
                  <PaginationBar
                    compact
                    page={activityCommentsPage}
                    totalPages={activityCommentsTotalPages}
                    onPageChange={onCommentsPageChange}
                  />
                </div>

                <form className="space-y-3" onSubmit={commentForm.handleSubmit(onCommentSubmit)}>
                  <FieldBlock error={getFormErrorMessage(commentForm.formState.errors.body)} label="Add a comment">
                    <Textarea
                      placeholder="Leave a comment on this win"
                      aria-invalid={Boolean(commentForm.formState.errors.body)}
                      {...commentForm.register('body')}
                    />
                  </FieldBlock>
                  <Button disabled={isAddingComment} type="submit">
                    Add comment
                  </Button>
                </form>
              </>
            ) : (
              <EmptyState message="Select a win to see the media gallery and comments." />
            )}
          </CardContent>
        </Card>
      </div>

      <WinMediaLightbox
        media={selectedMedia?.mediaType === 'image' ? selectedMedia : null}
        open={Boolean(selectedMedia && selectedMedia.mediaType === 'image' && isLightboxOpen)}
        taskTitle={selectedRun?.taskTitle || 'Win'}
        onOpenChange={setIsLightboxOpen}
      />
    </>
  )
}

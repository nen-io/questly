import { Archive, ArrowLeft, ArrowRight, Pencil, Search, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function ManageEntityListCard({
  activeEditId,
  deleteDisabled,
  emptyMessage,
  isLoading,
  items,
  page,
  searchValue,
  totalPages,
  onDelete,
  onEdit,
  onPageChange,
  onSearchChange,
  onToggleVisibility,
  title,
}: {
  activeEditId: number | null
  deleteDisabled?: boolean
  emptyMessage: string
  isLoading?: boolean
  items: Array<{
    id: number
    title: string
    detail: string
    meta: string[]
    color: string | null
    icon: string | null
    isActive: boolean
  }>
  page: number
  searchValue: string
  totalPages: number
  onDelete: (id: number) => void
  onEdit: (id: number) => void
  onPageChange: (page: number) => void
  onSearchChange: (value: string) => void
  onToggleVisibility: (id: number, nextActive: boolean) => void
  title: string
}) {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            className="pl-9"
            placeholder={`Search ${title.toLowerCase()}`}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        {isLoading && items.length === 0 && (
          <div className="space-y-3">
            <div className="h-28 rounded-2xl border border-border/70 bg-[var(--surface-alt)]/60" />
            <div className="h-28 rounded-2xl border border-border/70 bg-[var(--surface-alt)]/60" />
          </div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-border/70 p-4"
            style={item.color ? {
              backgroundImage: `linear-gradient(145deg, color-mix(in srgb, ${item.color} 14%, white), var(--card))`,
            } : undefined}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-xl shadow-sm"
                  style={item.color ? { boxShadow: `inset 0 0 0 2px ${item.color}` } : undefined}
                >
                  <span className="emoji-glyph">{item.icon || '•'}</span>
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.isActive ? 'default' : 'secondary'}>
                  {item.isActive ? 'Visible' : 'Hidden'}
                </Badge>
                {item.color ? (
                  <Badge variant="outline" style={{ borderColor: item.color, color: item.color }}>
                    {item.color}
                  </Badge>
                ) : null}
                {activeEditId === item.id && <Badge variant="outline">Editing</Badge>}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item.id)}>
                <Pencil className="mr-2 size-4" />
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onToggleVisibility(item.id, !item.isActive)}
              >
                <Archive className="mr-2 size-4" />
                {item.isActive ? 'Hide' : 'Show'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={deleteDisabled}
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
            </div>
            {item.meta.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.meta.map((value) => (
                  <Badge key={`${item.id}-${value}`} variant="secondary">{value}</Badge>
                ))}
              </div>
            )}
          </div>
        ))}
        {totalPages > 1 ? (
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ArrowLeft className="mr-2 size-4" />
              Previous
            </Button>
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
            <Button type="button" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Next
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

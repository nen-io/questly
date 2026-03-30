import { Search } from 'lucide-react'

import type { SessionData } from '@/types/app'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function CatalogToolbar({
  categories,
  description,
  searchPlaceholder,
  selectedCategoryIds,
  title,
  value,
  onCategoryToggle,
  onClear,
  onChange,
}: {
  categories: SessionData['balances']
  description: string
  searchPlaceholder: string
  selectedCategoryIds: number[]
  title: string
  value: string
  onCategoryToggle: (categoryId: number) => void
  onClear: () => void
  onChange: (value: string) => void
}) {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={searchPlaceholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {categories.map((category) => {
            const isActive = selectedCategoryIds.includes(category.categoryId)

            return (
              <button
                key={`catalog-filter-${category.categoryId}`}
                type="button"
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive ? 'border-transparent text-white shadow-sm' : 'border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
                style={isActive ? { backgroundColor: category.color } : undefined}
                onClick={() => onCategoryToggle(category.categoryId)}
              >
                {category.icon ? <span className="emoji-glyph">{category.icon}</span> : null}
                {category.icon ? ' ' : ''}
                {category.name}
              </button>
            )
          })}
          {(value || selectedCategoryIds.length > 0) ? (
            <Button type="button" variant="ghost" onClick={onClear}>
              Clear filters
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

import { type UseFormReturn } from 'react-hook-form'
import { Trash2 } from 'lucide-react'

import { AttributeCoreFields } from '@/components/attributes/attribute-core-fields'
import { FieldBlock } from '@/components/forms/field-block'
import { PlayerBalancesInlineForm } from '@/components/admin-studio/player-balances-inline-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { getFormErrorMessage } from '@/lib/form-errors'
import type { AdminBootstrap } from '@/types/app'

export function AdminStudioCategoriesSection({
  bootstrap,
  players,
  playerBalancesById,
  categoryForm,
  createCategoryPending,
  updateCategoryPending,
  deleteCategoryPending,
  updatePlayerBalancesPending,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  onUpdatePlayerBalances,
}: {
  bootstrap: AdminBootstrap
  players: Array<AdminBootstrap['players'][number]>
  playerBalancesById: Map<number, AdminBootstrap['players'][number]['balances']>
  categoryForm: UseFormReturn<any>
  createCategoryPending: boolean
  updateCategoryPending: boolean
  deleteCategoryPending: boolean
  updatePlayerBalancesPending: boolean
  onCreateCategory: (values: { name: string; description: string; color: string; icon: string }) => void
  onEditCategory: (categoryId: number) => void
  onDeleteCategory: (categoryId: number) => void
  onUpdatePlayerBalances: (playerId: number, balances: Array<{ categoryId: number; balance: string }>) => Promise<unknown>
}) {
  return (
    <div className="space-y-4">
      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Create kudos track</CardTitle>
          <CardDescription>Kudos power quests, rewards, filters, and each player’s running totals.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={categoryForm.handleSubmit((values) => onCreateCategory(values))}
          >
            <AttributeCoreFields
              form={categoryForm}
              nameInputId="categoryName"
              colorInputId="categoryColor"
              iconInputId="categoryIcon"
            />
            <FieldBlock error={getFormErrorMessage(categoryForm.formState.errors.description)} htmlFor="categoryDescription" label="Description" tooltip="Explain what this kudos track represents so admins can use it consistently across quests and rewards.">
              <Textarea
                id="categoryDescription"
                aria-invalid={Boolean(categoryForm.formState.errors.description)}
                {...categoryForm.register('description')}
              />
            </FieldBlock>
            <div className="md:col-span-2">
              <Button disabled={createCategoryPending} type="submit">
                Add kudos track
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Current kudos tracks</CardTitle>
          <CardDescription>Editing only changes the kudos track's name, icon, and color. Quests, rewards, and balances continue to use the underlying kudos track ID.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {bootstrap.categories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
              No kudos tracks created yet.
            </div>
          ) : bootstrap.categories.map((category) => (
            <div key={category.id} className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 p-4">
              <div className="min-w-0 space-y-2">
                <Badge
                  className="rounded-full px-4 py-2"
                  style={{ backgroundColor: category.color, color: '#ffffff' }}
                >
                  {category.icon ? `${category.icon} ` : ''}
                  {category.name}
                </Badge>
                <p className="text-xs text-muted-foreground">{category.color}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={updateCategoryPending || deleteCategoryPending}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => onEditCategory(category.id)}
                >
                  Edit
                </Button>
                <Button
                  disabled={updateCategoryPending || deleteCategoryPending}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => onDeleteCategory(category.id)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Player kudos totals</CardTitle>
          <CardDescription>Adjust each player’s live kudos totals in the same place the kudos system is configured.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {players.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
              Add players first to start tracking kudos totals.
            </div>
          ) : (
            players.map((player) => (
              <div key={`attribute-balances-${player.id}`} className="rounded-2xl border border-border/70 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{player.displayName}</p>
                    <p className="text-sm text-muted-foreground">@{player.username}</p>
                  </div>
                  <Badge variant="secondary">{player.online ? 'Online' : 'Offline'}</Badge>
                </div>
                <PlayerBalancesInlineForm
                  balances={playerBalancesById.get(player.id)}
                  isPending={updatePlayerBalancesPending}
                  onSubmit={(balances) => onUpdatePlayerBalances(player.id, balances)}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

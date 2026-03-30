import type { UseFormReturn } from 'react-hook-form'
import type { RefreshableAssetRef } from '@/types/app'

import { AvatarCropField } from '@/components/avatar-crop-field'
import { FieldBlock } from '@/components/forms/field-block'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getFormErrorMessage } from '@/lib/form-errors'

import { AvatarCircle } from './avatar-circle'
import { formatDateTime } from '../utils/format-date-time'

export function PlayerSettingsPanel({
  role,
  displayName,
  avatarUrl,
  avatarAsset = null,
  avatarDraft,
  email,
  emailVerifiedAt,
  emailSettingsForm,
  showAvatarActions,
  isAvatarSaving,
  isEmailSaving,
  isRequestingVerification,
  onAvatarChange,
  onAvatarReset,
  onAvatarSave,
  onEmailSave,
  onSendVerification,
}: {
  role: 'admin' | 'player'
  displayName: string
  avatarUrl: string | null
  avatarAsset?: RefreshableAssetRef | null
  avatarDraft: string | null
  email: string | null
  emailVerifiedAt: string | null
  emailSettingsForm: UseFormReturn<{
    email: string
    emailNotificationsEnabled: boolean
    inAppNotificationsEnabled: boolean
  }>
  showAvatarActions: boolean
  isAvatarSaving: boolean
  isEmailSaving: boolean
  isRequestingVerification: boolean
  onAvatarChange: (value: string | null) => void
  onAvatarReset: () => void
  onAvatarSave: () => void
  onEmailSave: (values: {
    email: string
    emailNotificationsEnabled: boolean
    inAppNotificationsEnabled: boolean
  }) => void
  onSendVerification: () => void
}) {
  const settingsLabel = role === 'player' ? 'Player settings' : 'Account settings'

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="rounded-[1.9rem]">
        <CardHeader>
          <CardTitle>{settingsLabel}</CardTitle>
          <CardDescription>Keep the account card sharp without cramming these controls into the overview.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-4 rounded-[1.5rem] border border-border/70 bg-[var(--surface-alt)] p-5 sm:flex-row sm:items-center">
            <AvatarCircle
              avatarAsset={avatarDraft ? null : avatarAsset}
              avatarUrl={avatarDraft ?? avatarUrl}
              name={displayName}
              sizeClassName="size-20"
            />
            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground">{displayName}</p>
              <p className="text-sm text-muted-foreground">{email || 'No email saved yet'}</p>
              <div className="inline-flex rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground">
                {emailVerifiedAt ? `Verified ${formatDateTime(emailVerifiedAt)}` : email ? 'Verification pending' : 'Email not added'}
              </div>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-background p-5">
            <div className="mb-4">
              <p className="text-base font-semibold text-foreground">Avatar</p>
              <p className="mt-1 text-sm text-muted-foreground">Crop a new profile image and preview it before saving.</p>
            </div>
            <AvatarCropField value={avatarDraft ?? avatarUrl} onChange={onAvatarChange} />
            {showAvatarActions ? (
              <div className="mt-4 flex flex-wrap gap-3">
                <Button disabled={isAvatarSaving} type="button" onClick={onAvatarSave}>
                  {isAvatarSaving ? 'Saving avatar...' : 'Save avatar'}
                </Button>
                <Button disabled={isAvatarSaving} type="button" variant="outline" onClick={onAvatarReset}>
                  Revert
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.9rem]">
        <CardHeader>
          <CardTitle>Email and notifications</CardTitle>
          <CardDescription>Add an address, update it later, and control how the cabinet reaches you.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={emailSettingsForm.handleSubmit(onEmailSave)}>
            <FieldBlock
              error={getFormErrorMessage(emailSettingsForm.formState.errors.email)}
              htmlFor="profileEmail"
              label="Email"
            >
              <Input
                id="profileEmail"
                type="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(emailSettingsForm.formState.errors.email)}
                {...emailSettingsForm.register('email')}
              />
            </FieldBlock>
            <label className="flex items-center gap-3 rounded-2xl border border-border/70 px-3 py-3">
              <input type="checkbox" {...emailSettingsForm.register('emailNotificationsEnabled')} />
              <span>Email notifications</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border/70 px-3 py-3">
              <input type="checkbox" {...emailSettingsForm.register('inAppNotificationsEnabled')} />
              <span>Live toast alerts</span>
            </label>
            <div className="rounded-[1.35rem] border border-border/70 bg-[var(--surface-alt)] px-4 py-3 text-sm text-muted-foreground">
              {emailVerifiedAt
                ? `Verified on ${formatDateTime(emailVerifiedAt)}`
                : email
                  ? 'Verification pending. Send another verification email if needed.'
                  : 'No email saved'}
            </div>
            <div className="rounded-[1.35rem] border border-border/70 bg-background px-4 py-3 text-sm text-muted-foreground">
              Live toast alerts use the websocket feed for real-time events. Turning them off only mutes popups; the inbox still keeps every event.
            </div>
            <div className="flex flex-wrap gap-3">
              <Button disabled={isEmailSaving} type="submit">
                {isEmailSaving ? 'Saving...' : 'Save email settings'}
              </Button>
              {email && !emailVerifiedAt ? (
                <Button
                  disabled={isRequestingVerification}
                  type="button"
                  variant="outline"
                  onClick={onSendVerification}
                >
                  Send verification email
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

import { Controller, type UseFormReturn } from 'react-hook-form'

import { FieldBlock } from '@/components/forms/field-block'
import { LoginImageCropField } from '@/components/login-image-crop-field'
import { DashboardPreview } from '@/components/previews/dashboard-preview'
import { BackgroundMediaField } from '@/components/forms/shared-form-controls'
import { SignInPreview } from '@/components/previews/sign-in-preview'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getFormErrorMessage } from '@/lib/form-errors'
import type { AdminBootstrap } from '@/types/app'

export function AdminStudioBrandingSection({
  bootstrap,
  settingsForm,
  settingsContentErrors,
  resolvedPreviewSettingsValues,
  updateSettingsPending,
  onSubmit,
}: {
  bootstrap: AdminBootstrap
  settingsForm: UseFormReturn<any>
  settingsContentErrors?: Record<string, unknown>
  resolvedPreviewSettingsValues: any
  updateSettingsPending: boolean
  onSubmit: (values: any) => void
}) {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <CardTitle>Content and branding</CardTitle>
        <CardDescription>
          Shape the real sign-in screen, setup copy, and dashboard voice from one place.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <form
          className="space-y-4"
          onSubmit={settingsForm.handleSubmit((values) => onSubmit(values))}
        >
          <FieldBlock error={getFormErrorMessage(settingsForm.formState.errors.platformName)} htmlFor="platformName" label="Platform name" tooltip="Global product name shown on the login page and across the signed-in experience.">
            <Input
              id="platformName"
              aria-invalid={Boolean(settingsForm.formState.errors.platformName)}
              {...settingsForm.register('platformName')}
            />
          </FieldBlock>
          <FieldBlock error={getFormErrorMessage(settingsForm.formState.errors.themePresetKey)} label="Theme deck" tooltip="Chooses the global palette, contrast, and font pairing used across setup, sign-in, and the signed-in app.">
            <Controller
              control={settingsForm.control}
              name="themePresetKey"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {bootstrap.themes.map((theme) => (
                      <SelectItem key={theme.key} value={theme.key}>
                        {theme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldBlock>
          <FieldBlock error={getFormErrorMessage(settingsContentErrors?.loginTitle)} htmlFor="loginTitle" label="Sign-in headline" tooltip="Main headline on the public sign-in screen, shown over the large media stage.">
            <Input
              id="loginTitle"
              aria-invalid={Boolean(settingsContentErrors?.loginTitle)}
              {...settingsForm.register('content.loginTitle')}
            />
          </FieldBlock>
          <FieldBlock error={getFormErrorMessage(settingsContentErrors?.loginMessage)} htmlFor="loginMessage" label="Sign-in supporting copy" tooltip="Supporting paragraph under the sign-in headline. This is where the competitive tone and accountability framing usually live.">
            <Textarea
              id="loginMessage"
              aria-invalid={Boolean(settingsContentErrors?.loginMessage)}
              rows={6}
              {...settingsForm.register('content.loginMessage')}
            />
          </FieldBlock>
          <FieldBlock error={getFormErrorMessage(settingsContentErrors?.loginImageUrl)} label="Spotlight hero image" tooltip="Large clickable foreground image on the sign-in screen. This is the art players see first, and it opens in a zoom view when tapped.">
            <Controller
              control={settingsForm.control}
              name="content.loginImageUrl"
              render={({ field }) => (
                <LoginImageCropField value={field.value} onChange={field.onChange} />
              )}
            />
          </FieldBlock>
          <FieldBlock
            error={getFormErrorMessage(settingsContentErrors?.loginBackgroundImageUrl)
              || getFormErrorMessage(settingsContentErrors?.loginBackgroundImageSource)
              || getFormErrorMessage(settingsContentErrors?.loginBackgroundVideoUrl)
              || getFormErrorMessage(settingsContentErrors?.loginBackgroundVideoSource)}
            htmlFor="loginBackgroundMedia"
            label="Backdrop media"
            tooltip="Single fullscreen background layer for the sign-in screen. Upload either an image or a looping silent video."
          >
            <BackgroundMediaField
              inputId="loginBackgroundMedia"
              imageValue={resolvedPreviewSettingsValues.content.loginBackgroundImageUrl}
              imageSource={resolvedPreviewSettingsValues.content.loginBackgroundImageSource}
              videoValue={resolvedPreviewSettingsValues.content.loginBackgroundVideoUrl}
              videoSource={resolvedPreviewSettingsValues.content.loginBackgroundVideoSource}
              onChange={({ imageSource, imageValue, videoSource, videoValue }) => {
                settingsForm.setValue('content.loginBackgroundImageUrl', imageValue, { shouldDirty: true, shouldValidate: true })
                settingsForm.setValue('content.loginBackgroundImageSource', imageSource, { shouldDirty: true, shouldValidate: true })
                settingsForm.setValue('content.loginBackgroundVideoUrl', videoValue, { shouldDirty: true, shouldValidate: true })
                settingsForm.setValue('content.loginBackgroundVideoSource', videoSource, { shouldDirty: true, shouldValidate: true })
              }}
            />
          </FieldBlock>
          <FieldBlock error={getFormErrorMessage(settingsContentErrors?.dashboardTitle)} htmlFor="dashboardTitle" label="Dashboard heading" tooltip="Main signed-in heading shown above the player dashboard overview after login.">
            <Input
              id="dashboardTitle"
              aria-invalid={Boolean(settingsContentErrors?.dashboardTitle)}
              {...settingsForm.register('content.dashboardTitle')}
            />
          </FieldBlock>
          <FieldBlock error={getFormErrorMessage(settingsContentErrors?.dashboardMessage)} htmlFor="dashboardMessage" label="Dashboard supporting copy" tooltip="Short paragraph below the dashboard heading to frame the shared goals of the group after login.">
            <Textarea
              id="dashboardMessage"
              aria-invalid={Boolean(settingsContentErrors?.dashboardMessage)}
              {...settingsForm.register('content.dashboardMessage')}
            />
          </FieldBlock>
          <Button
            disabled={updateSettingsPending}
            type="submit"
          >
            Save branding
          </Button>
        </form>
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Live sign-in preview</p>
            <SignInPreview bootstrap={bootstrap} values={resolvedPreviewSettingsValues} />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Live dashboard preview</p>
            <DashboardPreview bootstrap={bootstrap} values={resolvedPreviewSettingsValues} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

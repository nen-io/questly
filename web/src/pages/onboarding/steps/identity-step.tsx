import { Controller } from 'react-hook-form'

import { FieldBlock } from '@/components/forms/field-block'
import { BackgroundMediaField } from '@/components/forms/shared-form-controls'
import { LoginImageCropField } from '@/components/login-image-crop-field'
import { DashboardPreview } from '@/components/previews/dashboard-preview'
import { SignInPreview } from '@/components/previews/sign-in-preview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getFormErrorMessage } from '@/lib/form-errors'
import type { AdminBootstrap } from '@/types/app'

import { SettingsSectionCard } from '../components/settings-section-card'
import { StepPanel } from '../components/step-panel'
import type { SettingsForm, SettingsFormValues } from '../lib/types'

export function IdentityStep({
  bootstrap,
  form,
  previewValues,
  settingsContentErrors,
  isSaving,
  onSave,
}: {
  bootstrap: AdminBootstrap
  form: SettingsForm
  previewValues: SettingsFormValues
  settingsContentErrors?: Record<string, unknown>
  isSaving: boolean
  onSave: (values: SettingsFormValues) => Promise<void>
}) {
  return (
    <StepPanel
      eyebrow="Theme + identity"
      title="Choose the cabinet skin and the house name."
      description="This locks in the palette, public name, setup voice, and dashboard tone before you wire the rest of the cabinet."
    >
      <form className="space-y-8" onSubmit={form.handleSubmit(onSave)}>
        <SettingsSectionCard
          eyebrow="Global look"
          title="Lock in the cabinet shell."
          description="The selected theme now carries its own font pairing, so palette and typography travel together across the sign-in surface and dashboard."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <FieldBlock error={getFormErrorMessage(form.formState.errors.platformName)} htmlFor="platformName" label="Platform name" tooltip="Global product name shown on sign-in, setup, and the signed-in app.">
              <Input id="platformName" {...form.register('platformName')} />
            </FieldBlock>
            <FieldBlock error={getFormErrorMessage(form.formState.errors.themePresetKey)} label="Theme deck" tooltip="Chooses the full visual style used across setup, sign-in, and the dashboard, including the font pairing.">
              <Controller
                control={form.control}
                name="themePresetKey"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a theme" />
                    </SelectTrigger>
                    <SelectContent>
                      {bootstrap.themes.map((theme) => (
                        <SelectItem key={theme.key} value={theme.key}>{theme.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldBlock>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          eyebrow="Dashboard settings"
          title="Tune the signed-in home screen."
          description="Set the heading and supporting copy players see once they enter the cabinet."
        >
          <div className="space-y-5">
            <FieldBlock error={getFormErrorMessage(settingsContentErrors?.dashboardTitle)} htmlFor="dashboardTitle" label="Dashboard heading" tooltip="Main heading players see after they sign in.">
              <Input id="dashboardTitle" {...form.register('content.dashboardTitle')} />
            </FieldBlock>
            <FieldBlock error={getFormErrorMessage(settingsContentErrors?.dashboardMessage)} htmlFor="dashboardMessage" label="Dashboard supporting copy" tooltip="Short paragraph below the dashboard heading after login.">
              <Textarea id="dashboardMessage" rows={4} {...form.register('content.dashboardMessage')} />
            </FieldBlock>
            <div className="space-y-3">
              <p className="retro-ui text-xs uppercase tracking-[0.24em] text-primary">Live dashboard preview</p>
              <DashboardPreview bootstrap={bootstrap} values={previewValues} />
            </div>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          eyebrow="Sign-in settings"
          title="Shape the entry screen."
          description="This controls the large public sign-in surface, including the headline, supporting copy, hero art, and backdrop media."
        >
          <div className="space-y-5">
            <FieldBlock error={getFormErrorMessage(settingsContentErrors?.loginTitle)} htmlFor="loginTitle" label="Sign-in headline" tooltip="Main headline on the public sign-in screen, shown over the large media stage.">
              <Input id="loginTitle" {...form.register('content.loginTitle')} />
            </FieldBlock>
            <FieldBlock error={getFormErrorMessage(settingsContentErrors?.loginMessage)} htmlFor="loginMessage" label="Sign-in supporting copy" tooltip="Supporting paragraph under the sign-in headline. This is where the competitive tone and accountability framing usually live.">
              <Textarea id="loginMessage" rows={6} {...form.register('content.loginMessage')} />
            </FieldBlock>
            <FieldBlock error={getFormErrorMessage(settingsContentErrors?.loginImageUrl)} label="Spotlight hero image" tooltip="Large clickable foreground image on the sign-in screen. This is the art players see first, and it opens in a zoom view when tapped.">
              <Controller
                control={form.control}
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
              htmlFor="landingBackdropMedia"
              label="Backdrop media"
              tooltip="Single fullscreen background layer for the sign-in screen. Upload either an image or a looping silent video."
            >
              <BackgroundMediaField
                inputId="landingBackdropMedia"
                imageValue={previewValues.content.loginBackgroundImageUrl}
                imageSource={previewValues.content.loginBackgroundImageSource}
                videoValue={previewValues.content.loginBackgroundVideoUrl}
                videoSource={previewValues.content.loginBackgroundVideoSource}
                onChange={({ imageSource, imageValue, videoSource, videoValue }) => {
                  form.setValue('content.loginBackgroundImageUrl', imageValue, { shouldDirty: true, shouldValidate: true })
                  form.setValue('content.loginBackgroundImageSource', imageSource, { shouldDirty: true, shouldValidate: true })
                  form.setValue('content.loginBackgroundVideoUrl', videoValue, { shouldDirty: true, shouldValidate: true })
                  form.setValue('content.loginBackgroundVideoSource', videoSource, { shouldDirty: true, shouldValidate: true })
                }}
              />
            </FieldBlock>
            <div className="space-y-3">
              <p className="retro-ui text-xs uppercase tracking-[0.24em] text-primary">Live sign-in preview</p>
              <SignInPreview bootstrap={bootstrap} values={previewValues} />
            </div>
          </div>
        </SettingsSectionCard>

        <div className="flex flex-wrap gap-3">
          <Button disabled={isSaving} type="submit">
            {isSaving ? 'Saving...' : 'Save Look + Content'}
          </Button>
        </div>
      </form>
    </StepPanel>
  )
}

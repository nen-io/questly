import { LoginScreen } from '@/pages/login'
import { getThemeStyle } from '@/lib/theme'
import type { AdminBootstrap, PublicConfig } from '@/types/app'
import { resolveFontPreset } from '@shared/font-presets'

interface SignInPreviewValues {
  platformName: string
  themePresetKey: string
  onboardingCompleted: boolean
  content: {
    fontPresetKey: string
    loginTitle: string
    loginMessage: string
    loginImageUrl: string | null
    loginBackgroundImageUrl: string | null
    loginBackgroundImageSource?: string | null
    loginBackgroundVideoUrl: string | null
    loginBackgroundVideoSource?: string | null
    dashboardTitle: string
    dashboardMessage: string
    onboardingIntroEyebrow: string
    onboardingIntroTitle: string
    onboardingIntroMessage: string
    onboardingLaunchTitle: string
    onboardingLaunchMessage: string
  }
}

interface SignInPreviewProps {
  bootstrap: AdminBootstrap
  values: SignInPreviewValues
}

export function SignInPreview({ bootstrap, values }: SignInPreviewProps) {
  const resolvedContent = {
    ...bootstrap.settings.content,
    ...(values.content ?? {}),
  }
  const previewTheme = bootstrap.themes.find((theme) => theme.key === values.themePresetKey) ?? bootstrap.settings.theme
  const fontPreset = resolveFontPreset(resolvedContent.fontPresetKey)
  const previewTokens = {
    ...previewTheme.tokens,
    fontSans: fontPreset.fontSans,
    fontDisplay: fontPreset.fontDisplay,
  }

  const previewConfig: PublicConfig = {
    realm: {
      id: 0,
      name: values.platformName,
      slug: 'preview',
    },
    platformName: values.platformName,
    onboardingCompleted: true,
    setup: {
      ...bootstrap.setup,
      status: 'launched',
      isLaunched: true,
      allowPlayerLogin: true,
      launchBlockers: [],
      launchedAt: bootstrap.setup.launchedAt,
    },
    content: {
      ...resolvedContent,
    },
    theme: {
      ...previewTheme,
      tokens: previewTokens,
    },
  }

  return (
    <div
      className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-background shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
      style={getThemeStyle(previewTokens)}
    >
      <LoginScreen preview publicConfig={previewConfig} />
    </div>
  )
}

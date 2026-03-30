import type { RefreshableAssetRef } from './media'

export interface PublicContent {
  fontPresetKey: string
  loginTitle: string
  loginMessage: string
  loginImageUrl: string | null
  loginBackgroundImageUrl: string | null
  loginBackgroundImageSource: string | null
  loginBackgroundImageAsset: RefreshableAssetRef | null
  loginBackgroundVideoUrl: string | null
  loginBackgroundVideoSource: string | null
  loginBackgroundVideoAsset: RefreshableAssetRef | null
  dashboardTitle: string
  dashboardMessage: string
  onboardingIntroEyebrow: string
  onboardingIntroTitle: string
  onboardingIntroMessage: string
  onboardingLaunchTitle: string
  onboardingLaunchMessage: string
}

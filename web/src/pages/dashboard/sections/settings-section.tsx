import type { ComponentProps } from 'react'

import { PlayerSettingsPanel } from '../components'

type SettingsSectionProps = ComponentProps<typeof PlayerSettingsPanel>

export function SettingsSection(props: SettingsSectionProps) {
  return <PlayerSettingsPanel {...props} />
}

interface ThemeAtmosphereProps {
  themeKey?: string
  className?: string
}

export function ThemeAtmosphere({ themeKey = 'default', className = '' }: ThemeAtmosphereProps) {
  return (
    <div
      aria-hidden="true"
      className={`theme-atmosphere ${className}`.trim()}
      data-theme-atmosphere={themeKey}
    >
      <div className="theme-atmosphere__mesh" />
      <div className="theme-atmosphere__orb theme-atmosphere__orb--a" />
      <div className="theme-atmosphere__orb theme-atmosphere__orb--b" />
      <div className="theme-atmosphere__orb theme-atmosphere__orb--c" />
      <div className="theme-atmosphere__pattern" />
      <div className="theme-atmosphere__accent" />
    </div>
  )
}

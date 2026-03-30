export function AttributeIconBadge({
  color,
  icon,
}: {
  color: string
  icon: string | null
}) {
  return (
    <span
      className="flex size-5 items-center justify-center rounded-full border border-white/80 text-[0.72rem]"
      style={{ backgroundColor: color, color: '#fff' }}
    >
      {icon || '•'}
    </span>
  )
}

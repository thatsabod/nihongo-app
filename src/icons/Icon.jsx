import { ICON_PATHS } from './paths.js'

/**
 * Generic icon renderer. Looks up `name` in `ICON_PATHS` and renders an
 * inline SVG sized to `size` and colored with `color` (defaults to the
 * surrounding text color, so icons follow theme/dark-mode automatically).
 *
 * @param {{
 *   name: import('./iconNames.js').IconName,
 *   size?: number,
 *   color?: string,
 *   strokeWidth?: number,
 *   className?: string,
 *   label?: string,
 * }} props
 */
export default function Icon({
  name,
  size = 24,
  color = 'currentColor',
  strokeWidth = 2,
  className = '',
  label = '',
  ...rest
}) {
  const def = ICON_PATHS[name]
  if (!def) return null

  const isSolid = def.fill === 'solid'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isSolid ? color : 'none'}
      stroke={isSolid ? 'none' : color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={['icon', `icon-${name}`, className].filter(Boolean).join(' ')}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {def.shapes?.map((shape, i) =>
        shape.type === 'circle' ? (
          <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} />
        ) : (
          <rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} />
        ),
      )}
      {def.paths?.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}

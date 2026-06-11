import AppIcon from './AppIcon.jsx'

export default function IconCircle({ name, size = 38, iconSize, className = '', label, style }) {
  const icon = iconSize ?? Math.round(size * 0.78)
  return (
    <span className={['icon-circle', className].filter(Boolean).join(' ')} style={{ '--icon-circle-size': `${size}px`, ...style }}>
      <AppIcon name={name} size={icon} label={label} />
    </span>
  )
}

import { Icon, isIconName } from '../icons'

export default function AppIcon({ name, label = '', className = '', size = 28 }) {
  if (!isIconName(name)) return null
  return (
    <Icon
      name={name}
      size={size}
      label={label}
      className={['app-icon', className].filter(Boolean).join(' ')}
      style={{ '--icon-size': `${size}px` }}
    />
  )
}

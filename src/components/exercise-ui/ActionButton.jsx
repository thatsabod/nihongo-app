// Shared call-to-action button. `variant` maps to the existing `.btn-*`
// theme classes (primary, secondary, ...) so colors stay theme-driven.
export default function ActionButton({ variant = 'primary', className = '', children, ...rest }) {
  return (
    <button className={['btn', `btn-${variant}`, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  )
}

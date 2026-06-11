import Icon from './Icon.jsx'
import { ICON_NAMES, isIconName } from './iconNames.js'
import { ICON_PATHS } from './paths.js'

export { default as Icon } from './Icon.jsx'
export { ICON_NAMES, isIconName } from './iconNames.js'
export { ICON_PATHS } from './paths.js'

/** Converts an icon name (kebab-case) to a camelCase object key. */
function toCamel(name) {
  return name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
}

/**
 * `Icons.gem`-style component map, keyed by camelCase icon name.
 * Each value is a ready-to-render component for that icon, e.g.
 *
 *   <Icons.gems size={20} />
 *
 * Use this for static, known-at-author-time icons. For icons whose
 * name is dynamic (e.g. driven by data), use `<Icon name={...} />`
 * instead.
 */
export const Icons = Object.fromEntries(
  ICON_NAMES.map((name) => {
    const Component = (props) => <Icon name={name} {...props} />
    Component.displayName = `Icon(${name})`
    return [toCamel(name), Component]
  }),
)

/**
 * Plain name -> definition map, useful for non-component contexts
 * (e.g. listing all icons in a style guide).
 */
export const ICON_MAP = ICON_PATHS

export { toCamel as toIconKey }

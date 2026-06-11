# Icon system

Scalable SVG icon set for the app, replacing the old PNG-based
`iconRegistry.js`. All icons are inline `<svg>` elements that inherit
text color (`currentColor`) and scale via a `size` prop, so they work
with theming/dark mode and any DPI without shipping image assets.

## Structure

```
src/icons/
  paths.js     - vector definitions (one entry per icon)
  iconNames.js - canonical list of valid icon names + IconName type
  Icon.jsx     - generic <Icon name="..." /> renderer
  index.jsx    - public entry point (Icon, Icons, ICON_NAMES, ...)
```

## Naming convention

- Canonical icon names (`ICON_NAMES`, `ICON_PATHS` keys, the `name` prop
  of `<Icon>`) are **kebab-case**, e.g. `night-mode`, `streak-7`.
- The `Icons` component map keys are **camelCase** versions of the same
  names, e.g. `Icons.nightMode`, `Icons.streak7` — this matches normal
  JS identifier rules so they can be accessed as `Icons.gems`.
- File names follow the existing project convention (`PascalCase.jsx`
  for components, `camelCase.js` for plain modules).

## Usage

### Dynamic name (data-driven)

```jsx
import { Icon } from '../icons'

<Icon name="gems" size={24} />
<Icon name="streak" size={20} color="var(--accent)" />
```

### Static reference (tree-shakeable, autocomplete-friendly)

```jsx
import { Icons } from '../icons'

<Icons.gems size={24} />
<Icons.nightMode size={20} />
```

This is the web equivalent of the React Native pattern
`<Image source={Icons.gem} />` — instead of pointing an `<Image>` at a
raster asset, `Icons.gems` is itself a renderable vector component, so
you render it directly: `<Icons.gems />`.

### Adding a new icon

1. Add a kebab-case key to `ICON_NAMES` in `iconNames.js`.
2. Add the matching vector definition to `ICON_PATHS` in `paths.js`
   (`paths`, optional `shapes` for circles/rects, optional
   `fill: 'solid'` for filled icons).
3. It is automatically available via `<Icon name="..." />` and
   `Icons.<camelCaseName>`.

## Migration notes

- `AppIcon` (`src/components/AppIcon.jsx`) now renders `<Icon>`
  internally, so existing `<AppIcon name="gems" />` usages across the
  app continue to work unchanged.
- `src/iconRegistry.js` (PNG paths) and `public/assets/icons/*.png` are
  no longer used and can be removed once nothing imports them directly.

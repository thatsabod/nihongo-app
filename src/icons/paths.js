// Vector definitions for every icon in the app icon set.
// Each entry is rendered by `Icon.jsx` into a 24x24 viewBox <svg>.
// `fill: 'solid'` means the icon is filled with `color` (no stroke);
// otherwise the icon is stroked with `color` and has no fill.

export const ICON_PATHS = {
  gems: {
    paths: ['M6 3h12l4 6-10 13L2 9Z', 'M11 3 8 9l4 13 4-13-3-6', 'M2 9h20'],
  },
  achievement: {
    shapes: [{ type: 'circle', cx: 12, cy: 8, r: 6 }],
    paths: ['M15.477 12.89 17 22l-5-3-5 3 1.523-9.11'],
  },
  profile: {
    shapes: [{ type: 'circle', cx: 12, cy: 7, r: 4 }],
    paths: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'],
  },
  streak: {
    paths: [
      'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z',
    ],
  },
  life: {
    shapes: [
      { type: 'rect', x: 3, y: 5, width: 15, height: 14, rx: 4 },
      { type: 'rect', x: 18, y: 9, width: 2.6, height: 6, rx: 1.1 },
    ],
  },
  coins: {
    shapes: [{ type: 'circle', cx: 12, cy: 12, r: 10 }],
    paths: ['M12 6v3', 'M12 15v3', 'M15 9.5a3.16 3.16 0 0 0-3-1.5c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2a3.16 3.16 0 0 1-3-1.5'],
  },
  gift: {
    shapes: [{ type: 'rect', x: 3, y: 8, width: 18, height: 4, rx: 1 }],
    paths: [
      'M12 8v13',
      'M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7',
      'M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8',
      'M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8',
    ],
  },
  calendar: {
    shapes: [{ type: 'rect', x: 3, y: 4, width: 18, height: 18, rx: 2 }],
    paths: ['M16 2v4', 'M8 2v4', 'M3 10h18', 'm9 16 2 2 4-4'],
  },
  settings: {
    shapes: [{ type: 'circle', cx: 12, cy: 12, r: 3 }],
    paths: [
      'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z',
    ],
  },
  home: {
    paths: ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  },
  lessons: {
    paths: [
      'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z',
      'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
    ],
  },
  vocabulary: {
    paths: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z'],
  },
  quiz: {
    paths: ['M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z'],
  },
  writing: {
    paths: ['m5 8 6 6', 'm4 14 6-6 2-3', 'M2 5h12', 'M7 2h1', 'm22 22-5-10-5 10', 'M14 18h6'],
  },
  listening: {
    paths: [
      'M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3v-7a9 9 0 0 1 18 0v7h-3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3',
    ],
  },
  speaking: {
    shapes: [{ type: 'rect', x: 9, y: 2, width: 6, height: 11, rx: 3 }],
    paths: ['M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v3', 'M8 22h8'],
  },
  progress: {
    paths: ['m22 7-8.5 8.5-5-5L2 17', 'M16 7h6v6'],
  },
  ranking: {
    shapes: [{ type: 'circle', cx: 12, cy: 8, r: 6 }],
    paths: ['M15.48 12.89 17 22l-5-3-5 3 1.52-9.11'],
  },
  star: {
    fill: 'solid',
    paths: [
      'M11.53 2.3a.53.53 0 0 1 .95 0l2.31 4.68a2.12 2.12 0 0 0 1.6 1.16l5.16.75a.53.53 0 0 1 .3.91l-3.74 3.64a2.12 2.12 0 0 0-.61 1.88l.88 5.14a.53.53 0 0 1-.77.56l-4.62-2.43a2.12 2.12 0 0 0-1.97 0L6.4 21.01a.53.53 0 0 1-.77-.56l.88-5.14a2.12 2.12 0 0 0-.61-1.88L2.16 9.8a.53.53 0 0 1 .3-.91l5.16-.75a2.12 2.12 0 0 0 1.6-1.16z',
    ],
  },
  locked: {
    shapes: [{ type: 'rect', x: 3, y: 11, width: 18, height: 11, rx: 2 }],
    paths: ['M7 11V7a5 5 0 0 1 10 0v4'],
  },
  unlocked: {
    shapes: [{ type: 'rect', x: 3, y: 11, width: 18, height: 11, rx: 2 }],
    paths: ['M7 11V7a5 5 0 0 1 9.9-1'],
  },
  search: {
    shapes: [{ type: 'circle', cx: 11, cy: 11, r: 8 }],
    paths: ['m21 21-4.3-4.3'],
  },
  filter: {
    shapes: [
      { type: 'circle', cx: 12, cy: 4, r: 2 },
      { type: 'circle', cx: 6, cy: 12, r: 2 },
      { type: 'circle', cx: 16, cy: 20, r: 2 },
    ],
    paths: ['M21 4h-7', 'M10 4H3', 'M21 12h-9', 'M8 12H3', 'M21 20h-5', 'M12 20H3'],
  },
  save: {
    paths: ['m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'],
  },
  share: {
    shapes: [
      { type: 'circle', cx: 18, cy: 5, r: 3 },
      { type: 'circle', cx: 6, cy: 12, r: 3 },
      { type: 'circle', cx: 18, cy: 19, r: 3 },
    ],
    paths: ['m8.59 13.51 6.83 3.98', 'm15.41 6.51-6.82 3.98'],
  },
  messages: {
    shapes: [{ type: 'rect', x: 2, y: 4, width: 20, height: 16, rx: 2 }],
    paths: ['m22 7-10 5L2 7'],
  },
  notifications: {
    paths: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
  },
  back: {
    paths: ['m12 19-7-7 7-7', 'M19 12H5'],
  },
  next: {
    paths: ['M5 12h14', 'm12 5 7 7-7 7'],
  },
  play: {
    fill: 'solid',
    paths: ['M6 3.5v17l14-8.5z'],
  },
  pause: {
    fill: 'solid',
    shapes: [
      { type: 'rect', x: 6, y: 4, width: 4, height: 16, rx: 1 },
      { type: 'rect', x: 14, y: 4, width: 4, height: 16, rx: 1 },
    ],
  },
  correct: {
    paths: ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4 12 14.01l-3-3'],
  },
  wrong: {
    shapes: [{ type: 'circle', cx: 12, cy: 12, r: 10 }],
    paths: ['m15 9-6 6', 'm9 9 6 6'],
  },
  info: {
    shapes: [{ type: 'circle', cx: 12, cy: 12, r: 10 }],
    paths: ['M12 16v-4', 'M12 8h.01'],
  },
  help: {
    shapes: [{ type: 'circle', cx: 12, cy: 12, r: 10 }],
    paths: ['M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'],
  },
  hint: {
    paths: [
      'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5',
      'M9 18h6',
      'M10 22h4',
    ],
  },
  files: {
    paths: ['M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'],
  },
  download: {
    paths: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
  },
  upload: {
    paths: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'],
  },
  camera: {
    shapes: [{ type: 'circle', cx: 12, cy: 13, r: 3 }],
    paths: ['M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z'],
  },
  gallery: {
    shapes: [
      { type: 'rect', x: 3, y: 3, width: 18, height: 18, rx: 2 },
      { type: 'circle', cx: 9, cy: 9, r: 2 },
    ],
    paths: ['m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21'],
  },
  'night-mode': {
    paths: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
  },
  language: {
    paths: ['m5 8 6 6', 'm4 14 6-6 2-3', 'M2 5h12', 'M7 2h1', 'm22 22-5-10-5 10', 'M14 18h6'],
  },
  sound: {
    paths: ['M11 5 6 9H2v6h4l5 4z', 'M15.54 8.46a5 5 0 0 1 0 7.07', 'M19.07 4.93a10 10 0 0 1 0 14.14'],
  },
  mute: {
    paths: ['M11 5 6 9H2v6h4l5 4z', 'm22 9-6 6', 'm16 9 6 6'],
  },
  store: {
    paths: [
      'm2 7 1.5-4h17L22 7',
      'M2 7v13a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V7',
      'M2 7h20',
      'M9 11v9',
      'M15 11v9',
    ],
  },
  map: {
    paths: ['M3 6v15l6-3 6 3 6-3V3l-6 3-6-3z', 'M9 3v15', 'M15 6v15'],
  },
  explore: {
    shapes: [{ type: 'circle', cx: 12, cy: 12, r: 10 }],
    paths: ['m16.24 7.76-1.8 5.41a1 1 0 0 1-.63.63l-5.41 1.8 1.8-5.41a1 1 0 0 1 .63-.63z'],
  },
  grammar: {
    paths: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z', 'M8 7h8', 'M8 11h8'],
  },
  culture: {
    paths: ['m2 11 10-7 10 7', 'M3 22h18', 'M6 18V11', 'M10 18V11', 'M14 18V11', 'M18 18V11'],
  },
  levels: {
    paths: ['M3 3v18h18', 'M18 17V9', 'M13 17V5', 'M8 17v-3'],
  },
  goal: {
    shapes: [
      { type: 'circle', cx: 12, cy: 12, r: 10 },
      { type: 'circle', cx: 12, cy: 12, r: 6 },
      { type: 'circle', cx: 12, cy: 12, r: 2 },
    ],
  },
  timer: {
    shapes: [{ type: 'circle', cx: 12, cy: 14, r: 8 }],
    paths: ['M10 2h4', 'm12 14 3-3'],
  },
  'streak-7': {
    paths: [
      'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z',
    ],
  },
}

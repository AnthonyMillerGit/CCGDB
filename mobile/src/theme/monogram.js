// Deterministic color + label for set/game tiles that have no artwork.
// A curated palette (not random HSL) so every monogram harmonizes with the
// dark theme and sits comfortably next to the cyan accent. Same input always
// yields the same color, so a given set keeps its identity across screens.

const PALETTE = [
  { bg: '#123a3d', fg: '#3fd0c3' }, // teal (kin to the accent)
  { bg: '#3a2f12', fg: '#e3ba4e' }, // amber
  { bg: '#2d2247', fg: '#b48ce6' }, // violet
  { bg: '#3d1f29', fg: '#e87a95' }, // rose
  { bg: '#1a2c48', fg: '#69a6e8' }, // blue
  { bg: '#1c3b26', fg: '#68d180' }, // green
  { bg: '#3d2716', fg: '#e89a5c' }, // orange
  { bg: '#3a1c39', fg: '#df7dd3' }, // magenta
  { bg: '#242a48', fg: '#8d9ce8' }, // indigo
  { bg: '#343010', fg: '#d6c24b' }, // gold
]

function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

// { bg, fg } pair for a key (use the most stable identifier available — a set
// code or game slug — so the color never shifts when a name is edited).
export function monogramColor(key) {
  return PALETTE[hashStr(String(key || '')) % PALETTE.length]
}

// Short glyph for the tile: the set code if present, else initials from name.
export function monogramLabel(code, name) {
  const c = (code || '').trim()
  if (c) return c.slice(0, 4).toUpperCase()
  const n = (name || '').trim()
  if (!n) return '?'
  const words = n.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

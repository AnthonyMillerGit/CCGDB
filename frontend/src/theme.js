// App-wide color palette
export const COLORS = {
  accent:      '#0097a7',
  danger:      '#8b1a3a',
  warning:     '#b86a00',
  textPrimary: '#1c1008',
  textMuted:   '#7a6248',
  surface:     '#faf6ee',
  border:      '#d4c4a8',
}

// Per-game accent colors (keyed by game slug)
export const GAME_COLORS = {
  mtg:          '#0097a7',
  pokemon:      '#FFCC00',
  yugioh:       '#8844FF',
  startrek_1e:  '#4B9CD3',
  startrek_2e:  '#C0A060',
  seventhsea:   '#C84820',
}

// Loot-tier rarity colors (grey → white → green → blue → purple → orange → red)
export const RARITY_COLORS = {
  fixed:    '#9e836a',
  common:   '#6e5840',
  uncommon: '#2e7d32',
  rare:     '#0277bd',
  super:    '#6b2d8f',
  ultra:    '#b86a00',
  promo:    '#8b1a3a',
}

// Normalizes any rarity string from the DB to one of the 6 tiers above
export function normalizeRarity(raw) {
  if (!raw) return null
  const r = raw.toLowerCase().trim()

  // Common
  if (['fixed', 'f'].includes(r)) return 'fixed'

  if (['c', 'cc', 'common', 'normal', 'ordinary', 'very common',
       'td', 'n', 'virtual card', 't'].includes(r)) return 'common'

  // Uncommon
  if (['u', 'uc', 'uncommon', 'bronze', 'silver', 'higher normal',
       'exceptional'].includes(r)) return 'uncommon'

  // Rare
  if (['r', 're', 'rr', 'rare', 'double rare', 'rare holo', 'holofoil rare',
       'rare holo ex', 'rare holo v', 'fr', 'short print',
       'duel terminal normal parallel rare', 'duel terminal rare parallel rare',
       'elite'].includes(r)) return 'rare'

  // Super Rare
  if (['sr', 'super rare', 'super_rare', 'very rare', 'ssp', 'special rare', 'sp',
       'rrr', 'trr', 'legend', 'legendary', 'rare ultra', 'rare rainbow',
       "collector's rare", 'cr', 'illustration rare', 'gold', 'gold rare',
       'v', 'vp', 'l', 'mythic'].includes(r)) return 'super'

  // Ultra Rare
  if (['ur', 'ultra rare', 'secret rare', 'sec', 'prismatic secret rare',
       'platinum secret rare', 'ultimate rare', 'quarter century secret rare',
       'starlight rare', 'special illustration rare', 'ffr', 'premium gold rare',
       'ofr', 'rare secret', 'r+', 'unique'].includes(r)) return 'ultra'

  // Lorcana chase tiers — enchanted/epic are ultra, iconic is rarest (promo slot)
  if (['enchanted', 'epic'].includes(r)) return 'ultra'
  if (r === 'iconic') return 'promo'

  // Promo / Special — rarest tier (chase cards, avatars, etc.)
  if (['p', 'pr', 'promo', 'm', 'premium', 'hero', 'avatar',
       'special', 'h'].includes(r)) return 'promo'

  return null
}

// Rarity sort order — 0 = most rare, higher = more common
const RARITY_RANK = { promo: 0, ultra: 1, super: 2, rare: 3, uncommon: 4, common: 5, fixed: 6 }
export function rarityRank(raw) {
  const tier = normalizeRarity(raw)
  return tier !== null ? (RARITY_RANK[tier] ?? 7) : 8
}

// Pokémon type colors
export const TYPE_COLORS = {
  Fire:       '#FF4422',
  Water:      '#4488FF',
  Grass:      '#44AA44',
  Lightning:  '#FFCC00',
  Psychic:    '#FF44AA',
  Fighting:   '#CC7722',
  Darkness:   '#442288',
  Metal:      '#AAAAAA',
  Fairy:      '#FF88CC',
  Dragon:     '#7766EE',
  Colorless:  '#888888',
}

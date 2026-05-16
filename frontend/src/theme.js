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

// Generic 6-tier rarity colors (fallback for games without a specific config)
export const RARITY_COLORS = {
  fixed:    '#9e836a',
  common:   '#6e5840',
  uncommon: '#2e7d32',
  rare:     '#0277bd',
  super:    '#6b2d8f',
  ultra:    '#b86a00',
  promo:    '#8b1a3a',
}

// Normalizes any rarity string to one of the 6 generic tiers above.
// Used as a fallback when a game doesn't have a per-game rarity config.
export function normalizeRarity(raw) {
  if (!raw) return null
  const r = raw.toLowerCase().trim()

  if (['fixed', 'f'].includes(r)) return 'fixed'

  if (['c', 'cc', 'common', 'normal', 'ordinary', 'very common',
       'td', 'n', 'virtual card', 't'].includes(r)) return 'common'

  if (['u', 'uc', 'uncommon', 'bronze', 'silver', 'higher normal',
       'exceptional'].includes(r)) return 'uncommon'

  if (['r', 're', 'rr', 'rare', 'double rare', 'rare holo', 'holofoil rare',
       'rare holo ex', 'rare holo v', 'fr', 'short print',
       'duel terminal normal parallel rare', 'duel terminal rare parallel rare',
       'elite'].includes(r)) return 'rare'

  if (['sr', 'super rare', 'super_rare', 'very rare', 'ssp', 'special rare', 'sp',
       'rrr', 'trr', 'legend', 'legendary', 'rare ultra', 'rare rainbow',
       "collector's rare", 'cr', 'illustration rare', 'gold', 'gold rare',
       'v', 'vp', 'l', 'mythic'].includes(r)) return 'super'

  if (['ur', 'ultra rare', 'secret rare', 'sec', 'prismatic secret rare',
       'platinum secret rare', 'ultimate rare', 'quarter century secret rare',
       'starlight rare', 'special illustration rare', 'ffr', 'premium gold rare',
       'ofr', 'rare secret', 'r+', 'unique', 'enchanted', 'epic', 'iconic'].includes(r)) return 'ultra'

  if (['p', 'pr', 'promo', 'm', 'premium', 'hero', 'avatar',
       'special', 'h'].includes(r)) return 'promo'

  return null
}

// ── Per-game exact rarity configs ─────────────────────────────────────────────
// order[]: most rare first (index 0 = rarest) — drives sort order
// colors{}: display color keyed by lowercase rarity string
const GAME_RARITY = {
  lorcana: {
    // Confirmed: Common < Uncommon < Rare < Super Rare < Legendary < Epic < Enchanted < Iconic
    order: ['iconic', 'enchanted', 'epic', 'legendary', 'super_rare', 'rare', 'uncommon', 'common', 'promo'],
    colors: {
      iconic:     '#c62828',  // red   — absolute rarest, 2 per set
      enchanted:  '#00838f',  // teal  — alternate art chase
      epic:       '#7b1fa2',  // purple — rainbow foil, frameless
      legendary:  '#e65100',  // deep orange
      super_rare: '#f9a825',  // amber/gold
      rare:       '#1565c0',  // blue
      uncommon:   '#388e3c',  // green
      common:     '#757575',  // grey
      promo:      '#8b1a3a',  // maroon
    },
  },

  mtg: {
    // Common < Uncommon < Rare < Mythic Rare; bonus/special = promo-tier inserts
    order: ['special', 'bonus', 'mythic', 'rare', 'uncommon', 'common'],
    colors: {
      special:  '#8b1a3a',  // maroon
      bonus:    '#8b1a3a',
      mythic:   '#c84b00',  // orange — matches MTG mythic set symbol color
      rare:     '#c8a52e',  // gold   — matches MTG rare set symbol color
      uncommon: '#a0a0a0',  // silver — matches MTG uncommon set symbol color
      common:   '#6e5840',  // dark brown
    },
  },

  yugioh: {
    // Community-accepted ordering by pull rarity / market scarcity
    order: [
      'prismatic secret rare', 'starlight rare', 'quarter century secret rare',
      'platinum secret rare', 'ghost/gold rare', 'ghost rare',
      'gold secret rare', "collector's rare",
      'extra secret rare', 'extra secret', 'ultra secret rare',
      'secret rare', '10000 secret rare',
      'premium gold rare', 'gold rare', 'platinum rare',
      'ultimate rare',
      'ultra rare', "ultra rare (pharaoh's rare)", 'ultra parallel rare',
      'duel terminal ultra parallel rare',
      'super rare', 'mosaic rare', 'shatterfoil rare', 'starfoil rare',
      'super parallel rare', 'duel terminal super parallel rare',
      'super short print', 'short print',
      'normal parallel rare', 'duel terminal normal parallel rare',
      'duel terminal rare parallel rare',
      'rare', 'common',
    ],
    colors: {
      'prismatic secret rare':              '#c62828',
      'starlight rare':                     '#c62828',
      'quarter century secret rare':        '#d4a017',
      'platinum secret rare':              '#8b8b8b',
      'ghost/gold rare':                    '#9e9e9e',
      'ghost rare':                         '#9e9e9e',
      'gold secret rare':                   '#d4a017',
      "collector's rare":                   '#7b1fa2',
      'extra secret rare':                  '#ad1457',
      'extra secret':                       '#ad1457',
      'ultra secret rare':                  '#ad1457',
      'secret rare':                        '#6a1b9a',
      '10000 secret rare':                  '#6a1b9a',
      'premium gold rare':                  '#c8a52e',
      'gold rare':                          '#c8a52e',
      'platinum rare':                      '#8b8b8b',
      'ultimate rare':                      '#b86a00',
      'ultra rare':                         '#e65100',
      "ultra rare (pharaoh's rare)":        '#e65100',
      'ultra parallel rare':                '#e65100',
      'duel terminal ultra parallel rare':  '#e65100',
      'super rare':                         '#0277bd',
      'mosaic rare':                        '#0277bd',
      'shatterfoil rare':                   '#0277bd',
      'starfoil rare':                      '#0277bd',
      'super parallel rare':                '#0277bd',
      'duel terminal super parallel rare':  '#0277bd',
      'super short print':                  '#388e3c',
      'short print':                        '#388e3c',
      'normal parallel rare':               '#6e5840',
      'duel terminal normal parallel rare': '#6e5840',
      'duel terminal rare parallel rare':   '#6e5840',
      'rare':                               '#2e7d32',
      'common':                             '#757575',
    },
  },

  pokemon: {
    // Ordered by pull rarity (modern Scarlet & Violet era; older types approximated)
    order: [
      'legend', 'ace spec rare', 'shiny ultra rare', 'hyper rare',
      'special illustration rare', 'illustration rare',
      'shiny rare', 'ultra rare', 'rare ultra',
      'rare rainbow', 'rare secret',
      'double rare', 'rare holo vmax', 'rare holo vstar',
      'rare holo gx', 'rare holo v', 'rare holo ex',
      'rare holo', 'rare holo lv.x', 'rare holo star',
      'rare shiny gx', 'rare shiny',
      'rare prime', 'rare prism star', 'rare ace', 'rare break',
      'rare', 'promo',
      'uncommon', 'common',
    ],
    colors: {
      'legend':                     '#c62828',
      'ace spec rare':              '#c62828',
      'shiny ultra rare':           '#ad1457',
      'hyper rare':                 '#d4a017',
      'special illustration rare':  '#7b1fa2',
      'illustration rare':          '#6a1b9a',
      'shiny rare':                 '#00838f',
      'ultra rare':                 '#b86a00',
      'rare ultra':                 '#b86a00',
      'rare rainbow':               '#b86a00',
      'rare secret':                '#b86a00',
      'double rare':                '#e65100',
      'rare holo vmax':             '#e65100',
      'rare holo vstar':            '#e65100',
      'rare holo gx':               '#0277bd',
      'rare holo v':                '#0277bd',
      'rare holo ex':               '#0277bd',
      'rare holo':                  '#0277bd',
      'rare holo lv.x':             '#0277bd',
      'rare holo star':             '#0277bd',
      'rare shiny gx':              '#388e3c',
      'rare shiny':                 '#388e3c',
      'rare prime':                 '#2e7d32',
      'rare prism star':            '#2e7d32',
      'rare ace':                   '#2e7d32',
      'rare break':                 '#2e7d32',
      'rare':                       '#2e7d32',
      'promo':                      '#8b1a3a',
      'uncommon':                   '#388e3c',
      'common':                     '#757575',
    },
  },

  fab: {
    // Flesh and Blood: Common < Rare < Super Rare < Majestic < Legendary < Fabled
    order: ['f', 'l', 'm', 's', 'r', 'c', 'p', 't', 'b', 'v'],
    colors: {
      f: '#c62828',  // Fabled
      l: '#b86a00',  // Legendary
      m: '#7b1fa2',  // Majestic
      s: '#0277bd',  // Super Rare
      r: '#2e7d32',  // Rare
      c: '#757575',  // Common
      p: '#8b1a3a',  // Promo
      t: '#9e9e9e',  // Token
      b: '#9e9e9e',
      v: '#9e9e9e',
    },
  },

  digimon: {
    // Common < Uncommon < Rare < Super Rare < Secret; P = promo (pull rates vary)
    order: ['sec', 'sr', 'r', 'u', 'c', 'p'],
    colors: {
      sec: '#c62828',
      sr:  '#b86a00',
      r:   '#0277bd',
      u:   '#2e7d32',
      c:   '#757575',
      p:   '#8b1a3a',
    },
  },

  onepiece: {
    // Common < Uncommon < Rare < Super Rare < Secret < Treasure Rare; L = Leader (type, not pull rarity)
    order: ['tr', 'sec', 'sr', 'r', 'uc', 'c', 'pr', 'l'],
    colors: {
      tr:  '#c62828',  // Treasure Rare
      sec: '#7b1fa2',  // Secret Rare
      sr:  '#b86a00',  // Super Rare
      r:   '#0277bd',  // Rare
      uc:  '#388e3c',  // Uncommon
      c:   '#757575',  // Common
      pr:  '#8b1a3a',  // Promo
      l:   '#546e7a',  // Leader
    },
  },

  swu: {
    // Star Wars Unlimited: Common < Uncommon < Rare < Legendary; Special = showcase insert
    order: ['special', 'legendary', 'rare', 'uncommon', 'common'],
    colors: {
      special:   '#8b1a3a',
      legendary: '#b86a00',
      rare:      '#0277bd',
      uncommon:  '#388e3c',
      common:    '#757575',
    },
  },

  weissschwarz: {
    // C < CC < U < R < RR < RRR < SP < SPM/SSP < SR < SEC < SIR; PR = promo; TD = trial deck
    order: ['sir', 'sec', 'sr', 'ssp', 'spm', 'sp', 'rrr', 'rr+', 'rr', 'r+', 'r',
            'cr', 'u', 'cc', 'c', 'pr', 'pr+', 'pr＋', 'ps', 'dd', 'bdr', 'td', 'n'],
    colors: {
      sir:  '#c62828',
      sec:  '#ad1457',
      sr:   '#7b1fa2',
      ssp:  '#6a1b9a',
      spm:  '#6a1b9a',
      sp:   '#0277bd',
      rrr:  '#e65100',
      'rr+':'#e65100',
      rr:   '#b86a00',
      'r+': '#388e3c',
      r:    '#2e7d32',
      cr:   '#546e7a',
      u:    '#388e3c',
      cc:   '#6e5840',
      c:    '#757575',
      pr:   '#8b1a3a',
      'pr+':'#8b1a3a',
      'pr＋':'#8b1a3a',
      ps:   '#8b1a3a',
      dd:   '#9e9e9e',
      bdr:  '#9e9e9e',
      td:   '#9e9e9e',
      n:    '#9e9e9e',
    },
  },
}

// ── Rarity helpers ─────────────────────────────────────────────────────────────

// Returns the display color for a rarity string.
// Uses per-game exact config when available, falls back to generic tiers.
export function rarityColor(raw, gameSlug) {
  if (!raw) return 'var(--text-muted)'
  const r = raw.toLowerCase().trim()
  if (gameSlug && GAME_RARITY[gameSlug]) {
    const c = GAME_RARITY[gameSlug].colors[r]
    if (c) return c
  }
  return RARITY_COLORS[normalizeRarity(raw)] || 'var(--text-muted)'
}

// Returns a sort key where 0 = rarest, higher = more common.
// Uses per-game exact ordering when available, falls back to generic tiers.
const GENERIC_RARITY_RANK = { promo: 0, ultra: 1, super: 2, rare: 3, uncommon: 4, common: 5, fixed: 6 }
export function rarityRank(raw, gameSlug) {
  if (!raw) return 999
  const r = raw.toLowerCase().trim()
  if (gameSlug && GAME_RARITY[gameSlug]) {
    const idx = GAME_RARITY[gameSlug].order.indexOf(r)
    if (idx !== -1) return idx
  }
  const tier = normalizeRarity(raw)
  return tier !== null ? (GENERIC_RARITY_RANK[tier] ?? 100) : 999
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

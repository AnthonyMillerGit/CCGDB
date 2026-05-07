// ── Faction colors ────────────────────────────────────────────────────────────
const FACTION_STYLES = {
  Alliance: { text: '#90caf9', bg: '#0d1b2e', border: '#1565c0' },
  Horde:    { text: '#ef9a9a', bg: '#2e0d0d', border: '#b71c1c' },
  Neutral:  { text: '#ffe082', bg: '#2a2510', border: '#f57f17' },
  Both:     { text: '#ce93d8', bg: '#1a102a', border: '#6a1b9a' },
}
const DEFAULT_FACTION = { text: 'var(--text-muted)', bg: 'var(--bg-chip)', border: 'var(--border)' }

// ── Card type colors ──────────────────────────────────────────────────────────
const TYPE_STYLES = {
  Hero:          { bg: '#1a1030', border: '#6a35c0', text: '#b39ddb' },
  'Master Hero': { bg: '#1a1030', border: '#9c27b0', text: '#e040fb' },
  Ally:          { bg: '#0d1e0d', border: '#2e7d32', text: '#a5d6a7' },
  Ability:       { bg: '#0d1a2e', border: '#1565c0', text: '#90caf9' },
  'Ability Ally':{ bg: '#0d1a1e', border: '#00695c', text: '#80cbc4' },
  Equipment:     { bg: '#2a1a0d', border: '#e65100', text: '#ffcc80' },
  Quest:         { bg: '#2a250d', border: '#f57f17', text: '#ffe082' },
  Location:      { bg: '#0d2a25', border: '#00796b', text: '#80cbc4' },
  Achievement:   { bg: '#25200d', border: '#f9a825', text: '#fff176' },
}
const DEFAULT_TYPE = { bg: 'var(--bg-chip)', border: 'var(--border)', text: '#1c1008' }

// ── Rarity colors ─────────────────────────────────────────────────────────────
const RARITY_STYLES = {
  Common:    { color: '#9e9e9e' },
  Uncommon:  { color: '#4caf50' },
  Rare:      { color: '#2196f3' },
  Epic:      { color: '#9c27b0' },
  Legendary: { color: '#ff9800' },
  Promo:     { color: '#f44336' },
}

// ── Class colors ──────────────────────────────────────────────────────────────
const CLASS_COLORS = {
  Paladin:    '#f8d347',
  Warrior:    '#c79c6e',
  Shaman:     '#0070de',
  Druid:      '#ff7d0a',
  Hunter:     '#abd473',
  Priest:     '#ffffff',
  Mage:       '#69ccf0',
  Rogue:      '#fff569',
  Warlock:    '#9482c9',
  DeathKnight:'#c41f3b',
}

// ── Damage type colors ────────────────────────────────────────────────────────
const DMGTYPE_COLORS = {
  Melee:  '#e57373',
  Ranged: '#81d4fa',
  Holy:   '#fff9c4',
  Nature: '#a5d6a7',
  Fire:   '#ff8a65',
  Frost:  '#b3e5fc',
  Shadow: '#ce93d8',
  Arcane: '#ea80fc',
}

function StatBox({ label, value, color }) {
  if (value == null) return null
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-lg border"
      style={{ backgroundColor: 'var(--bg-chip)', borderColor: 'var(--border)', minWidth: '52px' }}>
      <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-xl font-bold" style={{ color: color || '#1c1008' }}>{value}</span>
    </div>
  )
}

function ClassChip({ cls }) {
  const color = CLASS_COLORS[cls] || '#aaa'
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded"
      style={{ backgroundColor: color + '22', border: `1px solid ${color}55`, color }}>
      {cls}
    </span>
  )
}

function SubtypeChips({ subtypes }) {
  if (!subtypes?.length) return null
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {subtypes.map((s, i) => (
        <span key={i} className="text-xs px-2 py-0.5 rounded"
          style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          {s}
        </span>
      ))}
    </div>
  )
}

export default function WoWTCGCardInfo({ card }) {
  const attrs    = card.attributes || {}
  const type     = attrs.type || card.card_type || ''
  const faction  = attrs.faction || ''
  const fStyle   = FACTION_STYLES[faction] || DEFAULT_FACTION
  const tStyle   = TYPE_STYLES[type] || DEFAULT_TYPE
  const rStyle   = RARITY_STYLES[attrs.rarity] || null
  const isHero   = type === 'Hero' || type === 'Master Hero'
  const isAlly   = type === 'Ally' || type === 'Ability Ally'
  const isEquip  = type === 'Equipment'
  const dmgColor = DMGTYPE_COLORS[attrs.dmgtype] || '#1c1008'
  const classes  = attrs.classes || (attrs.hero_class ? [attrs.hero_class] : [])
  const hasHTML  = card.rules_text && /<[a-z][\s\S]*>/i.test(card.rules_text)

  return (
    <div>
      {/* Type + Faction + Rarity row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
          style={{ backgroundColor: tStyle.bg, border: `1px solid ${tStyle.border}`, color: tStyle.text }}>
          {type}
        </span>
        {faction && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: fStyle.bg, border: `1px solid ${fStyle.border}`, color: fStyle.text }}>
            {faction}
          </span>
        )}
        {rStyle && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded"
            style={{ backgroundColor: rStyle.color + '22', border: `1px solid ${rStyle.color}55`, color: rStyle.color }}>
            {attrs.rarity}
          </span>
        )}
        {attrs.instant && (
          <span className="text-xs px-2 py-0.5 rounded"
            style={{ backgroundColor: '#1a2a1a', border: '1px solid #2e7d3255', color: '#a5d6a7' }}>
            Instant
          </span>
        )}
      </div>

      {/* Race + Class row */}
      {(attrs.race || classes.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {attrs.race && (
            <span className="text-xs px-3 py-1 rounded"
              style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              {attrs.race}
            </span>
          )}
          {classes.map(cl => <ClassChip key={cl} cls={cl} />)}
        </div>
      )}

      {/* Stats row */}
      {(isHero || isAlly || isEquip || attrs.cost != null || attrs.health != null) && (
        <div className="flex flex-wrap gap-3 mb-5">
          {attrs.cost != null && (
            <StatBox label="Cost" value={attrs.cost} color="#ffe082" />
          )}
          {attrs.attack != null && (
            <StatBox label="ATK" value={attrs.attack} color={dmgColor} />
          )}
          {attrs.health != null && (
            <StatBox label="HP" value={attrs.health} color="#ef9a9a" />
          )}
          {attrs.defense != null && (
            <StatBox label="DEF" value={attrs.defense} color="#90caf9" />
          )}
          {attrs.strike_cost != null && (
            <StatBox label="Strike" value={attrs.strike_cost} color="#ffcc80" />
          )}
          {attrs.dmgtype && (
            <div className="flex flex-col justify-center px-3 py-2 rounded-lg border"
              style={{ backgroundColor: 'var(--bg-chip)', borderColor: 'var(--border)' }}>
              <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>Damage</span>
              <span className="text-sm font-bold" style={{ color: dmgColor }}>{attrs.dmgtype}</span>
            </div>
          )}
        </div>
      )}

      {/* Subtypes */}
      <SubtypeChips subtypes={attrs.subtypes} />

      {/* Class restrictions (non-hero ability/equipment) */}
      {!isHero && !isAlly && attrs.classes?.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Classes:</span>
          {attrs.classes.map(cl => <ClassChip key={cl} cls={cl} />)}
        </div>
      )}

      {/* Rules text — HTML or plain */}
      {card.rules_text && (
        <div className="rounded-xl p-5 mb-4 border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          {hasHTML ? (
            <div className="card-rules-html text-sm leading-relaxed"
              style={{ color: 'var(--text-primary)' }}
              dangerouslySetInnerHTML={{ __html: card.rules_text }} />
          ) : (
            <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: 'var(--text-primary)' }}>
              {card.rules_text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Village / group colors ─────────────────────────────────────────────────────
const GROUP_STYLES = {
  'Leaf Village':  { text: '#81c784', bg: '#0d2010', border: '#2e7d32' },
  'Sand Village':  { text: '#ffe082', bg: '#2a2010', border: '#f57f17' },
  'Sound Village': { text: '#ce93d8', bg: '#1e0d2a', border: '#7b1fa2' },
  'Akatsuki':      { text: '#ef9a9a', bg: '#2e0d0d', border: '#b71c1c' },
  'Independent':   { text: '#90caf9', bg: '#0d1b2e', border: '#1565c0' },
}
const DEFAULT_GROUP = { text: '#8e8e9e', bg: '#2a2a34', border: '#42424e' }

// ── Rarity colors ──────────────────────────────────────────────────────────────
const RARITY_STYLES = {
  'Common':          { color: '#9e9e9e' },
  'Uncommon':        { color: '#4caf50' },
  'Rare':            { color: '#2196f3' },
  'Rare Alt Art':    { color: '#42a5f5' },
  'Super Rare':      { color: '#9c27b0' },
  'Super Rare Variant': { color: '#ba68c8' },
  'Mythic':          { color: '#ff9800' },
  'Mythic Variant':  { color: '#ffa726' },
  'Mission':         { color: '#78909c' },
}

// ── Effect type colors ─────────────────────────────────────────────────────────
const EFFECT_STYLES = {
  'MAIN':    { bg: '#0d1a2e', border: '#1565c0', text: '#90caf9' },
  'UPGRADE': { bg: '#1a1a0d', border: '#f57f17', text: '#ffe082' },
  'AMBUSH':  { bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a' },
  'SCORE':   { bg: '#0d2a1a', border: '#2e7d32', text: '#a5d6a7' },
}
const DEFAULT_EFFECT = { bg: '#2a2a34', border: '#42424e', text: '#EDF2F6' }

// ── Timing symbol cleanup ─────────────────────────────────────────────────────
function cleanTiming(t) {
  return t.replace(/^￫\s*/, '').replace(/^⧗\s*/, '')
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatBox({ label, value, color }) {
  if (value == null) return null
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-lg border"
      style={{ backgroundColor: '#2a2a34', borderColor: '#42424e', minWidth: '52px' }}>
      <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#8e8e9e' }}>{label}</span>
      <span className="text-xl font-bold" style={{ color: color || '#EDF2F6' }}>{value}</span>
    </div>
  )
}

function EffectChip({ type }) {
  const s = EFFECT_STYLES[type] || DEFAULT_EFFECT
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide"
      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
      {type}
    </span>
  )
}

function KeywordChip({ kw }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded"
      style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e', color: '#b0bec5' }}>
      {kw}
    </span>
  )
}

// ── Rules text: render markdown bold (**text**) and italic (*text*) ────────────
function RulesText({ text }) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return (
    <div className="rounded-xl p-5 mb-4 border" style={{ backgroundColor: '#35353f', borderColor: '#42424e' }}>
      <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: '#EDF2F6' }}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={i}>{part.slice(2, -2)}</strong>
          if (part.startsWith('*') && part.endsWith('*'))
            return <em key={i}>{part.slice(1, -1)}</em>
          return part
        })}
      </p>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function NarutoMythosCardInfo({ card }) {
  const attrs        = card.attributes || {}
  const cardType     = attrs.type || card.card_type || ''
  const groups       = attrs.groups || []
  const keywords     = attrs.keywords || []
  const effectTypes  = attrs.effect_types || []
  const effectTiming = attrs.effect_timing || []
  const rarity       = attrs.rarity || ''
  const rarityStyle  = RARITY_STYLES[rarity] || null
  const isCharacter  = cardType === 'Character'
  const isMission    = cardType === 'Mission'

  const timingLabels = effectTiming.map(cleanTiming).filter(Boolean)
  const isContinuous = effectTiming.some(t => t.includes('⧗') || t.includes('Continuous'))
  const isOnPlay     = effectTiming.some(t => t.includes('↯') || t.includes('On play'))

  return (
    <div>
      {/* Type + Rarity row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
          style={{
            backgroundColor: isCharacter ? '#0d1b2e' : isMission ? '#1a2510' : '#2a2a34',
            border: `1px solid ${isCharacter ? '#1565c0' : isMission ? '#2e7d32' : '#42424e'}`,
            color: isCharacter ? '#90caf9' : isMission ? '#a5d6a7' : '#EDF2F6',
          }}>
          {cardType}
        </span>
        {rarityStyle && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded"
            style={{ backgroundColor: rarityStyle.color + '22', border: `1px solid ${rarityStyle.color}55`, color: rarityStyle.color }}>
            {rarity}
          </span>
        )}
        {attrs.version && (
          <span className="text-xs px-2 py-0.5 rounded italic"
            style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e', color: '#aaa' }}>
            {attrs.version}
          </span>
        )}
      </div>

      {/* Groups (villages/factions) */}
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {groups.map(g => {
            const s = GROUP_STYLES[g] || DEFAULT_GROUP
            return (
              <span key={g} className="text-xs font-bold px-3 py-1 rounded uppercase tracking-wide"
                style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
                {g}
              </span>
            )
          })}
        </div>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-3 mb-5">
        {attrs.chakra_cost != null && (
          <StatBox label="Chakra" value={attrs.chakra_cost} color="#90caf9" />
        )}
        {isCharacter && attrs.power != null && (
          <StatBox label="Power" value={attrs.power} color="#ef9a9a" />
        )}
        {isMission && attrs.power != null && (
          <StatBox label="Mission" value={attrs.power} color="#a5d6a7" />
        )}
        {timingLabels.length > 0 && (
          <div className="flex flex-col justify-center px-3 py-2 rounded-lg border"
            style={{ backgroundColor: '#2a2a34', borderColor: '#42424e' }}>
            <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#8e8e9e' }}>Timing</span>
            <span className="text-sm font-semibold" style={{ color: isContinuous ? '#ffe082' : '#90caf9' }}>
              {isContinuous ? 'Continuous' : isOnPlay ? 'On Play' : timingLabels[0]}
            </span>
          </div>
        )}
      </div>

      {/* Effect type chips */}
      {effectTypes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {effectTypes.map(e => <EffectChip key={e} type={e} />)}
        </div>
      )}

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {keywords.map(kw => <KeywordChip key={kw} kw={kw} />)}
        </div>
      )}

      {/* Rules text */}
      <RulesText text={card.rules_text} />

      {/* Collector number */}
      {card.printings?.[0]?.collector_number && (
        <p className="text-xs mt-1" style={{ color: '#555' }}>
          {card.printings[0].collector_number}
        </p>
      )}
    </div>
  )
}

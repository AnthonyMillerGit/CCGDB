// ── Element colours ───────────────────────────────────────────────────────────
const ELEMENT_STYLES = {
  Air:   { bg: '#0d1f2e', border: '#1565c0', text: '#90caf9', dot: '#64b5f6' },
  Earth: { bg: '#0d1f0d', border: '#2e7d32', text: '#a5d6a7', dot: '#66bb6a' },
  Fire:  { bg: '#2e0d00', border: '#bf360c', text: '#ffab91', dot: '#ef6c00' },
  Water: { bg: '#001829', border: '#01579b', text: '#81d4fa', dot: '#29b6f6' },
}
const DEFAULT_ELEMENT = { bg: 'var(--bg-chip)', border: 'var(--border)', text: 'var(--text-muted)', dot: '#7a6248' }

// ── Threshold icons (small coloured pips) ────────────────────────────────────
function ThresholdPips({ thresholds }) {
  const elements = ['air', 'earth', 'fire', 'water']
  const pips = []
  for (const el of elements) {
    const count = thresholds?.[el] || 0
    const style = ELEMENT_STYLES[el.charAt(0).toUpperCase() + el.slice(1)] || DEFAULT_ELEMENT
    for (let i = 0; i < count; i++) {
      pips.push(
        <span key={`${el}-${i}`}
          title={el.charAt(0).toUpperCase() + el.slice(1)}
          className="inline-block w-3.5 h-3.5 rounded-full border"
          style={{ backgroundColor: style.bg, borderColor: style.dot, boxShadow: `0 0 4px ${style.dot}55` }} />
      )
    }
  }
  return pips.length > 0
    ? <div className="flex flex-wrap items-center gap-1">{pips}</div>
    : null
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ label, value, color }) {
  if (value == null) return null
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg"
      style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-2xl font-extrabold leading-none mt-0.5" style={{ color }}>{value}</span>
    </div>
  )
}

// ── Element badge ─────────────────────────────────────────────────────────────
function ElementBadge({ element }) {
  const style = ELEMENT_STYLES[element] || DEFAULT_ELEMENT
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded"
      style={{ backgroundColor: style.bg, border: `1px solid ${style.border}`, color: style.text }}>
      {element}
    </span>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function SorceryCardInfo({ card }) {
  const attrs     = card.attributes || {}
  const cardType  = card.card_type  || ''

  const elements  = (attrs.elements && attrs.elements !== 'None')
    ? attrs.elements.split(', ').map(e => e.trim()).filter(Boolean)
    : []
  const subTypes  = (attrs.subTypes || '').split(',').map(s => s.trim()).filter(Boolean)
  const cost      = attrs.cost
  const attack    = attrs.attack
  const defence   = attrs.defence
  const life      = attrs.life
  const thresholds = attrs.thresholds
  const typeText  = attrs.typeText
  const rulesText = card.rules_text

  const isAvatar  = cardType === 'Avatar'
  const isMinion  = cardType === 'Minion'
  const hasCombat = attack != null || defence != null

  const hasThresholds = thresholds && Object.values(thresholds).some(v => v > 0)

  return (
    <div>

      {/* ── Type / subtype line ──────────────────────────────────────────── */}
      {(cardType || subTypes.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {cardType && (
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
              style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              {cardType}
            </span>
          )}
          {subTypes.map(s => (
            <span key={s} className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: '#22222a', border: '1px solid var(--border-panel)', color: '#aaa' }}>
              {s}
            </span>
          ))}
        </div>
      )}

      {/* ── Element badges ───────────────────────────────────────────────── */}
      {elements.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {elements.map(el => <ElementBadge key={el} element={el} />)}
        </div>
      )}

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      {(cost != null || hasCombat || life != null) && (
        <div className="flex flex-wrap items-end gap-3 mb-5 pb-4"
          style={{ borderBottom: '1px solid #d4c4a8' }}>
          {cost != null && (
            <StatChip label="Cost" value={cost} color="#ffe082" />
          )}
          {hasCombat && (
            <>
              <StatChip label="Attack"  value={attack}  color="#ef5350" />
              <StatChip label="Defence" value={defence} color="#42a5f5" />
            </>
          )}
          {isAvatar && life != null && (
            <StatChip label="Life" value={life} color="#66bb6a" />
          )}
          {/* Threshold pips inline with stats */}
          {hasThresholds && (
            <div className="flex flex-col gap-1 ml-1">
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Threshold</span>
              <ThresholdPips thresholds={thresholds} />
            </div>
          )}
        </div>
      )}

      {/* ── Thresholds standalone (when no stats row) ────────────────────── */}
      {!cost && !hasCombat && life == null && hasThresholds && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Threshold</span>
          <ThresholdPips thresholds={thresholds} />
        </div>
      )}

      {/* ── typeText descriptor ──────────────────────────────────────────── */}
      {typeText && (
        <div className="rounded-lg p-4 mb-3 border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold leading-relaxed" style={{ color: 'var(--text-panel)' }}>{typeText}</p>
        </div>
      )}

      {/* ── Rules text ───────────────────────────────────────────────────── */}
      {rulesText && (
        <div className="rounded-lg p-4 mb-4 border" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
          <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: 'var(--text-panel)' }}>{rulesText}</p>
        </div>
      )}

    </div>
  )
}

// ── Element styles ─────────────────────────────────────────────────────────────
const ELEMENT_STYLES = {
  FIRE:    { bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a' },
  WATER:   { bg: '#0d1829', border: '#1565c0', text: '#90caf9' },
  WIND:    { bg: '#002e12', border: '#2e7d32', text: '#a5d6a7' },
  EARTH:   { bg: '#2a1a00', border: '#795548', text: '#d7ccc8' },
  ARCANE:  { bg: '#1a0a2e', border: '#6a1b9a', text: '#ce93d8' },
  CRUX:    { bg: '#2e1a2e', border: '#7b1fa2', text: '#e1bee7' },
  LUXEM:   { bg: '#2e1a00', border: '#f9a825', text: '#ffe082' },
  UMBRA:   { bg: '#121212', border: '#424242', text: '#bdbdbd' },
  NORM:    { bg: '#22222a', border: '#42424e', text: '#9e9e9e' },
}
const DEFAULT_ELEM = { bg: '#22222a', border: '#42424e', text: '#aaa' }

function StatChip({ label, value, color = '#EDF2F6' }) {
  if (value == null || value === '') return null
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[52px]"
      style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: '#8e8e9e' }}>{label}</span>
      <span className="text-2xl font-extrabold leading-none mt-0.5" style={{ color }}>{value}</span>
    </div>
  )
}

function Chip({ label, bg = '#22222a', border = '#32323c', text = '#8e8e9e' }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded uppercase tracking-wide"
      style={{ backgroundColor: bg, border: `1px solid ${border}`, color: text }}>
      {label}
    </span>
  )
}

function TextBlock({ text }) {
  if (!text) return null
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: '#3a3a44', backgroundColor: '#28282f' }}>
      <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: '#EDF2F6' }}>{text}</p>
    </div>
  )
}

export default function GrandArchiveCardInfo({ card }) {
  const attrs    = card.attributes || {}
  const cardType = card.card_type  || ''

  const cost = attrs.cost || {}
  const costLabel = cost.value != null ? `${cost.type === 'memory' ? 'M' : 'R'} ${cost.value}` : null

  const elements = Array.isArray(attrs.elements) ? attrs.elements.filter(e => e !== 'NORM') : []
  const classes  = Array.isArray(attrs.classes)  ? attrs.classes  : []
  const subtypes = Array.isArray(attrs.subtypes)
    ? attrs.subtypes.filter(s => !classes.includes(s))
    : []

  const isChampion = cardType.includes('CHAMPION')
  const isAlly     = cardType.includes('ALLY')
  const isWeapon   = cardType.includes('WEAPON')
  const isAttack   = cardType.includes('ATTACK')

  const showStats = (isChampion || isAlly) && (attrs.life != null || attrs.level != null)
    || (isWeapon && attrs.durability)

  return (
    <div>

      {/* ── Metadata row ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">

        {/* Elements */}
        {elements.map(el => {
          const s = ELEMENT_STYLES[el] || DEFAULT_ELEM
          return (
            <span key={el} className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
              style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
              {el}
            </span>
          )
        })}

        {/* Card type */}
        {cardType && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e', color: '#EDF2F6' }}>
            {cardType}
          </span>
        )}

        {/* Cost */}
        {costLabel && (
          <span className="text-xs font-bold px-2.5 py-1 rounded"
            style={{ backgroundColor: '#1a1205', border: '1px solid #f9a825', color: '#ffe082' }}>
            {cost.type === 'memory' ? 'Memory' : 'Reserve'} {cost.value}
          </span>
        )}

        {/* Classes */}
        {classes.map(c => (
          <Chip key={c} label={c} bg="#1a2535" border="#1565c0" text="#90caf9" />
        ))}

        {/* Subtypes */}
        {subtypes.map(s => (
          <Chip key={s} label={s} bg="#22222a" border="#32323c" text="#8e8e9e" />
        ))}

      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      {showStats && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #32323c' }}>
          {attrs.life      != null && <StatChip label="Life"       value={attrs.life}       color="#66bb6a" />}
          {attrs.level     != null && <StatChip label="Level"      value={attrs.level}      color="#ffe082" />}
          {attrs.durability != null && <StatChip label="Durability" value={attrs.durability} color="#80cbc4" />}
          {attrs.speed     != null && <StatChip label="Speed"      value={attrs.speed}      color="#90caf9" />}
        </div>
      )}

      {/* ── Rules text ───────────────────────────────────────────────────── */}
      <TextBlock text={card.rules_text} />

    </div>
  )
}

// ── Color styles ───────────────────────────────────────────────────────────────
const COLOR_STYLES = {
  Red:    { bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a' },
  Green:  { bg: '#002e12', border: '#2e7d32', text: '#a5d6a7' },
  Blue:   { bg: '#0d1829', border: '#1565c0', text: '#90caf9' },
  Purple: { bg: '#1a0a2e', border: '#6a1b9a', text: '#ce93d8' },
  Black:  { bg: '#121212', border: '#424242', text: '#bdbdbd' },
  Yellow: { bg: '#2e1a00', border: '#f9a825', text: '#ffe082' },
  White:  { bg: '#eee4d4', border: '#9e9e9e', text: '#f5f5f5' },
}
const DEFAULT_COLOR = { bg: '#22222a', border: '#d4c4a8', text: '#aaa' }

function StatChip({ label, value, color = '#1c1008' }) {
  if (value == null || value === '') return null
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[52px]"
      style={{ backgroundColor: '#eee4d4', border: '1px solid #d4c4a8' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: '#7a6248' }}>{label}</span>
      <span className="text-2xl font-extrabold leading-none mt-0.5" style={{ color }}>{value}</span>
    </div>
  )
}

function Chip({ label, bg = '#22222a', border = '#faf6ee', text = '#7a6248' }) {
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
    <div className="rounded-lg border p-4" style={{ borderColor: '#faf6ee', backgroundColor: '#28282f' }}>
      <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: '#1c1008' }}>{text}</p>
    </div>
  )
}

export default function OnePieceCardInfo({ card }) {
  const attrs    = card.attributes || {}
  const cardType = card.card_type  || ''

  const color      = attrs.color || ''
  const colorStyle = COLOR_STYLES[color] || (color ? DEFAULT_COLOR : null)
  const isLeader   = cardType === 'Leader'

  const subTypes = (attrs.sub_types || '')
    .split('/')
    .map(s => s.trim())
    .filter(Boolean)

  const showStats = attrs.power || attrs.cost || (isLeader && attrs.life)

  return (
    <div>

      {/* ── Metadata row ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">

        {/* Color */}
        {colorStyle && color && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: colorStyle.bg, border: `1px solid ${colorStyle.border}`, color: colorStyle.text }}>
            {color}
          </span>
        )}

        {/* Card type */}
        {cardType && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: '#eee4d4', border: '1px solid #d4c4a8', color: '#1c1008' }}>
            {cardType}
          </span>
        )}

        {/* Attribute */}
        {attrs.attribute && (
          <Chip label={attrs.attribute} bg="#1a2535" border="#1565c0" text="#90caf9" />
        )}

        {/* Sub-types */}
        {subTypes.map(t => (
          <Chip key={t} label={t} bg="#22222a" border="#faf6ee" text="#7a6248" />
        ))}

      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      {showStats && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #faf6ee' }}>
          {!isLeader && <StatChip label="Cost"    value={attrs.cost}    color="#ffe082" />}
          <StatChip label="Power"   value={attrs.power}   color="#ef5350" />
          {isLeader && <StatChip label="Life"    value={attrs.life}    color="#66bb6a" />}
          {attrs.counter != null && (
            <StatChip label="Counter" value={'+' + attrs.counter} color="#80cbc4" />
          )}
        </div>
      )}

      {/* ── Rules text ───────────────────────────────────────────────────── */}
      <TextBlock text={card.rules_text} />

    </div>
  )
}

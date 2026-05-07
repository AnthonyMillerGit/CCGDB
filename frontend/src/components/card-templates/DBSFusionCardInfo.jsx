// ── Color styles ───────────────────────────────────────────────────────────────
const COLOR_STYLES = {
  Red:    { bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a' },
  Blue:   { bg: '#0d1829', border: '#1565c0', text: '#90caf9' },
  Yellow: { bg: '#2e1a00', border: '#f9a825', text: '#ffe082' },
  Green:  { bg: '#002e12', border: '#2e7d32', text: '#a5d6a7' },
}
const DEFAULT_COLOR = { bg: '#22222a', border: '#42424e', text: '#aaa' }

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

export default function DBSFusionCardInfo({ card }) {
  const attrs    = card.attributes || {}
  const cardType = card.card_type  || ''

  const color      = attrs.color || ''
  const colorStyle = COLOR_STYLES[color] || (color ? DEFAULT_COLOR : null)
  const isBattle   = cardType === 'BATTLE'
  const isLeader   = cardType === 'LEADER'
  const isExtra    = cardType === 'EXTRA'

  const features = (attrs.features || '')
    .split('/')
    .map(s => s.trim())
    .filter(Boolean)

  const showStats = (isBattle || isLeader) && (attrs.power || attrs.cost)

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
            style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e', color: '#EDF2F6' }}>
            {cardType}
          </span>
        )}

        {/* Features (traits) */}
        {features.map(f => (
          <Chip key={f} label={f} bg="#22222a" border="#32323c" text="#8e8e9e" />
        ))}

      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      {showStats && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #32323c' }}>
          {!isLeader && <StatChip label="Cost"        value={attrs.cost}       color="#ffe082" />}
          <StatChip label="Power"       value={attrs.power}      color="#ef5350" />
          {attrs.comboPower && (
            <StatChip label="Combo"     value={attrs.comboPower} color="#80cbc4" />
          )}
        </div>
      )}

      {/* ── Rules text ───────────────────────────────────────────────────── */}
      <TextBlock text={card.rules_text} />

    </div>
  )
}

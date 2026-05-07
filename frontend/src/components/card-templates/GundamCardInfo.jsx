// ── Color styles ───────────────────────────────────────────────────────────────
const COLOR_STYLES = {
  Red:    { bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a' },
  Blue:   { bg: '#0d1829', border: '#1565c0', text: '#90caf9' },
  Green:  { bg: '#002e12', border: '#2e7d32', text: '#a5d6a7' },
  White:  { bg: '#eee4d4', border: '#9e9e9e', text: '#f5f5f5' },
  Yellow: { bg: '#2e1a00', border: '#f9a825', text: '#ffe082' },
  Purple: { bg: '#1a0a2e', border: '#6a1b9a', text: '#ce93d8' },
}
const DEFAULT_COLOR = { bg: '#22222a', border: '#d4c4a8', text: '#aaa' }

function StatChip({ label, value, color = '#1c1008' }) {
  if (value == null || value === '' || value === '-') return null
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[52px]"
      style={{ backgroundColor: '#eee4d4', border: '1px solid #d4c4a8' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: '#7a6248' }}>{label}</span>
      <span className="text-2xl font-extrabold leading-none mt-0.5" style={{ color }}>{value}</span>
    </div>
  )
}

function Chip({ label, bg = '#22222a', border = '#faf6ee', text = '#7a6248' }) {
  if (!label || label === '-') return null
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

export default function GundamCardInfo({ card }) {
  const attrs    = card.attributes || {}
  const cardType = card.card_type  || ''

  const color      = attrs.color || ''
  const colorStyle = COLOR_STYLES[color] || (color && color !== '-' ? DEFAULT_COLOR : null)

  const showStats = (attrs.ap && attrs.ap !== '-') || (attrs.hp && attrs.hp !== '-')

  return (
    <div>

      {/* ── Metadata row ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">

        {/* Color */}
        {colorStyle && color && color !== '-' && (
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

        {/* Level */}
        {attrs.level && attrs.level !== '-' && (
          <span className="text-xs font-bold px-2.5 py-1 rounded"
            style={{ backgroundColor: '#1a1205', border: '1px solid #f9a825', color: '#ffe082' }}>
            Lv.{attrs.level}
          </span>
        )}

        {/* Cost */}
        {attrs.cost && attrs.cost !== '-' && (
          <Chip label={`Cost ${attrs.cost}`} bg="#1a1a24" border="#d4c4a8" text="#ffe082" />
        )}

        {/* Trait */}
        {attrs.trait && attrs.trait !== '-' && (
          <Chip label={attrs.trait} bg="#22222a" border="#faf6ee" text="#7a6248" />
        )}

        {/* Zone */}
        {attrs.zone && attrs.zone !== '-' && (
          <Chip label={attrs.zone} bg="#1a2535" border="#1565c0" text="#90caf9" />
        )}

      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      {showStats && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #faf6ee' }}>
          <StatChip label="AP" value={attrs.ap} color="#ef5350" />
          <StatChip label="HP" value={attrs.hp} color="#66bb6a" />
        </div>
      )}

      {/* ── Link requirement ──────────────────────────────────────────────── */}
      {attrs.link && attrs.link !== '-' && (
        <div className="rounded-lg border mb-3 px-3 py-2"
          style={{ borderColor: '#faf6ee', backgroundColor: '#28282f' }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7a6248' }}>Link </span>
          <span className="text-xs" style={{ color: '#1c1008' }}>{attrs.link}</span>
        </div>
      )}

      {/* ── Rules text ───────────────────────────────────────────────────── */}
      <TextBlock text={card.rules_text} />

    </div>
  )
}

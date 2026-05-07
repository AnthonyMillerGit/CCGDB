// ── Color styles ───────────────────────────────────────────────────────────────
const COLOR_STYLES = {
  Red:    { bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a' },
  Blue:   { bg: '#0d1829', border: '#1565c0', text: '#90caf9' },
  Yellow: { bg: '#2e1a00', border: '#f9a825', text: '#ffe082' },
  Green:  { bg: '#002e12', border: '#2e7d32', text: '#a5d6a7' },
  Black:  { bg: '#121212', border: '#424242', text: '#bdbdbd' },
  White:  { bg: '#eee4d4', border: '#9e9e9e', text: '#f5f5f5' },
  Purple: { bg: '#1a0a2e', border: '#6a1b9a', text: '#ce93d8' },
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

function TextBlock({ label, text, labelColor = '#7a6248' }) {
  if (!text) return null
  return (
    <div className="rounded-lg border mb-3" style={{ borderColor: '#faf6ee', backgroundColor: '#28282f' }}>
      {label && (
        <div className="px-3 pt-2.5 pb-1">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: labelColor }}>{label}</span>
        </div>
      )}
      <div className={label ? 'px-3 pb-3' : 'p-4'}>
        <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: '#1c1008' }}>{text}</p>
      </div>
    </div>
  )
}

export default function DigimonCardInfo({ card }) {
  const attrs    = card.attributes || {}
  const cardType = card.card_type  || ''

  const color      = attrs.color  || ''
  const color2     = attrs.color2 || ''
  const colorStyle  = COLOR_STYLES[color]  || (color  ? DEFAULT_COLOR : null)
  const colorStyle2 = COLOR_STYLES[color2] || (color2 ? DEFAULT_COLOR : null)

  const isDigimon  = cardType === 'Digimon' || cardType === 'Digi-Egg' || cardType === 'Dual'
  const isTamer    = cardType === 'Tamer'

  const digiTypes = [attrs.digi_type, attrs.digi_type2].filter(Boolean)

  const showStats = isDigimon && (attrs.dp || attrs.level || attrs.play_cost)

  return (
    <div>

      {/* ── Metadata row ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">

        {/* Colors */}
        {colorStyle && color && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: colorStyle.bg, border: `1px solid ${colorStyle.border}`, color: colorStyle.text }}>
            {color}
          </span>
        )}
        {colorStyle2 && color2 && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: colorStyle2.bg, border: `1px solid ${colorStyle2.border}`, color: colorStyle2.text }}>
            {color2}
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
        {attrs.level != null && (
          <span className="text-xs font-bold px-2.5 py-1 rounded"
            style={{ backgroundColor: '#1a1205', border: '1px solid #f9a825', color: '#ffe082' }}>
            Lv.{attrs.level}
          </span>
        )}

        {/* Form / Stage */}
        {(attrs.form || attrs.stage) && (
          <Chip label={attrs.form || attrs.stage} bg="#1a1a24" border="#d4c4a8" text="#ce93d8" />
        )}

        {/* Digi-types */}
        {digiTypes.map(t => (
          <Chip key={t} label={t} bg="#22222a" border="#faf6ee" text="#7a6248" />
        ))}

        {/* Attribute */}
        {attrs.attribute && (
          <Chip label={attrs.attribute} bg="#1a2535" border="#1565c0" text="#90caf9" />
        )}

      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      {showStats && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #faf6ee' }}>
          <StatChip label="Play Cost" value={attrs.play_cost}      color="#ffe082" />
          <StatChip label="Evo Cost"  value={attrs.evolution_cost} color="#80cbc4" />
          <StatChip label="DP"        value={attrs.dp != null ? (attrs.dp / 1000 + 'K') : null} color="#ef5350" />
        </div>
      )}

      {/* ── Tamer cost ────────────────────────────────────────────────────── */}
      {isTamer && attrs.play_cost != null && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #faf6ee' }}>
          <StatChip label="Play Cost" value={attrs.play_cost} color="#ffe082" />
        </div>
      )}

      {/* ── Rules text ───────────────────────────────────────────────────── */}
      <TextBlock text={card.rules_text} />

    </div>
  )
}

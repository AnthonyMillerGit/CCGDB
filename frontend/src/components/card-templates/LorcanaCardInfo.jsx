// ── Ink color styles ───────────────────────────────────────────────────────────
const INK_STYLES = {
  Amber:    { bg: '#2e1a00', border: '#f9a825', text: '#ffe082' },
  Amethyst: { bg: '#1a0a2e', border: '#7b1fa2', text: '#ce93d8' },
  Emerald:  { bg: '#002e12', border: '#2e7d32', text: '#a5d6a7' },
  Ruby:     { bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a' },
  Sapphire: { bg: '#0d1829', border: '#1565c0', text: '#90caf9' },
  Steel:    { bg: '#1a1a24', border: '#546e7a', text: '#b0bec5' },
}
const DEFAULT_INK = { bg: '#22222a', border: 'var(--border)', text: 'var(--text-muted)' }

function StatChip({ label, value, color = '#1c1008' }) {
  if (value == null || value === '') return null
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[52px]"
      style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
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
    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border-panel)', backgroundColor: 'var(--bg-panel)' }}>
      <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: 'var(--text-panel)' }}>{text}</p>
    </div>
  )
}

export default function LorcanaCardInfo({ card }) {
  const attrs    = card.attributes || {}
  const cardType = card.card_type  || ''

  const ink       = attrs.ink || (attrs.inks && attrs.inks[0]) || ''
  const inkStyle  = INK_STYLES[ink] || (ink ? DEFAULT_INK : null)
  const isChar    = cardType === 'Character'
  const isLoc     = cardType === 'Location'
  const keywords  = Array.isArray(attrs.keywords) ? attrs.keywords.filter(Boolean) : []
  const classes   = Array.isArray(attrs.classifications) ? attrs.classifications.filter(Boolean) : []

  const showStats = isChar && (attrs.strength != null || attrs.willpower != null || attrs.lore != null)

  return (
    <div>

      {/* ── Metadata row ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">

        {/* Ink color */}
        {inkStyle && ink && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: inkStyle.bg, border: `1px solid ${inkStyle.border}`, color: inkStyle.text }}>
            {ink}
          </span>
        )}

        {/* Card type */}
        {cardType && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            {cardType}
          </span>
        )}

        {/* Cost */}
        {attrs.cost != null && attrs.cost !== '' && (
          <span className="text-xs font-bold px-2.5 py-1 rounded"
            style={{ backgroundColor: '#1a1a24', border: '1px solid var(--border)', color: '#ffe082' }}>
            Cost {attrs.cost}
          </span>
        )}

        {/* Inkwell indicator */}
        {attrs.inkwell === true && (
          <Chip label="Inkable" bg="#0d1829" border="#1565c0" text="#90caf9" />
        )}
        {attrs.inkwell === false && (
          <Chip label="Non-Inkable" bg="#2e0d0d" border="#b71c1c" text="#ef9a9a" />
        )}

        {/* Keywords */}
        {keywords.map(kw => (
          <Chip key={kw} label={kw} bg="#1a2535" border="#1565c0" text="#90caf9" />
        ))}

        {/* Classifications */}
        {classes.map(c => (
          <Chip key={c} label={c} bg="#22222a" border="#faf6ee" text="#7a6248" />
        ))}

      </div>

      {/* ── Character stats ───────────────────────────────────────────────── */}
      {showStats && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #faf6ee' }}>
          <StatChip label="Lore"      value={attrs.lore}      color="#ffe082" />
          <StatChip label="Strength"  value={attrs.strength}  color="#ef5350" />
          <StatChip label="Willpower" value={attrs.willpower} color="#66bb6a" />
        </div>
      )}

      {/* ── Location stats ────────────────────────────────────────────────── */}
      {isLoc && (attrs.move_cost != null || attrs.lore != null) && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #faf6ee' }}>
          <StatChip label="Move Cost" value={attrs.move_cost} color="#80cbc4" />
          <StatChip label="Lore"      value={attrs.lore}      color="#ffe082" />
          <StatChip label="Willpower" value={attrs.willpower} color="#66bb6a" />
        </div>
      )}

      {/* ── Rules text ───────────────────────────────────────────────────── */}
      <TextBlock text={card.rules_text} />

    </div>
  )
}

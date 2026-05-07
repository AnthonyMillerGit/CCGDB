// ── Pitch (color) styles ───────────────────────────────────────────────────────
const PITCH_STYLES = {
  '1': { bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a', label: 'Red' },
  '2': { bg: '#2e1a00', border: '#f9a825', text: '#ffe082', label: 'Yellow' },
  '3': { bg: '#0d1829', border: '#1565c0', text: '#90caf9', label: 'Blue' },
}

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

export default function FaBCardInfo({ card }) {
  const attrs    = card.attributes || {}
  const cardType = card.card_type  || ''
  const typeLow  = cardType.toLowerCase()

  const pitch      = String(attrs.pitch || '')
  const pitchStyle = PITCH_STYLES[pitch] || null

  const isHero      = typeLow.includes('hero')
  const isEquipment = typeLow.includes('equipment')
  const isAttack    = typeLow.includes('attack')
  const isAction    = typeLow.includes('action')
  const isBlock     = typeLow.includes('block')

  const types    = Array.isArray(attrs.types)    ? attrs.types    : []
  const traits   = Array.isArray(attrs.traits)   ? attrs.traits   : []
  const keywords = Array.isArray(attrs.keywords) ? attrs.keywords.filter(Boolean) : []

  const showStats = isHero
    ? (attrs.health || attrs.intelligence)
    : (attrs.power || attrs.defense || attrs.cost)

  return (
    <div>

      {/* ── Metadata row ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">

        {/* Pitch indicator */}
        {pitchStyle && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: pitchStyle.bg, border: `1px solid ${pitchStyle.border}`, color: pitchStyle.text }}>
            {pitchStyle.label} ({pitch})
          </span>
        )}

        {/* Card type */}
        {cardType && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            {cardType}
          </span>
        )}

        {/* Keywords */}
        {keywords.map(kw => (
          <Chip key={kw} label={kw} bg="#1a2535" border="#1565c0" text="#90caf9" />
        ))}

        {/* Traits */}
        {traits.map(t => (
          <Chip key={t} label={t} bg="#22222a" border="#faf6ee" text="#7a6248" />
        ))}

      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      {showStats && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #faf6ee' }}>
          {isHero ? (
            <>
              <StatChip label="Health"       value={attrs.health}       color="#66bb6a" />
              <StatChip label="Intelligence" value={attrs.intelligence} color="#90caf9" />
            </>
          ) : (
            <>
              {!isEquipment && !isBlock && <StatChip label="Cost"    value={attrs.cost}    color="#ffe082" />}
              {!isEquipment && !isBlock && <StatChip label="Pitch"   value={attrs.pitch}   color="#80cbc4" />}
              {(isAttack || isAction)    && <StatChip label="Power"   value={attrs.power}   color="#ef5350" />}
              <StatChip label="Defense" value={attrs.defense}  color="#66bb6a" />
            </>
          )}
        </div>
      )}

      {/* ── Rules text ───────────────────────────────────────────────────── */}
      <TextBlock text={card.rules_text} />

    </div>
  )
}

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
  if (!label) return null
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

export default function UnionArenaCardInfo({ card }) {
  const attrs    = card.attributes || {}
  const cardType = card.card_type  || ''

  // needEnergy value is like "Yellow4" — split into color + number
  const energy     = attrs.needEnergy?.value || ''
  const showStats  = attrs.bp || attrs.ap

  return (
    <div>

      {/* ── Metadata row ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">

        {/* Card type */}
        {cardType && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: '#eee4d4', border: '1px solid #d4c4a8', color: '#1c1008' }}>
            {cardType}
          </span>
        )}

        {/* Energy requirement */}
        {energy && (
          <span className="text-xs font-bold px-2.5 py-1 rounded"
            style={{ backgroundColor: '#1a1205', border: '1px solid #f9a825', color: '#ffe082' }}>
            {energy}
          </span>
        )}

        {/* Affinity */}
        {attrs.affinity && (
          <Chip label={attrs.affinity} bg="#1a2535" border="#1565c0" text="#90caf9" />
        )}

      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      {showStats && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #faf6ee' }}>
          <StatChip label="AP" value={attrs.ap} color="#ffe082" />
          <StatChip label="BP" value={attrs.bp} color="#ef5350" />
        </div>
      )}

      {/* ── Trigger ───────────────────────────────────────────────────────── */}
      {attrs.trigger && (
        <TextBlock label="Trigger" text={attrs.trigger} labelColor="#80cbc4" />
      )}

      {/* ── Rules text ───────────────────────────────────────────────────── */}
      <TextBlock text={card.rules_text} />

    </div>
  )
}

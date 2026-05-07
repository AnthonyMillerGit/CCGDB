// ── Aura type styles ───────────────────────────────────────────────────────────
const AURA_STYLES = {
  Forest:  { bg: '#002e12', border: '#2e7d32', text: '#a5d6a7' },
  Dark:    { bg: '#1a0a2e', border: '#4527a0', text: '#b39ddb' },
  Cosmic:  { bg: '#0d0d2e', border: '#1a237e', text: '#7986cb' },
  Flame:   { bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a' },
  Electric:{ bg: '#2e1a00', border: '#f9a825', text: '#ffe082' },
  Water:   { bg: '#0d1829', border: '#1565c0', text: '#90caf9' },
  Astral:  { bg: '#002e2a', border: '#00796b', text: '#80cbc4' },
  Spirit:  { bg: '#2e1a2e', border: '#7b1fa2', text: '#e1bee7' },
  Metal:   { bg: '#1a1a24', border: '#546e7a', text: '#b0bec5' },
}
const DEFAULT_AURA = { bg: '#22222a', border: '#d4c4a8', text: '#aaa' }

function Chip({ label, bg = '#22222a', border = '#faf6ee', text = '#7a6248' }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded uppercase tracking-wide"
      style={{ backgroundColor: bg, border: `1px solid ${border}`, color: text }}>
      {label}
    </span>
  )
}

function InfoRow({ label, value, labelColor = '#7a6248' }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-sm mb-1.5">
      <span className="text-xs font-bold uppercase tracking-wider w-32 shrink-0 pt-0.5"
        style={{ color: labelColor }}>{label}</span>
      <span style={{ color: '#1c1008' }}>{value}</span>
    </div>
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

export default function MetaZooCardInfo({ card }) {
  const attrs    = card.attributes || {}
  const cardType = card.card_type  || ''

  const aura      = attrs.aura_type || ''
  const auraStyle = AURA_STYLES[aura] || (aura ? DEFAULT_AURA : null)

  // Parse card type — MetaZoo stores "Beastie   Ghost" with extra whitespace
  const typeBase    = cardType.split(/\s{2,}/)[0]?.trim() || cardType
  const typeSubtype = cardType.split(/\s{2,}/)[1]?.trim() || ''

  const traits = (attrs.traits || '').split(',').map(s => s.trim()).filter(Boolean)

  return (
    <div>

      {/* ── Metadata row ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">

        {/* Aura type */}
        {auraStyle && aura && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: auraStyle.bg, border: `1px solid ${auraStyle.border}`, color: auraStyle.text }}>
            {aura}
          </span>
        )}

        {/* Card type */}
        {typeBase && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: '#eee4d4', border: '1px solid #d4c4a8', color: '#1c1008' }}>
            {typeBase}
          </span>
        )}

        {/* Subtype */}
        {typeSubtype && (
          <Chip label={typeSubtype} bg="#22222a" border="#faf6ee" text="#7a6248" />
        )}

        {/* Cost */}
        {attrs.cost && (
          <span className="text-xs font-bold px-2.5 py-1 rounded"
            style={{ backgroundColor: '#1a1205', border: '1px solid #f9a825', color: '#ffe082' }}>
            Cost: {attrs.cost}
          </span>
        )}

        {/* Traits */}
        {traits.map(t => (
          <Chip key={t} label={t} bg="#1a2535" border="#1565c0" text="#90caf9" />
        ))}

      </div>

      {/* ── Beastie stats ─────────────────────────────────────────────────── */}
      {(attrs.life_points || attrs.spellbook_limit) && (
        <div className="rounded-lg border mb-4 px-3 py-2.5 flex flex-wrap gap-x-6 gap-y-1"
          style={{ borderColor: '#faf6ee', backgroundColor: '#28282f' }}>
          <InfoRow label="Life Points"     value={attrs.life_points}     labelColor="#66bb6a" />
          <InfoRow label="Attack"          value={attrs.attack}          labelColor="#ef5350" />
          <InfoRow label="Spellbook Limit" value={attrs.spellbook_limit} labelColor="#7a6248" />
          <InfoRow label="Terra Bonuses"   value={attrs.terra_bonuses}   labelColor="#80cbc4" />
          <InfoRow label="Fourth Wall"     value={attrs.fourth_wall}     labelColor="#ce93d8" />
        </div>
      )}

      {/* ── Rules text ───────────────────────────────────────────────────── */}
      <TextBlock text={card.rules_text} />

    </div>
  )
}

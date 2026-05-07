import { useMemo } from 'react'

// ── Side styles ────────────────────────────────────────────────────────────────
const SIDE_STYLES = {
  dark:  { bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a', label: 'Dark Side' },
  light: { bg: '#0d1f2e', border: '#1565c0', text: '#90caf9', label: 'Light Side' },
}

// ── Stat chip ──────────────────────────────────────────────────────────────────
function StatChip({ label, value, color = '#1c1008' }) {
  if (value == null || value === '' || value === 'null') return null
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[52px]"
      style={{ backgroundColor: '#eee4d4', border: '1px solid #d4c4a8' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: '#7a6248' }}>{label}</span>
      <span className="text-2xl font-extrabold leading-none mt-0.5" style={{ color }}>{value}</span>
    </div>
  )
}

// ── Strip HTML bold tags from characteristics ──────────────────────────────────
function parseCharacteristics(raw) {
  if (!raw) return []
  return raw
    .replace(/<\/?b>/gi, '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

// ── Uniqueness display ─────────────────────────────────────────────────────────
function uniquenessLabel(u) {
  if (!u || u === '***') return null
  if (u === '*')   return { symbol: '◆',    title: 'Unique' }
  if (u === '**')  return { symbol: '◆◆',   title: 'Restricted 2' }
  if (u === '<>')  return { symbol: '⟨⟩',   title: 'Permanent' }
  return { symbol: u, title: u }
}

// ── Rules text block ───────────────────────────────────────────────────────────
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

// ── Main export ────────────────────────────────────────────────────────────────
export default function SWCCGCardInfo({ card }) {
  const attrs    = card.attributes || {}
  const cardType = card.card_type  || ''

  const side        = (attrs.side || '').toLowerCase()
  const type        = (attrs.type || '').toLowerCase()
  const uniqueness  = attrs.uniqueness
  const destiny     = attrs.destiny
  const power       = attrs.power
  const ability     = attrs.ability
  const armor       = attrs.armor
  const deploy      = attrs.deploy
  const forfeit     = attrs.forfeit
  const maneuver    = attrs.maneuver
  const hyperspeed  = attrs.hyperspeed
  const landspeed   = attrs.landspeed
  const defVal      = attrs.defense_value
  const isEp1       = attrs.episode1
  const isEp7       = attrs.episode7
  const chars       = useMemo(() => parseCharacteristics(attrs.characteristics), [attrs.characteristics])

  const sideStyle  = SIDE_STYLES[side] || null
  const uniqInfo   = uniquenessLabel(uniqueness)

  // Determine which stats to show based on card type
  const isCharacter = type === 'character'
  const isStarship  = type === 'starship'
  const isVehicle   = type === 'vehicle'
  const isCreature  = type === 'creature'
  const isLocation  = type === 'location'

  const showStats = !isLocation && (
    destiny != null || power != null || ability != null || armor != null ||
    deploy != null || forfeit != null || maneuver != null ||
    hyperspeed != null || landspeed != null || defVal != null
  )

  return (
    <div>

      {/* ── Side + type line ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {sideStyle && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: sideStyle.bg, border: `1px solid ${sideStyle.border}`, color: sideStyle.text }}>
            {sideStyle.label}
          </span>
        )}
        {cardType && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: '#eee4d4', border: '1px solid #d4c4a8', color: '#1c1008' }}>
            {uniqInfo && <span className="mr-1" title={uniqInfo.title}>{uniqInfo.symbol}</span>}
            {cardType}
          </span>
        )}
        {isEp1 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded"
            style={{ backgroundColor: '#1a1205', border: '1px solid #f9a825', color: '#ffe082' }}>
            Episode I
          </span>
        )}
        {isEp7 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded"
            style={{ backgroundColor: '#1a1205', border: '1px solid #f9a825', color: '#ffe082' }}>
            Episode VII
          </span>
        )}
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      {showStats && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #faf6ee' }}>
          <StatChip label="Destiny" value={destiny}    color="#ffe082" />
          <StatChip label="Power"   value={power}      color="#ef5350" />
          {(isCharacter || isStarship || isVehicle) && (
            <StatChip label="Ability"  value={ability}  color="#ce93d8" />
          )}
          {(isCharacter || isStarship || isVehicle) && (
            <StatChip label="Armor"    value={armor}    color="#80cbc4" />
          )}
          {isCreature && (
            <StatChip label="Def Value" value={defVal}  color="#ef5350" />
          )}
          {isStarship && (
            <StatChip label="Maneuver"   value={maneuver}   color="#80cbc4" />
          )}
          {isStarship && (
            <StatChip label="Hyperspeed" value={hyperspeed} color="#90caf9" />
          )}
          {isVehicle && (
            <StatChip label="Maneuver"  value={maneuver}  color="#80cbc4" />
          )}
          {isVehicle && (
            <StatChip label="Landspeed" value={landspeed} color="#a5d6a7" />
          )}
          <StatChip label="Deploy"  value={deploy}     color="#66bb6a" />
          <StatChip label="Forfeit" value={forfeit}    color="#7a6248" />
        </div>
      )}

      {/* ── Characteristics ─────────────────────────────────────────────── */}
      {chars.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {chars.map(c => (
            <span key={c} className="text-xs px-2 py-0.5 rounded uppercase tracking-wide"
              style={{ backgroundColor: '#22222a', border: '1px solid #faf6ee', color: '#7a6248' }}>
              {c}
            </span>
          ))}
        </div>
      )}

      {/* ── Rules text ──────────────────────────────────────────────────── */}
      <TextBlock text={card.rules_text} />

    </div>
  )
}

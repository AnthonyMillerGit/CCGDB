import { useMemo } from 'react'

// ── Affiliation styles ─────────────────────────────────────────────────────────
const AFFIL_STYLES = {
  'Federation':   { bg: '#0d1829', border: '#1565c0', text: '#90caf9' },
  'Klingon':      { bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a' },
  'Romulan':      { bg: '#0d2010', border: '#2e7d32', text: '#a5d6a7' },
  'Cardassian':   { bg: '#2a1a00', border: '#795548', text: '#d7ccc8' },
  'Dominion':     { bg: '#1a0a2e', border: '#6a1b9a', text: '#ce93d8' },
  'Ferengi':      { bg: '#2a1500', border: '#e65100', text: '#ffcc80' },
  'Non-Aligned':  { bg: '#22222a', border: '#42424e', text: '#9e9e9e' },
  'Bajoran':      { bg: '#0d1e2e', border: '#0277bd', text: '#b3e5fc' },
  'Borg':         { bg: '#0a1a0a', border: '#388e3c', text: '#c8e6c9' },
  'Kazon':        { bg: '#1a1205', border: '#827717', text: '#f9a825' },
  'Maquis':       { bg: '#2e1a0d', border: '#6d4c41', text: '#d7ccc8' },
  'Starfleet':    { bg: '#0d1829', border: '#283593', text: '#9fa8da' },
  'Equinox':      { bg: '#2e1a0d', border: '#bf360c', text: '#ffccbc' },
  'Hirogen':      { bg: '#2e1a0d', border: '#bf360c', text: '#ffccbc' },
  'Vidiian':      { bg: '#2e1a2e', border: '#7b1fa2', text: '#e1bee7' },
  'Vulcan':       { bg: '#002e2a', border: '#00695c', text: '#a7ffeb' },
}
const DEFAULT_AFFIL = { bg: '#22222a', border: '#42424e', text: '#aaa' }

// ── Icon labels ────────────────────────────────────────────────────────────────
const ICON_LABELS = {
  Cmd: 'Command', Stf: 'Staff', DS9: 'Deep Space Nine', TNG: 'The Next Generation',
  TN:  'The Next Generation', VOY: 'Voyager', AQ: 'Alpha Quadrant',
  GQ:  'Gamma Quadrant', DQ:  'Delta Quadrant', Baj: 'Bajoran',
  Holo: 'Hologram', AU: 'Alternate Universe',
}

function parseIcons(iconStr) {
  if (!iconStr) return []
  return [...(iconStr).matchAll(/\[([^\]]+)\]/g)].map(m => m[1])
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatChip({ label, value, color = '#EDF2F6' }) {
  if (value == null || value === '' || value === 'null') return null
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[52px]"
      style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: '#8e8e9e' }}>{label}</span>
      <span className="text-2xl font-extrabold leading-none mt-0.5" style={{ color }}>{value}</span>
    </div>
  )
}

function Chip({ label, bg = '#22222a', border = '#32323c', text = '#8e8e9e', title }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded uppercase tracking-wide"
      title={title}
      style={{ backgroundColor: bg, border: `1px solid ${border}`, color: text }}>
      {label}
    </span>
  )
}

function TextBlock({ label, text, labelColor = '#8e8e9e' }) {
  if (!text) return null
  return (
    <div className="rounded-lg border mb-3" style={{ borderColor: '#3a3a44', backgroundColor: '#28282f' }}>
      {label && (
        <div className="px-3 pt-2.5 pb-1">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: labelColor }}>{label}</span>
        </div>
      )}
      <div className={label ? 'px-3 pb-3' : 'p-4'}>
        <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: '#EDF2F6' }}>{text}</p>
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function StarTrek2ECardInfo({ card }) {
  const attrs    = card.attributes || {}
  const cardType = card.card_type  || ''
  const typeLow  = cardType.toLowerCase()

  const isPersonnel = typeLow === 'personnel'
  const isShip      = typeLow === 'ship'
  const isMission   = typeLow === 'mission'
  const isDilemma   = typeLow.startsWith('dilemma')

  const affiliation = attrs.affiliation || ''
  const isFreetextAffil = affiliation && (affiliation.toLowerCase().startsWith('any') || affiliation.includes('crew'))
  const affStyle = !isFreetextAffil ? (AFFIL_STYLES[affiliation] || DEFAULT_AFFIL) : null

  const icons      = useMemo(() => parseIcons(attrs.icons), [attrs.icons])
  const staffIcons = useMemo(() => parseIcons(attrs.staff), [attrs.staff])

  const missionTypeLabel = { P: 'Planet', S: 'Space', 'P/S': 'Planet / Space' }[attrs.mission_type] || attrs.mission_type

  const stat1Label = isShip ? 'Range'   : 'Integrity'
  const stat2Label = isShip ? 'Weapons' : 'Cunning'
  const stat3Label = isShip ? 'Shields' : 'Strength'
  const showStats  = (isPersonnel || isShip) &&
    (attrs.integrity_range || attrs.cunning_weapons || attrs.strength_shields)

  return (
    <div>

      {/* ── Unified metadata row ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">

        {/* Card type */}
        {cardType && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e', color: '#EDF2F6' }}>
            {attrs.is_unique && '◆ '}{cardType}
            {missionTypeLabel && ` — ${missionTypeLabel}`}
          </span>
        )}

        {/* Affiliation */}
        {affStyle && affiliation && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded"
            style={{ backgroundColor: affStyle.bg, border: `1px solid ${affStyle.border}`, color: affStyle.text }}>
            {affiliation}
          </span>
        )}

        {/* Cost */}
        {attrs.cost != null && attrs.cost !== '' && (
          <span className="text-xs font-bold px-2.5 py-1 rounded"
            style={{ backgroundColor: '#1a1205', border: '1px solid #f9a825', color: '#ffe082' }}>
            Cost {attrs.cost}
          </span>
        )}

        {/* Species (personnel) */}
        {attrs.species && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded uppercase tracking-wide"
            style={{ backgroundColor: '#1a1a24', border: '1px solid #42424e', color: '#ce93d8' }}>
            {attrs.species}
          </span>
        )}

        {/* Ship class */}
        {attrs.class && (
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded"
            style={{ backgroundColor: '#1a1a24', border: '1px solid #42424e', color: '#ffe082' }}>
            {attrs.class}
          </span>
        )}

        {/* Icons */}
        {icons.map(icon => (
          <Chip key={icon} label={icon} bg="#1a1829" border="#4527a0" text="#ce93d8"
            title={ICON_LABELS[icon] || icon} />
        ))}

        {/* Keywords (events/interrupts) */}
        {attrs.keywords && attrs.keywords.split('.').map(kw => kw.trim()).filter(Boolean).map(kw => (
          <Chip key={kw} label={kw} bg="#1a2535" border="#1565c0" text="#90caf9" />
        ))}

      </div>

      {/* Free-text mission affiliation */}
      {isFreetextAffil && (
        <p className="text-xs mb-4" style={{ color: '#8e8e9e' }}>{affiliation}</p>
      )}

      {/* ── Ship staffing ────────────────────────────────────────────────── */}
      {staffIcons.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className="text-xs" style={{ color: '#8e8e9e' }}>Staffing:</span>
          {staffIcons.map((icon, i) => (
            <Chip key={i} label={icon} bg="#1a2535" border="#1565c0" text="#90caf9"
              title={ICON_LABELS[icon] || icon} />
          ))}
        </div>
      )}

      {/* ── Personnel / Ship stats ───────────────────────────────────────── */}
      {showStats && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #32323c' }}>
          <StatChip label={stat1Label} value={attrs.integrity_range}  color="#90caf9" />
          <StatChip label={stat2Label} value={attrs.cunning_weapons}  color="#ef5350" />
          <StatChip label={stat3Label} value={attrs.strength_shields} color="#66bb6a" />
        </div>
      )}

      {/* ── Mission stats ────────────────────────────────────────────────── */}
      {isMission && (attrs.points || attrs.span || attrs.quadrant) && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #32323c' }}>
          <StatChip label="Points" value={attrs.points} color="#ffe082" />
          <StatChip label="Span"   value={attrs.span}   color="#80cbc4" />
          {attrs.quadrant && (
            <div className="flex flex-col justify-center px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e' }}>
              <span className="text-xs uppercase tracking-wide" style={{ color: '#8e8e9e' }}>Quadrant</span>
              <span className="text-sm font-semibold mt-0.5" style={{ color: '#EDF2F6' }}>{attrs.quadrant}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Skills (personnel skills or mission requirements) ────────────── */}
      {attrs.skills && (
        <TextBlock label={isMission ? 'Requirements' : 'Skills'} text={attrs.skills}
          labelColor={isMission ? '#80cbc4' : '#ffe082'} />
      )}

      {/* ── Rules text ───────────────────────────────────────────────────── */}
      <TextBlock text={card.rules_text} />

    </div>
  )
}

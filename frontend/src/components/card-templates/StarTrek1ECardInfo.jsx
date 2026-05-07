import { useMemo } from 'react'

// ── Property (series/film) styles ──────────────────────────────────────────────
const PROPERTY_STYLES = {
  TNG:  { bg: '#0d1a2e', border: '#1565c0', text: '#90caf9', label: 'TNG' },
  DS9:  { bg: '#2e1a00', border: '#f57f17', text: '#ffcc80', label: 'DS9' },
  VOY:  { bg: '#002e2a', border: '#00796b', text: '#80cbc4', label: 'VOY' },
  ENT:  { bg: '#2e0d00', border: '#bf360c', text: '#ffab91', label: 'ENT' },
  TOS:  { bg: '#1a0a2e', border: '#6a1b9a', text: '#ce93d8', label: 'TOS' },
  // Films
  TVH:  { bg: '#1a0a2e', border: '#4527a0', text: '#b39ddb', label: 'ST IV' },
  TMP:  { bg: '#1a0a2e', border: '#4527a0', text: '#b39ddb', label: 'TMP' },
  TWOK: { bg: '#1a0a2e', border: '#4527a0', text: '#b39ddb', label: 'ST II' },
  TSfS: { bg: '#1a0a2e', border: '#4527a0', text: '#b39ddb', label: 'ST III' },
  TFF:  { bg: '#1a0a2e', border: '#4527a0', text: '#b39ddb', label: 'ST V' },
  TUC:  { bg: '#1a0a2e', border: '#4527a0', text: '#b39ddb', label: 'ST VI' },
  Gen:  { bg: '#1a0a2e', border: '#4527a0', text: '#b39ddb', label: 'Generations' },
  FC:   { bg: '#002e12', border: '#1b5e20', text: '#a5d6a7', label: 'First Contact' },
  Ins:  { bg: '#002e2e', border: '#006064', text: '#80deea', label: 'Insurrection' },
  Nem:  { bg: '#1a1a2e', border: '#37474f', text: '#b0bec5', label: 'Nemesis' },
}
const DEFAULT_PROP = { bg: 'var(--bg-chip)', border: 'var(--border)', text: 'var(--text-muted)' }

// ── Affiliation codes → display ────────────────────────────────────────────────
const AFFIL_MAP = {
  FED:  { label: 'Federation',  bg: '#0d1829', border: '#1565c0', text: '#90caf9' },
  KLI:  { label: 'Klingon',     bg: '#2e0d0d', border: '#b71c1c', text: '#ef9a9a' },
  ROM:  { label: 'Romulan',     bg: '#0d2010', border: '#2e7d32', text: '#a5d6a7' },
  CAR:  { label: 'Cardassian',  bg: '#2a1a00', border: '#795548', text: '#d7ccc8' },
  DOM:  { label: 'Dominion',    bg: '#1a0a2e', border: '#6a1b9a', text: '#ce93d8' },
  FER:  { label: 'Ferengi',     bg: '#2a1500', border: '#e65100', text: '#ffcc80' },
  NON:  { label: 'Non-Aligned', bg: '#22222a', border: 'var(--border)', text: '#9e9e9e' },
  BAJ:  { label: 'Bajoran',     bg: '#0d1e2e', border: '#0277bd', text: '#b3e5fc' },
  BO:   { label: 'Borg',        bg: '#0a1a0a', border: '#388e3c', text: '#c8e6c9' },
  KAZ:  { label: 'Kazon',       bg: '#1a1205', border: '#827717', text: '#f9a825' },
  VID:  { label: 'Vidiian',     bg: '#2e1a2e', border: '#7b1fa2', text: '#e1bee7' },
  HIR:  { label: 'Hirogen',     bg: '#2e1a0d', border: '#bf360c', text: '#ffccbc' },
  STA:  { label: 'Starfleet',   bg: '#0d1829', border: '#283593', text: '#9fa8da' },
  VUL:  { label: 'Vulcan',      bg: '#002e2a', border: '#00695c', text: '#a7ffeb' },
  MQ:   { label: 'Maquis',      bg: '#2e1a0d', border: '#6d4c41', text: '#d7ccc8' },
}

// ── Icon tags ──────────────────────────────────────────────────────────────────
const ICON_LABELS = {
  AU:   'Alternate Universe',
  MU:   'Mirror Universe',
  OS:   'Original Series',
  DQ:   'Delta Quadrant',
  BO:   'Borg',
  22:   '22nd Century',
  TE:   'Temporal',
  HA:   'Hologram',
  Stf:  'Staff',
  Cmd:  'Command',
  Com:  'Communications',
  Def:  'Defense',
  Films:'Films',
  Nav:  'Navigation',
}

function parseIcons(iconStr) {
  if (!iconStr) return []
  return [...iconStr.matchAll(/\[([^\]]+)\]/g)]
    .map(m => m[1])
    .filter(t => !['1','2','2eTNG','2eDS9','2eVOY'].includes(t))
}

function parseAffiliations(affil) {
  if (!affil) return []
  const brackets = [...affil.matchAll(/\[([A-Z]+)\]/g)].map(m => m[1])
  if (brackets.length > 0) return brackets
  // text form: "Federation/Klingon"
  return affil.split('/').map(s => s.trim()).filter(Boolean)
}

function isFreetextAffil(affil) {
  return affil && (affil.toLowerCase().startsWith('any') || affil.includes('crew'))
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatChip({ label, value, color = '#1c1008' }) {
  if (value == null || value === '' || value === 'null') return null
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[52px]"
      style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)' }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-2xl font-extrabold leading-none mt-0.5" style={{ color }}>{value}</span>
    </div>
  )
}

function Chip({ label, bg = '#22222a', border = '#faf6ee', text = '#7a6248', title }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded uppercase tracking-wide"
      title={title}
      style={{ backgroundColor: bg, border: `1px solid ${border}`, color: text }}>
      {label}
    </span>
  )
}

function TextBlock({ label, text, labelColor = '#7a6248' }) {
  if (!text) return null
  return (
    <div className="rounded-lg border mb-3" style={{ borderColor: 'var(--border-panel)', backgroundColor: 'var(--bg-panel)' }}>
      {label && (
        <div className="px-3 pt-2.5 pb-1">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: labelColor }}>{label}</span>
        </div>
      )}
      <div className={label ? 'px-3 pb-3' : 'p-4'}>
        <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: 'var(--text-panel)' }}>{text}</p>
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function StarTrek1ECardInfo({ card }) {
  const attrs    = card.attributes || {}
  const cardType = card.card_type  || ''
  const typeLow  = cardType.toLowerCase()

  const isPersonnel = typeLow.includes('personnel')
  const isShip      = typeLow === 'ship'
  const isMission   = typeLow.includes('mission')
  const isVirtual   = attrs.is_virtual

  const property      = attrs.property || ''
  const affiliation   = attrs.affiliation || ''
  const uniqueness    = attrs.uniqueness
  const classification= attrs.classification || ''
  const icons         = useMemo(() => parseIcons(attrs.icons), [attrs.icons])
  const staffIcons    = useMemo(() => parseIcons(attrs.staff), [attrs.staff])
  const affils        = useMemo(() => parseAffiliations(affiliation), [affiliation])
  const characteristics = useMemo(() =>
    (attrs.characteristics || '').split(',').map(s => s.trim()).filter(Boolean),
    [attrs.characteristics]
  )

  const propStyle = PROPERTY_STYLES[property] || (property ? DEFAULT_PROP : null)

  // Stats labels differ by card type
  const stat1Label = isShip ? 'Range'   : 'Integrity'
  const stat2Label = isShip ? 'Weapons' : 'Cunning'
  const stat3Label = isShip ? 'Shields' : 'Strength'

  const showStats = (isPersonnel || isShip) &&
    (attrs.integrity_range || attrs.cunning_weapons || attrs.strength_shields)

  return (
    <div>

      {/* ── Unified metadata row ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">

        {/* Card type */}
        {cardType && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            {uniqueness && uniqueness !== 'Universal' && '◆ '}{cardType}
          </span>
        )}

        {/* Affiliation(s) */}
        {affils.length > 0 && !isFreetextAffil(affiliation) && affils.map(a => {
          const style = AFFIL_MAP[a] || { bg: '#22222a', border: 'var(--border)', text: '#9e9e9e' }
          return (
            <span key={a} className="text-xs font-semibold px-2.5 py-1 rounded"
              style={{ backgroundColor: style.bg, border: `1px solid ${style.border}`, color: style.text }}>
              {AFFIL_MAP[a]?.label || a}
            </span>
          )
        })}

        {/* Property / series */}
        {propStyle && property && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded"
            style={{ backgroundColor: propStyle.bg, border: `1px solid ${propStyle.border}`, color: propStyle.text }}>
            {propStyle.label || property}
          </span>
        )}

        {/* Classification (SCIENCE, OFFICER, Constitution Class, etc.) */}
        {classification && (
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded"
            style={{ backgroundColor: '#1a1a24', border: '1px solid var(--border)', color: '#ffe082' }}>
            {classification}
          </span>
        )}

        {/* Special icons ([AU], [DQ], [Holo], etc.) */}
        {icons.map(icon => (
          <Chip key={icon} label={icon} bg="#1a1829" border="#4527a0" text="#ce93d8"
            title={ICON_LABELS[icon] || icon} />
        ))}

        {/* Virtual badge */}
        {isVirtual && (
          <Chip label="Virtual" bg="#002e12" border="#1b5e20" text="#a5d6a7" />
        )}

      </div>

      {/* Free-text mission affiliation requirement */}
      {isFreetextAffil(affiliation) && (
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{affiliation}</p>
      )}

      {/* ── Ship staffing ────────────────────────────────────────────────── */}
      {staffIcons.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Staffing:</span>
          {staffIcons.map((icon, i) => (
            <Chip key={i} label={icon} bg="#1a2535" border="#1565c0" text="#90caf9"
              title={ICON_LABELS[icon] || icon} />
          ))}
        </div>
      )}

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      {showStats && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #d4c4a8' }}>
          <StatChip label={stat1Label} value={attrs.integrity_range}   color="#90caf9" />
          <StatChip label={stat2Label} value={attrs.cunning_weapons}   color="#ef5350" />
          <StatChip label={stat3Label} value={attrs.strength_shields}  color="#66bb6a" />
        </div>
      )}

      {/* ── Mission stats ────────────────────────────────────────────────── */}
      {isMission && (attrs.points || attrs.span || attrs.quadrant || attrs.region) && (
        <div className="flex flex-wrap gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid #d4c4a8' }}>
          <StatChip label="Points" value={attrs.points} color="#ffe082" />
          <StatChip label="Span"   value={attrs.span}   color="#80cbc4" />
          {attrs.quadrant && (
            <div className="flex flex-col justify-center px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)' }}>
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Quadrant</span>
              <span className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{attrs.quadrant}</span>
            </div>
          )}
          {attrs.region && (
            <div className="flex flex-col justify-center px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)' }}>
              <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Region</span>
              <span className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{attrs.region}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Characteristics / keywords ───────────────────────────────────── */}
      {characteristics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {characteristics.map(c => (
            <span key={c} className="text-xs px-2 py-0.5 rounded uppercase tracking-wide"
              style={{ backgroundColor: '#22222a', border: '1px solid var(--border-panel)', color: 'var(--text-muted)' }}>
              {c}
            </span>
          ))}
        </div>
      )}

      {/* ── Persona ──────────────────────────────────────────────────────── */}
      {attrs.persona && (
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          <span className="font-semibold uppercase tracking-wide">Persona: </span>
          <span style={{ color: 'var(--text-primary)' }}>{attrs.persona}</span>
        </p>
      )}

      {/* ── Requires ─────────────────────────────────────────────────────── */}
      {attrs.requires && (
        <div className="rounded-lg border mb-3 px-3 py-2"
          style={{ borderColor: 'var(--border-panel)', backgroundColor: 'var(--bg-panel)' }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Requires </span>
          <span className="text-xs" style={{ color: 'var(--text-panel)' }}>{attrs.requires}</span>
        </div>
      )}

      {/* ── Rules text ───────────────────────────────────────────────────── */}
      <TextBlock text={card.rules_text} />

    </div>
  )
}

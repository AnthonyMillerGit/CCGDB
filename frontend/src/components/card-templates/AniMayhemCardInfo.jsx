const CARD_TYPE_COLOR = {
  'Character':      '#7c3aed',
  'Major Disaster': '#ea580c',
  'Minor Disaster': '#ea580c',
  'Combat':         '#dc2626',
  'Location':       '#16a34a',
  'Haven':          '#65a30d',
  'Enhancement':    '#2563eb',
  'Equipment':      '#2563eb',
  'Flash Effect':   '#0891b2',
  'Global Effect':  '#0891b2',
  'Item':           '#92400e',
}

const STAT_CONFIG = [
  { key: 'attack',   label: 'ATK',  icon: '⚔️'  },
  { key: 'defense',  label: 'DEF',  icon: '🛡️'  },
  { key: 'movement', label: 'MOV',  icon: '👟'  },
  { key: 'charm',    label: 'CHM',  icon: '💋'  },
  { key: 'energy',   label: 'NRG',  icon: '⚡'  },
]

const STAT_TYPES = new Set([
  'Character', 'Major Disaster', 'Minor Disaster', 'Location',
])

function StatBox({ label, icon, value }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-lg border"
      style={{ backgroundColor: 'var(--bg-chip)', borderColor: 'var(--border)', minWidth: '52px' }}>
      <span className="text-base mb-0.5">{icon}</span>
      <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</span>
      <span className="text-xs uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-2 items-baseline">
      <span className="text-xs uppercase tracking-wide shrink-0 w-24" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

export default function AniMayhemCardInfo({ card }) {
  const attrs     = card.attributes || {}
  const cardType  = card.card_type || ''
  const typeColor = CARD_TYPE_COLOR[cardType] || 'var(--text-muted)'
  const showStats = STAT_TYPES.has(cardType) || STAT_CONFIG.some(s => attrs[s.key] != null)
  const hasStats  = STAT_CONFIG.some(s => attrs[s.key] != null)

  return (
    <div>
      {/* Series + gender badges */}
      {(attrs.series || attrs.gender) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {attrs.series && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full border"
              style={{ color: typeColor, borderColor: typeColor + '55', backgroundColor: typeColor + '11' }}>
              {attrs.series}
            </span>
          )}
          {attrs.gender && (
            <span className="text-xs font-medium px-2 py-1 rounded-full"
              style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-chip)' }}>
              {attrs.gender === 'Male' ? '♂ Male' : '♀ Female'}
            </span>
          )}
          {attrs.disaster_type && (
            <span className="text-xs font-bold px-2 py-1 rounded-full"
              style={{ color: '#ea580c', backgroundColor: '#ea580c11', border: '1px solid #ea580c55' }}>
              {attrs.disaster_type} Disaster
            </span>
          )}
        </div>
      )}

      {/* Stats row */}
      {hasStats && (
        <div className="flex flex-wrap gap-2 mb-5">
          {STAT_CONFIG.map(({ key, label, icon }) =>
            attrs[key] != null
              ? <StatBox key={key} label={label} icon={icon} value={attrs[key]} />
              : null
          )}
        </div>
      )}

      {/* Skills */}
      {attrs.skills && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {attrs.skills.split(',').map(skill => skill.trim()).filter(Boolean).map(skill => (
            <span key={skill} className="text-xs px-2 py-1 rounded-md font-medium"
              style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Meta info: requirements, uses, categories */}
      {(attrs.requirements || attrs.uses != null || attrs.categories) && (
        <div className="flex flex-col gap-1.5 mb-5 p-4 rounded-xl border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <InfoRow label="Requires" value={attrs.requirements} />
          <InfoRow label="Uses"     value={attrs.uses != null ? String(attrs.uses) : null} />
          <InfoRow label="Types"    value={attrs.categories} />
        </div>
      )}

      {/* Rules text */}
      {card.rules_text && (
        <div className="rounded-xl p-5 mb-5 border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)', lineHeight: '1.7' }}>
          <p className="whitespace-pre-line text-base leading-relaxed">{card.rules_text}</p>
        </div>
      )}
    </div>
  )
}

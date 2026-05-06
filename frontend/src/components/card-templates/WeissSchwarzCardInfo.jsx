const COLOR_STYLES = {
  YELLOW: { bg: '#3a3520', border: '#b8960044', text: '#f1c40f' },
  RED:    { bg: '#3a1a1a', border: '#c0303044', text: '#e74c3c' },
  BLUE:   { bg: '#1a2a3a', border: '#3a7ac044', text: '#5ba4e0' },
  GREEN:  { bg: '#1a3a1a', border: '#3aa04044', text: '#4caf50' },
}

const TRIGGER_ICONS = {
  SOUL:    { symbol: '◆', color: '#e74c3c', label: 'Soul' },
  SHOT:    { symbol: '✦', color: '#f1c40f', label: 'Shot' },
  BOUNCE:  { symbol: '↩', color: '#3498db', label: 'Bounce' },
  DRAW:    { symbol: '⊕', color: '#9b59b6', label: 'Draw' },
  STANDBY: { symbol: '◎', color: '#4caf50', label: 'Standby' },
  GATE:    { symbol: '⬡', color: '#e67e22', label: 'Gate' },
  TREASURE:{ symbol: '★', color: '#f1c40f', label: 'Treasure' },
  CHOICE:  { symbol: '⊗', color: '#1abc9c', label: 'Choice' },
  BOOK:    { symbol: '📖', color: '#8e8e9e', label: 'Book' },
}

function StatBox({ label, value, accent }) {
  if (value == null || value === '') return null
  return (
    <div className="flex flex-col items-center px-4 py-2 rounded-lg border"
      style={{ backgroundColor: '#2a2a34', borderColor: '#42424e', minWidth: '56px' }}>
      <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#8e8e9e' }}>{label}</span>
      <span className="text-xl font-bold" style={{ color: accent || '#EDF2F6' }}>{value}</span>
    </div>
  )
}

function TriggerBadge({ trigger }) {
  const t = TRIGGER_ICONS[trigger?.toUpperCase()] || { symbol: trigger, color: '#8e8e9e', label: trigger }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded"
      style={{ backgroundColor: t.color + '22', border: `1px solid ${t.color}55`, color: t.color }}>
      <span>{t.symbol}</span>
      <span>{t.label}</span>
    </span>
  )
}

export default function WeissSchwarzCardInfo({ card }) {
  const attrs = card.attributes || {}
  const color = (attrs.color || '').toUpperCase()
  const colorStyle = COLOR_STYLES[color] || { bg: '#2a2a34', border: '#42424e44', text: '#8e8e9e' }
  const triggers = Array.isArray(attrs.trigger) ? attrs.trigger.filter(Boolean) : []
  const traits = Array.isArray(attrs.traits) ? attrs.traits.filter(t => t && t !== '-') : []
  const isCharacter = (attrs.type || '').toLowerCase() === 'character'
  const isClimax = (attrs.type || '').toLowerCase() === 'climax'
  const isEvent = (attrs.type || '').toLowerCase() === 'event'

  return (
    <div>
      {/* Type + Color row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {attrs.type && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: colorStyle.bg, border: `1px solid ${colorStyle.border}`, color: colorStyle.text }}>
            {attrs.type}
          </span>
        )}
        {color && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: colorStyle.bg, border: `1px solid ${colorStyle.border}`, color: colorStyle.text }}>
            {color}
          </span>
        )}
        {attrs.rarity && (
          <span className="text-xs px-3 py-1 rounded" style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#8e8e9e' }}>
            {attrs.rarity}
          </span>
        )}
        {attrs.expansion && (
          <span className="text-xs px-3 py-1 rounded" style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#8e8e9e' }}>
            {attrs.expansion}
          </span>
        )}
      </div>

      {/* Stats row */}
      {(isCharacter || isEvent) && (
        <div className="flex flex-wrap items-start gap-3 mb-5">
          {attrs.level != null && (
            <StatBox label="Level" value={attrs.level} accent={colorStyle.text} />
          )}
          {attrs.cost != null && (
            <StatBox label="Cost" value={attrs.cost} />
          )}
          {isCharacter && attrs.power != null && (
            <StatBox label="Power" value={Number(attrs.power).toLocaleString()} accent="#EDF2F6" />
          )}
          {isCharacter && attrs.soul != null && (
            <StatBox label="Soul" value={attrs.soul} accent="#e74c3c" />
          )}
        </div>
      )}

      {/* Trigger icons */}
      {triggers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs uppercase tracking-wide self-center" style={{ color: '#8e8e9e' }}>Trigger:</span>
          {triggers.map((t, i) => <TriggerBadge key={i} trigger={t} />)}
        </div>
      )}

      {/* Traits */}
      {traits.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs uppercase tracking-wide" style={{ color: '#8e8e9e' }}>Traits:</span>
          {traits.map((t, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: colorStyle.bg, border: `1px solid ${colorStyle.border}`, color: colorStyle.text }}>
              《{t}》
            </span>
          ))}
        </div>
      )}

      {/* Rules text */}
      {card.rules_text && (
        <div className="rounded-xl p-5 mb-4 border"
          style={{ backgroundColor: '#35353f', borderColor: '#42424e' }}>
          <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: '#EDF2F6' }}>
            {card.rules_text}
          </p>
        </div>
      )}

      {/* Card code */}
      {attrs.code && (
        <p className="text-xs mt-2" style={{ color: '#555' }}>{attrs.code}</p>
      )}
    </div>
  )
}

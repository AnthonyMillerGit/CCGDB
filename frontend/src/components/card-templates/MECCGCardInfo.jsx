const ALIGNMENT_STYLE = {
  Hero:    { color: 'var(--accent)', backgroundColor: '#1a1a3a', borderColor: '#0097a744' },
  Minion:  { color: '#8b1a3a', backgroundColor: '#3a1a1a', borderColor: '#8b1a3a44' },
  Neutral: { color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' },
}

const MP_TYPE_LABEL = {
  character: 'Character MPs',
  kill:      'Kill MPs',
  misc:      'Misc MPs',
  site:      'Site MPs',
  stage:     'Stage MPs',
}

function StatBox({ label, value }) {
  if (!value || value === '-' || value === '') return null
  return (
    <div className="flex flex-col items-center px-4 py-2 rounded-lg border"
      style={{ backgroundColor: 'var(--bg-chip)', borderColor: 'var(--border)', minWidth: '56px' }}>
      <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

export default function MECCGCardInfo({ card }) {
  const attrs = card.attributes || {}
  const alignment = attrs.alignment || ''
  const alignStyle = ALIGNMENT_STYLE[alignment] || ALIGNMENT_STYLE.Neutral

  const hasStats = attrs.prowess || attrs.body || attrs.mind || attrs.directInfluence || attrs.marshallingPoints

  return (
    <div>
      {/* Alignment badge */}
      {alignment && (
        <div className="flex items-center gap-3 mb-4">
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border"
            style={alignStyle}
          >
            {alignment}
          </span>
          {attrs.unique && (
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Unique
            </span>
          )}
        </div>
      )}

      {/* Stats row */}
      {hasStats && (
        <div className="flex flex-wrap gap-2 mb-5">
          <StatBox label="Prowess" value={attrs.prowess} />
          <StatBox label="Body" value={attrs.body} />
          <StatBox label="Mind" value={attrs.mind} />
          <StatBox label="DI" value={attrs.directInfluence} />
          {attrs.marshallingPoints && (
            <div className="flex flex-col items-center px-4 py-2 rounded-lg border"
              style={{ backgroundColor: 'var(--bg-chip)', borderColor: 'var(--border)', minWidth: '56px' }}>
              <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>
                {MP_TYPE_LABEL[attrs.marshallingPointsType] || 'MPs'}
              </span>
              <span className="text-xl font-bold" style={{ color: '#f4c542' }}>{attrs.marshallingPoints}</span>
            </div>
          )}
          {attrs.strikes && (
            <StatBox label="Strikes" value={attrs.strikes} />
          )}
        </div>
      )}

      {/* Skills / Race / Home Site */}
      {(attrs.skills || attrs.race || attrs.homeSite) && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5">
          {attrs.skills && (
            <div>
              <span className="text-xs uppercase tracking-wide mr-2" style={{ color: 'var(--text-muted)' }}>Class</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{attrs.skills}</span>
            </div>
          )}
          {attrs.race && (
            <div>
              <span className="text-xs uppercase tracking-wide mr-2" style={{ color: 'var(--text-muted)' }}>Race</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{attrs.race}</span>
            </div>
          )}
          {attrs.homeSite && (
            <div>
              <span className="text-xs uppercase tracking-wide mr-2" style={{ color: 'var(--text-muted)' }}>Home Site</span>
              <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{attrs.homeSite}</span>
            </div>
          )}
          {attrs.subtype && (
            <div>
              <span className="text-xs uppercase tracking-wide mr-2" style={{ color: 'var(--text-muted)' }}>Subtype</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{attrs.subtype}</span>
            </div>
          )}
        </div>
      )}

      {/* Rules text (HTML from card database) */}
      {card.rules_text && (
        <div className="rounded-xl p-5 mb-5 border card-rules-html"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)', lineHeight: '1.6' }}>
          <div dangerouslySetInnerHTML={{ __html: card.rules_text }} />
        </div>
      )}
    </div>
  )
}

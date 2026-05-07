// Attribute icon colours (official YGO palette)
const ATTR_COLORS = {
  DARK:    '#9b59b6',
  LIGHT:   '#f1c40f',
  FIRE:    '#e74c3c',
  WATER:   '#3498db',
  EARTH:   '#8B6914',
  WIND:    '#2ecc71',
  DIVINE:  '#e67e22',
}

const FRAME_COLORS = {
  normal:            '#D4A843',
  effect:            '#C07B3A',
  ritual:            '#4A6FA5',
  fusion:            '#7B4FA5',
  synchro:           '#C8C8C8',
  xyz:               '#2C2C2C',
  link:              '#1A4A7A',
  effect_pendulum:   '#4A9A6A',
  normal_pendulum:   '#6A8A5A',
  fusion_pendulum:   '#7B4FA5',
  synchro_pendulum:  '#C8C8C8',
  xyz_pendulum:      '#2C2C2C',
  ritual_pendulum:   '#4A6FA5',
  spell:             '#1A7A5A',
  trap:              '#7A1A4A',
  token:             '#888',
  skill:             '#3A5A8A',
}

// Readable text colours for badges — lighter/adjusted where the frame colour
// is too dark to show against the page background.
const FRAME_TEXT_COLORS = {
  normal:            '#D4A843',
  effect:            '#C07B3A',
  ritual:            '#6A9ADA',
  fusion:            '#AB7FD5',
  synchro:           '#1c1008',
  xyz:               '#b39ddb',
  link:              '#5A9ADA',
  effect_pendulum:   '#6ABA8A',
  normal_pendulum:   '#8AAA7A',
  fusion_pendulum:   '#AB7FD5',
  synchro_pendulum:  '#1c1008',
  xyz_pendulum:      '#b39ddb',
  ritual_pendulum:   '#6A9ADA',
  spell:             '#2AAA7A',
  trap:              '#CC4A8A',
  token:             '#aaa',
  skill:             '#6A8AAA',
}

// Link arrow positions in a 3×3 grid (compass directions)
const ARROW_POSITIONS = {
  'Top-Left':     { row: 0, col: 0 },
  'Top':          { row: 0, col: 1 },
  'Top-Right':    { row: 0, col: 2 },
  'Left':         { row: 1, col: 0 },
  'Right':        { row: 1, col: 2 },
  'Bottom-Left':  { row: 2, col: 0 },
  'Bottom':       { row: 2, col: 1 },
  'Bottom-Right': { row: 2, col: 2 },
}

const BANLIST_STYLE = {
  Forbidden:     { color: '#8b1a3a', bg: '#3a1a1a', label: 'Forbidden' },
  Limited:       { color: '#f4c542', bg: '#3a3a1a', label: 'Limited' },
  'Semi-Limited': { color: '#0097a7', bg: '#1a1a3a', label: 'Semi-Limited' },
}

function LinkArrows({ markers }) {
  const active = new Set(markers || [])
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 20px)', gap: '3px', width: '66px' }}>
      {[0, 1, 2].flatMap(row =>
        [0, 1, 2].map(col => {
          if (row === 1 && col === 1) {
            return (
              <div key="center" className="rounded-sm flex items-center justify-center"
                style={{ width: 20, height: 20, backgroundColor: '#f5f0e8', border: '1px solid #d4c4a8', fontSize: '10px', color: '#7a6248' }}>
                ⬡
              </div>
            )
          }
          const dir = Object.entries(ARROW_POSITIONS).find(([, p]) => p.row === row && p.col === col)?.[0]
          const isActive = dir && active.has(dir)
          return (
            <div key={`${row}-${col}`}
              className="rounded-sm"
              style={{
                width: 20, height: 20,
                backgroundColor: isActive ? '#e74c3c' : '#eee4d4',
                border: `1px solid ${isActive ? '#e74c3c' : '#d4c4a8'}`,
              }}
            />
          )
        })
      )}
    </div>
  )
}

function BanBadge({ format, status }) {
  const s = BANLIST_STYLE[status]
  if (!s) return null
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded"
      style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.color}44` }}>
      {format}: {s.label}
    </span>
  )
}

function LevelStars({ level, isXyz }) {
  if (!level || level < 1) return null
  const count = Math.min(parseInt(level), 13)
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ color: isXyz ? '#9b59b6' : '#f1c40f', fontSize: '16px', lineHeight: 1 }}>
          {isXyz ? '✦' : '★'}
        </span>
      ))}
    </div>
  )
}

export default function YuGiOhCardInfo({ card }) {
  const attrs = card.attributes || {}
  const frameType = attrs.frameType || ''
  const isMonster = !['spell', 'trap', 'token', 'skill'].includes(frameType)
  const isLink = frameType === 'link'
  const isXyz = frameType.startsWith('xyz')
  const isPendulum = frameType.includes('pendulum')
  const frameColor     = FRAME_COLORS[frameType] || '#555'
  const frameTextColor = FRAME_TEXT_COLORS[frameType] || '#1c1008'
  const attrColor = ATTR_COLORS[attrs.attribute] || '#7a6248'
  const banlist = attrs.banlist_info || {}

  // Pendulum cards split the text
  const pendText    = attrs.pend_desc
  const monsterText = attrs.monster_desc
  const rulesText   = card.rules_text

  return (
    <div>
      {/* Card type bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
          style={{ backgroundColor: frameColor + '33', border: `1px solid ${frameColor}88`, color: frameTextColor }}>
          {attrs.humanReadableCardType || attrs.type || 'Unknown'}
        </span>
        {attrs.attribute && (
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: attrColor + '22', border: `1px solid ${attrColor}66`, color: attrColor }}>
            {attrs.attribute}
          </span>
        )}
        {attrs.archetype && (
          <span className="text-xs px-3 py-1 rounded" style={{ backgroundColor: '#faf6ee', border: '1px solid #d4c4a8', color: '#7a6248' }}>
            {attrs.archetype}
          </span>
        )}
      </div>

      {/* Banlist */}
      {Object.keys(banlist).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {banlist.ban_tcg  && <BanBadge format="TCG"  status={banlist.ban_tcg} />}
          {banlist.ban_ocg  && <BanBadge format="OCG"  status={banlist.ban_ocg} />}
          {banlist.ban_goat && <BanBadge format="Goat" status={banlist.ban_goat} />}
        </div>
      )}

      {/* Monster stats */}
      {isMonster && (
        <div className="flex flex-wrap items-start gap-4 mb-5">
          {/* Level/Rank stars */}
          {!isLink && attrs.level && (
            <div>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#7a6248' }}>
                {isXyz ? 'Rank' : 'Level'}
              </p>
              <LevelStars level={attrs.level} isXyz={isXyz} />
            </div>
          )}

          {/* ATK / DEF or LINK */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center px-4 py-2 rounded-lg border"
              style={{ backgroundColor: '#eee4d4', borderColor: '#d4c4a8' }}>
              <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#7a6248' }}>ATK</span>
              <span className="text-xl font-bold" style={{ color: '#1c1008' }}>
                {attrs.atk != null ? attrs.atk : '?'}
              </span>
            </div>
            {isLink ? (
              <div className="flex flex-col items-center px-4 py-2 rounded-lg border"
                style={{ backgroundColor: '#eee4d4', borderColor: '#d4c4a8' }}>
                <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#7a6248' }}>LINK</span>
                <span className="text-xl font-bold" style={{ color: '#1A7ABA' }}>{attrs.linkval}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center px-4 py-2 rounded-lg border"
                style={{ backgroundColor: '#eee4d4', borderColor: '#d4c4a8' }}>
                <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#7a6248' }}>DEF</span>
                <span className="text-xl font-bold" style={{ color: '#1c1008' }}>
                  {attrs.def != null ? attrs.def : '?'}
                </span>
              </div>
            )}
          </div>

          {/* Pendulum scale */}
          {isPendulum && attrs.scale != null && (
            <div className="flex flex-col items-center px-4 py-2 rounded-lg border"
              style={{ backgroundColor: '#eee4d4', borderColor: '#d4c4a8' }}>
              <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#7a6248' }}>Scale</span>
              <span className="text-xl font-bold" style={{ color: '#4A9A6A' }}>{attrs.scale}</span>
            </div>
          )}

          {/* Link arrows */}
          {isLink && attrs.linkmarkers && (
            <div>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#7a6248' }}>Arrows</p>
              <LinkArrows markers={attrs.linkmarkers} />
            </div>
          )}

          {/* Race */}
          {attrs.race && (
            <div className="flex flex-col justify-center">
              <span className="text-xs uppercase tracking-wide" style={{ color: '#7a6248' }}>Type</span>
              <span className="text-sm font-medium mt-0.5" style={{ color: '#1c1008' }}>{attrs.race}</span>
            </div>
          )}
        </div>
      )}

      {/* Pendulum effect */}
      {isPendulum && pendText && (
        <div className="rounded-xl p-4 mb-3 border"
          style={{ backgroundColor: '#1a2a1a', borderColor: '#4A9A6A44' }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#4A9A6A' }}>Pendulum Effect</p>
          <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: '#1c1008' }}>{pendText}</p>
        </div>
      )}

      {/* Monster effect / card text */}
      {isPendulum && monsterText ? (
        <div className="rounded-xl p-4 mb-4 border"
          style={{ backgroundColor: '#faf6ee', borderColor: '#d4c4a8' }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#7a6248' }}>Monster Effect</p>
          <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: '#1c1008' }}>{monsterText}</p>
        </div>
      ) : rulesText && (
        <div className="rounded-xl p-5 mb-4 border"
          style={{ backgroundColor: '#faf6ee', borderColor: '#d4c4a8' }}>
          <p className="whitespace-pre-line leading-relaxed text-base" style={{ color: '#1c1008' }}>{rulesText}</p>
        </div>
      )}
    </div>
  )
}

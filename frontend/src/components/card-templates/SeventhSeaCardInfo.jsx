// ── Faction palette ──────────────────────────────────────────────────────────
const FACTION_STYLES = {
  'Brotherhood':       { text: '#e74c3c', bg: '#3a1a1a', border: '#c03030' },
  'Castille':          { text: '#f1c40f', bg: '#3a3520', border: '#b89600' },
  'Corsairs':          { text: '#9b59b6', bg: '#2a1a3a', border: '#8040a0' },
  'Crimson Rogers':    { text: '#e74c3c', bg: '#3a1a1a', border: '#c03030' },
  "Explorer's Society":{ text: '#4caf50', bg: '#1a3a1a', border: '#3aa040' },
  'Explorers':         { text: '#4caf50', bg: '#1a3a1a', border: '#3aa040' },
  'Eisen':             { text: '#b0b0b0', bg: '#282828', border: '#555555' },
  'Gosse':             { text: '#f1c40f', bg: '#3a3520', border: '#b89600' },
  'Invisible College': { text: '#1abc9c', bg: '#1a3530', border: '#20a080' },
  'Montaigne':         { text: '#5ba4e0', bg: '#1a2a3a', border: '#3070b0' },
  'Rabicano':          { text: '#e67e22', bg: '#3a2a1a', border: '#b06010' },
  'Sea Dogs':          { text: '#5ba4e0', bg: '#1a2535', border: '#3060a0' },
  'Syrneth':           { text: '#1abc9c', bg: '#1a3530', border: '#208070' },
  'Unaligned':         { text: '#7a6248', bg: '#eee4d4', border: '#d4c4a8' },
  'Vendel':            { text: '#4caf50', bg: '#1a3a1a', border: '#3aa040' },
  'Vestenmannavnjar':  { text: '#e67e22', bg: '#3a2a1a', border: '#b06010' },
}
const DEFAULT_FACTION = { text: '#7a6248', bg: '#eee4d4', border: '#d4c4a8' }

// ── Rarity palette ────────────────────────────────────────────────────────────
const RARITY_STYLES = {
  F:     { label: 'Fixed',     color: '#f1c40f' },
  R:     { label: 'Rare',      color: '#9b59b6' },
  U:     { label: 'Uncommon',  color: '#5ba4e0' },
  C:     { label: 'Common',    color: '#7a6248' },
  NMRP:  { label: 'NMRP',      color: '#e67e22' },
  MRP:   { label: 'MRP',       color: '#e67e22' },
}

// ── Attack / parry abbreviation maps ─────────────────────────────────────────
const ATTACK_NAMES = {
  C: 'Cannon', T: 'Thrust', S: 'Slash', D: 'Dagger', P: 'Punch', B: 'Boot',
}
const CANCEL_SKILL = {
  In: 'Inf', Ad: 'Adv', Sw: 'Swa', Ca: 'Can', Sa: 'Sai',
}

// ── Skill definitions ─────────────────────────────────────────────────────────
const SKILLS = [
  { key: 'can', label: 'Cannon',       short: 'Can', color: '#e74c3c' },
  { key: 'sai', label: 'Sailing',      short: 'Sai', color: '#3498db' },
  { key: 'adv', label: 'Adventuring',  short: 'Adv', color: '#4caf50' },
  { key: 'inf', label: 'Influence',    short: 'Inf', color: '#9b59b6' },
  { key: 'swa', label: 'Swashbuckling',short: 'Swa', color: '#f1c40f' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTraits(raw) {
  if (!raw) return { startPort: null, alignment: null, keywords: [] }
  const parts = raw.split(' - ').map(s => s.trim()).filter(Boolean)
  let startPort = null, alignment = null
  const keywords = []
  for (const p of parts) {
    if (/^start:/i.test(p)) { startPort = p.replace(/^start:\s*/i, ''); continue }
    if (/^(heroic|villainous)$/i.test(p)) { alignment = p; continue }
    keywords.push(p)
  }
  return { startPort, alignment, keywords }
}

function parseAdventureTraits(raw) {
  if (!raw) return { distance: null, attachType: null, keywords: [] }
  const parts = raw.split(' - ').map(s => s.trim()).filter(Boolean)
  let distance = null, attachType = null
  const keywords = []
  for (const p of parts) {
    if (/seas? away/i.test(p)) { distance = p; continue }
    if (/attachment/i.test(p)) { attachType = p; continue }
    keywords.push(p)
  }
  return { distance, attachType, keywords }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FactionBar({ faction, fStyle }) {
  if (!faction) return null
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg mb-4"
      style={{ backgroundColor: fStyle.bg, borderLeft: `3px solid ${fStyle.border}` }}>
      <span className="text-xs uppercase tracking-widest font-bold" style={{ color: fStyle.text }}>
        {faction}
      </span>
    </div>
  )
}

function TypeRarityRow({ type, rarity, extra }) {
  const rs = RARITY_STYLES[rarity] || null
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {type && (
        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
          style={{ backgroundColor: '#faf6ee', border: '1px solid #d4c4a8', color: '#1c1008' }}>
          {type}
        </span>
      )}
      {rs && (
        <span className="text-xs font-semibold px-2 py-0.5 rounded"
          style={{ backgroundColor: rs.color + '22', border: `1px solid ${rs.color}55`, color: rs.color }}>
          {rs.label}
        </span>
      )}
      {extra}
    </div>
  )
}

function StatBox({ label, value, color, wide }) {
  if (value == null) return null
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-lg border"
      style={{ backgroundColor: '#eee4d4', borderColor: '#d4c4a8', minWidth: wide ? '80px' : '52px' }}>
      <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#7a6248' }}>{label}</span>
      <span className="text-lg font-bold leading-tight" style={{ color: color || '#1c1008' }}>
        {value === 0 ? '0' : (value ?? '—')}
      </span>
    </div>
  )
}

function SkillRow({ attrs }) {
  const hasSkills = SKILLS.some(s => attrs[s.key] != null)
  if (!hasSkills) return null
  return (
    <div className="mb-5">
      <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#7a6248' }}>Skills</p>
      <div className="flex flex-wrap gap-2">
        {SKILLS.map(({ key, label, color }) => {
          if (attrs[key] == null) return null
          return (
            <div key={key} className="flex flex-col items-center px-3 py-2 rounded-lg border"
              style={{ backgroundColor: '#eee4d4', borderColor: color + '55', minWidth: '64px' }}>
              <span className="text-xs font-semibold mb-0.5" style={{ color }}>{label}</span>
              <span className="text-xl font-bold" style={{ color: '#1c1008' }}>
                {attrs[key] === 0 ? '0' : attrs[key]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CombatRow({ attack, parry, boarding }) {
  const atkName  = ATTACK_NAMES[attack]  || attack
  const parryArr = parry ? parry.split(',').map(p => ATTACK_NAMES[p.trim()] || p.trim()) : []
  if (!atkName && !parryArr.length && !boarding) return null
  return (
    <div className="flex flex-wrap items-center gap-4 mb-4 px-4 py-2 rounded-lg"
      style={{ backgroundColor: '#f0e6d3', border: '1px solid #38384a' }}>
      <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#7a6248' }}>Combat</span>
      {boarding && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: '#7a6248' }}>Boarding:</span>
          <span className="text-xs font-bold" style={{ color: '#1c1008' }}>{boarding}</span>
        </div>
      )}
      {atkName && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: '#7a6248' }}>Attack:</span>
          <span className="text-xs font-bold" style={{ color: '#e74c3c' }}>{atkName}</span>
        </div>
      )}
      {parryArr.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: '#7a6248' }}>Parry:</span>
          <span className="text-xs font-bold" style={{ color: '#5ba4e0' }}>{parryArr.join(', ')}</span>
        </div>
      )}
    </div>
  )
}

function KeywordChips({ keywords, fStyle }) {
  if (!keywords?.length) return null
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {keywords.map((k, i) => (
        <span key={i} className="text-xs px-2 py-0.5 rounded"
          style={{ backgroundColor: fStyle.bg, border: `1px solid ${fStyle.border}55`, color: '#ccc' }}>
          {k}
        </span>
      ))}
    </div>
  )
}

function RulesBox({ text }) {
  if (!text) return null
  return (
    <div className="rounded-xl p-5 mb-4 border"
      style={{ backgroundColor: '#faf6ee', borderColor: '#d4c4a8' }}>
      <p className="whitespace-pre-line leading-relaxed text-sm" style={{ color: '#1c1008' }}>{text}</p>
    </div>
  )
}

function ErrataBox({ text }) {
  if (!text) return null
  return (
    <div className="rounded-xl p-4 mb-4 border"
      style={{ backgroundColor: '#1a1a2a', borderColor: '#3a3a6a' }}>
      <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#0097a7' }}>Errata</p>
      <p className="text-sm" style={{ color: '#aaa' }}>{text}</p>
    </div>
  )
}

// ── Card type layouts ─────────────────────────────────────────────────────────

function CaptainLayout({ card, attrs, fStyle }) {
  const { startPort, alignment, keywords } = parseTraits(attrs.traits)
  const wealth = attrs.wealth || (attrs.cost_raw?.replace(/starting wealth:\s*/i, ''))
  return (
    <>
      <FactionBar faction={attrs.faction} fStyle={fStyle} />
      <TypeRarityRow type="Captain" rarity={attrs.rarity} />

      <div className="flex flex-wrap gap-3 mb-5">
        {wealth && <StatBox label="Starting Wealth" value={wealth} color="#f1c40f" wide />}
        {startPort && (
          <div className="flex flex-col justify-center px-4 py-2 rounded-lg border"
            style={{ backgroundColor: '#eee4d4', borderColor: '#d4c4a8' }}>
            <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#7a6248' }}>Home Port</span>
            <span className="text-sm font-semibold" style={{ color: '#1c1008' }}>{startPort}</span>
          </div>
        )}
        {alignment && (
          <div className="flex flex-col justify-center px-4 py-2 rounded-lg border"
            style={{
              backgroundColor: alignment.toLowerCase() === 'heroic' ? '#1a2a1a' : '#2a1a1a',
              borderColor: alignment.toLowerCase() === 'heroic' ? '#3a8040' : '#803030',
            }}>
            <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#7a6248' }}>Alignment</span>
            <span className="text-sm font-semibold"
              style={{ color: alignment.toLowerCase() === 'heroic' ? '#4caf50' : '#e74c3c' }}>
              {alignment}
            </span>
          </div>
        )}
      </div>

      <SkillRow attrs={attrs} />
      <KeywordChips keywords={keywords} fStyle={fStyle} />
      <RulesBox text={card.rules_text} />
      <ErrataBox text={attrs.errata} />
    </>
  )
}

function CrewLayout({ card, attrs, fStyle }) {
  const { keywords } = parseTraits(attrs.traits)
  return (
    <>
      <FactionBar faction={attrs.faction} fStyle={fStyle} />
      <TypeRarityRow type="Crew" rarity={attrs.rarity}
        extra={attrs.cost_raw && (
          <span className="text-xs px-3 py-1 rounded"
            style={{ backgroundColor: '#eee4d4', border: '1px solid #d4c4a8', color: '#1c1008' }}>
            Cost: <strong>{attrs.cost_raw}</strong>
          </span>
        )}
      />
      <SkillRow attrs={attrs} />
      <CombatRow attack={attrs.attack} parry={attrs.parry} boarding={attrs.boarding} />
      <KeywordChips keywords={keywords} fStyle={fStyle} />
      <RulesBox text={card.rules_text} />
      <ErrataBox text={attrs.errata} />
    </>
  )
}

function ShipLayout({ card, attrs, fStyle }) {
  const { keywords } = parseTraits(attrs.traits)
  const crewMax  = attrs.crew_max  || keywords.find(k => /crew max/i.test(k))?.match(/\d+/)?.[0]
  const moveCost = attrs.move_cost || (attrs.cost_raw?.replace(/move cost:\s*/i, ''))
  const remainingKeywords = keywords.filter(k => !/crew max/i.test(k))
  return (
    <>
      <FactionBar faction={attrs.faction} fStyle={fStyle} />
      <TypeRarityRow type="Ship" rarity={attrs.rarity} />
      <div className="flex flex-wrap gap-3 mb-5">
        {crewMax  && <StatBox label="Crew Max"  value={crewMax}  color="#4caf50" wide />}
        {moveCost && <StatBox label="Move Cost" value={moveCost} color="#5ba4e0" wide />}
      </div>
      <CombatRow attack={attrs.attack} parry={attrs.parry} boarding={attrs.boarding} />
      <KeywordChips keywords={remainingKeywords} fStyle={fStyle} />
      <RulesBox text={card.rules_text} />
      <ErrataBox text={attrs.errata} />
    </>
  )
}

function AdventureLayout({ card, attrs, fStyle }) {
  const { distance, attachType, keywords } = parseAdventureTraits(attrs.traits)
  return (
    <>
      <TypeRarityRow type="Adventure" rarity={attrs.rarity}
        extra={attrs.faction && (
          <span className="text-xs font-bold px-2 py-0.5 rounded"
            style={{ backgroundColor: fStyle.bg, border: `1px solid ${fStyle.border}55`, color: fStyle.text }}>
            {attrs.faction}
          </span>
        )}
      />

      <div className="flex flex-wrap gap-3 mb-5">
        {distance && (
          <div className="flex flex-col items-center px-4 py-2 rounded-lg border"
            style={{ backgroundColor: '#1a2535', borderColor: '#3060a055' }}>
            <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#7a6248' }}>Distance</span>
            <span className="text-sm font-bold" style={{ color: '#5ba4e0' }}>{distance}</span>
          </div>
        )}
        {attrs.cost_raw && (
          <div className="flex flex-col justify-center px-4 py-2 rounded-lg border"
            style={{ backgroundColor: '#eee4d4', borderColor: '#d4c4a8' }}>
            <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#7a6248' }}>Completion Cost</span>
            <span className="text-sm font-semibold" style={{ color: '#1c1008' }}>{attrs.cost_raw}</span>
          </div>
        )}
        {attachType && (
          <div className="flex flex-col items-center px-4 py-2 rounded-lg border"
            style={{ backgroundColor: '#1a2a1a', borderColor: '#3a803055' }}>
            <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#7a6248' }}>Becomes</span>
            <span className="text-sm font-bold" style={{ color: '#4caf50' }}>{attachType}</span>
          </div>
        )}
      </div>

      <CombatRow attack={attrs.attack} parry={attrs.parry} boarding={attrs.boarding} />
      <KeywordChips keywords={keywords} fStyle={fStyle} />
      <RulesBox text={card.rules_text} />
      <ErrataBox text={attrs.errata} />
    </>
  )
}

function ActionChanteyLayout({ card, attrs, fStyle, type }) {
  const cancelSkill = CANCEL_SKILL[attrs.cancel_type] || attrs.cancel_type || ''
  const { keywords } = parseTraits(attrs.traits)
  return (
    <>
      <TypeRarityRow type={type} rarity={attrs.rarity}
        extra={attrs.faction && (
          <span className="text-xs font-bold px-2 py-0.5 rounded"
            style={{ backgroundColor: fStyle.bg, border: `1px solid ${fStyle.border}55`, color: fStyle.text }}>
            {attrs.faction}
          </span>
        )}
      />

      <div className="flex flex-wrap gap-3 mb-5">
        {(attrs.cost_raw || attrs.cost) && (
          <StatBox label="Cost" value={attrs.cost_raw || attrs.cost} color="#1c1008" wide />
        )}
        {attrs.cancel != null && (
          <div className="flex flex-col items-center px-4 py-2 rounded-lg border"
            style={{ backgroundColor: '#eee4d4', borderColor: '#d4c4a8', minWidth: '80px' }}>
            <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#7a6248' }}>Cancel</span>
            <span className="text-lg font-bold" style={{ color: '#e74c3c' }}>
              {attrs.cancel}{cancelSkill ? ` ${cancelSkill}` : ''}
            </span>
          </div>
        )}
      </div>

      <CombatRow attack={attrs.attack} parry={attrs.parry} boarding={attrs.boarding} />
      <KeywordChips keywords={keywords} fStyle={fStyle} />
      <RulesBox text={card.rules_text} />
      <ErrataBox text={attrs.errata} />
    </>
  )
}

function AttachmentLayout({ card, attrs, fStyle }) {
  const { keywords } = parseTraits(attrs.traits)
  return (
    <>
      <TypeRarityRow type="Attachment" rarity={attrs.rarity}
        extra={attrs.faction && (
          <span className="text-xs font-bold px-2 py-0.5 rounded"
            style={{ backgroundColor: fStyle.bg, border: `1px solid ${fStyle.border}55`, color: fStyle.text }}>
            {attrs.faction}
          </span>
        )}
      />
      {(attrs.cost_raw || attrs.cost) && (
        <div className="mb-4">
          <span className="text-xs uppercase tracking-wide mr-2" style={{ color: '#7a6248' }}>Cost:</span>
          <span className="text-sm font-semibold" style={{ color: '#1c1008' }}>
            {attrs.cost_raw || attrs.cost}
          </span>
        </div>
      )}
      <CombatRow attack={attrs.attack} parry={attrs.parry} boarding={attrs.boarding} />
      <KeywordChips keywords={keywords} fStyle={fStyle} />
      <RulesBox text={card.rules_text} />
      <ErrataBox text={attrs.errata} />
    </>
  )
}

function GenericLayout({ card, attrs, fStyle }) {
  const { keywords } = parseTraits(attrs.traits)
  return (
    <>
      {attrs.faction && <FactionBar faction={attrs.faction} fStyle={fStyle} />}
      <TypeRarityRow type={attrs.type || card.card_type} rarity={attrs.rarity} />
      <CombatRow attack={attrs.attack} parry={attrs.parry} boarding={attrs.boarding} />
      <KeywordChips keywords={keywords} fStyle={fStyle} />
      <RulesBox text={card.rules_text} />
      <ErrataBox text={attrs.errata} />
    </>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SeventhSeaCardInfo({ card }) {
  const attrs   = card.attributes || {}
  const type    = (attrs.type || '').toLowerCase()
  const faction = attrs.faction || ''
  const fStyle  = FACTION_STYLES[faction] || DEFAULT_FACTION

  if (type === 'captain')   return <CaptainLayout    card={card} attrs={attrs} fStyle={fStyle} />
  if (type === 'crew')      return <CrewLayout        card={card} attrs={attrs} fStyle={fStyle} />
  if (type === 'ship')      return <ShipLayout        card={card} attrs={attrs} fStyle={fStyle} />
  if (type === 'adventure') return <AdventureLayout   card={card} attrs={attrs} fStyle={fStyle} />
  if (type === 'attachment')return <AttachmentLayout  card={card} attrs={attrs} fStyle={fStyle} />
  if (type === 'action')    return <ActionChanteyLayout card={card} attrs={attrs} fStyle={fStyle} type="Action" />
  if (type === 'chantey')   return <ActionChanteyLayout card={card} attrs={attrs} fStyle={fStyle} type="Chantey" />
  return <GenericLayout card={card} attrs={attrs} fStyle={fStyle} />
}

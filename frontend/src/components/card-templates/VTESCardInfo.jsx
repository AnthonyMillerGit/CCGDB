// ── Discipline full names & colors ────────────────────────────────────────────
const DISC_INFO = {
  abo:    { name: 'Abombwe',           color: '#8B4513' },
  ani:    { name: 'Animalism',         color: '#4caf50' },
  aus:    { name: 'Auspex',            color: '#5ba4e0' },
  cel:    { name: 'Celerity',          color: '#e74c3c' },
  chi:    { name: 'Chimerstry',        color: '#9b59b6' },
  dai:    { name: 'Daimoinon',         color: '#c0392b' },
  dem:    { name: 'Dementation',       color: '#7f8c8d' },
  dom:    { name: 'Dominate',          color: '#2980b9' },
  flight: { name: 'Flight',            color: '#ecf0f1' },
  for:    { name: 'Fortitude',         color: '#f39c12' },
  mal:    { name: 'Maleficia',         color: '#6c3483' },
  mel:    { name: 'Melpominee',        color: '#e91e63' },
  myt:    { name: 'Mytherceria',       color: '#00bcd4' },
  nec:    { name: 'Necromancy',        color: '#27ae60' },
  obe:    { name: 'Obedience',         color: '#795548' },
  obf:    { name: 'Obfuscate',         color: '#607d8b' },
  obl:    { name: 'Obeah',             color: '#f1c40f' },
  obt:    { name: 'Obtenebration',     color: '#5c6bc0' },
  pot:    { name: 'Potence',           color: '#e74c3c' },
  pre:    { name: 'Presence',          color: '#f06292' },
  pro:    { name: 'Protean',           color: '#66bb6a' },
  qui:    { name: 'Quietus',           color: '#26a69a' },
  san:    { name: 'Sanguinus',         color: '#d32f2f' },
  ser:    { name: 'Serpentis',         color: '#558b2f' },
  spi:    { name: 'Spiritus',          color: '#80cbc4' },
  str:    { name: 'Striga',            color: '#ab47bc' },
  tem:    { name: 'Temporis',          color: '#90a4ae' },
  tha:    { name: 'Thaumaturgy',       color: '#ef5350' },
  thn:    { name: 'Thanatosis',        color: '#8d6e63' },
  val:    { name: 'Valeren',           color: '#ffa726' },
  ven:    { name: 'Veneficti',         color: '#a5d6a7' },
  vic:    { name: 'Vicissitude',       color: '#ce93d8' },
  vis:    { name: 'Visceratika',       color: '#78909c' },
  viz:    { name: 'Visionary',         color: '#b0bec5' },
  // Imbued virtues
  def:    { name: 'Defense',           color: '#42a5f5' },
  inn:    { name: 'Innocence',         color: '#fff9c4' },
  jud:    { name: 'Judgment',          color: '#ffd54f' },
  mar:    { name: 'Martyrdom',         color: '#ef9a9a' },
  red:    { name: 'Redemption',        color: '#a5d6a7' },
}

// ── Card type colors ───────────────────────────────────────────────────────────
const TYPE_COLORS = {
  'Vampire':          { bg: '#3a0a0a', border: '#8b0000', text: '#e57373' },
  'Imbued':           { bg: '#1a2a3a', border: '#1565c0', text: '#90caf9' },
  'Master':           { bg: '#1a1a2a', border: '#4a148c', text: '#ce93d8' },
  'Action':           { bg: '#1a2a1a', border: '#2e7d32', text: '#a5d6a7' },
  'Combat':           { bg: '#3a1a1a', border: '#b71c1c', text: '#ef9a9a' },
  'Reaction':         { bg: '#1a2535', border: '#0d47a1', text: '#90caf9' },
  'Action Modifier':  { bg: '#2a1a2a', border: '#6a1b9a', text: '#ce93d8' },
  'Political Action': { bg: '#2a2a1a', border: '#f57f17', text: '#fff176' },
  'Equipment':        { bg: '#2a2515', border: '#e65100', text: '#ffcc80' },
  'Retainer':         { bg: '#1a2520', border: '#00695c', text: '#80cbc4' },
  'Ally':             { bg: '#1a2520', border: '#00695c', text: '#80cbc4' },
  'Event':            { bg: '#251520', border: '#880e4f', text: '#f48fb1' },
  'Conviction':       { bg: '#251a10', border: '#bf360c', text: '#ffab91' },
  'Power':            { bg: '#1a251a', border: '#388e3c', text: '#c8e6c9' },
}
const DEFAULT_TYPE = { bg: '#2a2a34', border: '#42424e', text: '#EDF2F6' }

// ── Clan colors (sect-based approximations) ────────────────────────────────────
const CLAN_SECTS = {
  Camarilla:   ['Brujah','Gangrel','Malkavian','Nosferatu','Toreador','Tremere','Ventrue'],
  Sabbat:      ['Brujah antitribu','Gangrel antitribu','Lasombra','Malkavian antitribu',
                'Nosferatu antitribu','Pander','Toreador antitribu','Tremere antitribu',
                'Tzimisce','Ventrue antitribu'],
  Independent: ['Assamite','Banu Haqim','Caitiff','Giovanni','Hecata','Ministry',
                'Ravnos','Salubri','Samedi','True Brujah','Setite'],
  Laibon:      ['Akunanse','Guruhi','Ishtarri','Osebo','Ahrimane'],
  Imbued:      ['Avenger','Defender','Innocent','Judge','Martyr','Redeemer','Visionary'],
}
function getClanSect(clan) {
  for (const [sect, clans] of Object.entries(CLAN_SECTS)) {
    if (clans.includes(clan)) return sect
  }
  return null
}

// ── Discipline chip ────────────────────────────────────────────────────────────
function DiscChip({ disc }) {
  const isSuperior = disc === disc.toUpperCase() && disc.length > 1
  const key   = disc.toLowerCase()
  const info  = DISC_INFO[key] || { name: disc, color: '#8e8e9e' }
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg"
      style={{
        backgroundColor: info.color + (isSuperior ? '33' : '1a'),
        border: `1px solid ${info.color}${isSuperior ? '99' : '44'}`,
        minWidth: '64px',
      }}>
      <span className="text-xs font-bold leading-none" style={{ color: info.color }}>
        {isSuperior ? '▲' : '▽'} {info.name}
      </span>
      <span className="text-xs mt-0.5" style={{ color: info.color + 'aa', fontSize: '10px' }}>
        {isSuperior ? 'Superior' : 'Inferior'}
      </span>
    </div>
  )
}

// ── Stat box ──────────────────────────────────────────────────────────────────
function StatBox({ label, value, color }) {
  if (value == null) return null
  return (
    <div className="flex flex-col items-center px-4 py-2 rounded-lg border"
      style={{ backgroundColor: '#2a2a34', borderColor: '#42424e', minWidth: '60px' }}>
      <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#8e8e9e' }}>{label}</span>
      <span className="text-xl font-bold" style={{ color: color || '#EDF2F6' }}>{value}</span>
    </div>
  )
}

// ── Type badges ───────────────────────────────────────────────────────────────
function TypeBadges({ types }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(types || []).map(t => {
        const s = TYPE_COLORS[t] || DEFAULT_TYPE
        return (
          <span key={t} className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
            {t}
          </span>
        )
      })}
    </div>
  )
}

// ── Clan badge ────────────────────────────────────────────────────────────────
function ClanBadge({ clan }) {
  const sect = getClanSect(clan)
  const sectColors = {
    Camarilla:   { bg: '#1a2040', border: '#3060c0', text: '#90b8f0' },
    Sabbat:      { bg: '#2a1020', border: '#8b1040', text: '#e080a0' },
    Independent: { bg: '#202010', border: '#806010', text: '#c0a040' },
    Laibon:      { bg: '#102010', border: '#408030', text: '#80c060' },
    Imbued:      { bg: '#102030', border: '#2060a0', text: '#60a0e0' },
  }
  const s = (sect && sectColors[sect]) || { bg: '#2a2a34', border: '#42424e', text: '#aaa' }
  return (
    <div className="flex flex-col items-center px-4 py-2 rounded-lg border"
      style={{ backgroundColor: s.bg, borderColor: s.border }}>
      <span className="text-xs uppercase tracking-wide mb-0.5" style={{ color: '#8e8e9e' }}>
        {sect || 'Clan'}
      </span>
      <span className="text-sm font-bold" style={{ color: s.text }}>{clan}</span>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function VTESCardInfo({ card }) {
  const attrs     = card.attributes || {}
  const types     = attrs.types || []
  const isVampire = types.includes('Vampire')
  const isImbued  = types.includes('Imbued')
  const disciplines = attrs.disciplines || []
  const clans       = attrs.clans || []
  const hasCost   = attrs.pool_cost != null || attrs.blood_cost != null || attrs.conviction_cost != null

  return (
    <div>
      {/* Type badges + combo indicator */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <TypeBadges types={types} />
        {attrs.combo && (
          <span className="text-xs px-2 py-0.5 rounded"
            style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e', color: '#8e8e9e' }}>
            Combo
          </span>
        )}
        {attrs.burn_option && (
          <span className="text-xs px-2 py-0.5 rounded"
            style={{ backgroundColor: '#3a2010', border: '1px solid #c0601055', color: '#e0a060' }}>
            Burn Option
          </span>
        )}
        {attrs.first_set && (
          <span className="text-xs px-2 py-0.5 rounded"
            style={{ backgroundColor: '#2a2a34', border: '1px solid #42424e', color: '#666' }}>
            {attrs.first_set}
          </span>
        )}
      </div>

      {/* Vampire / Imbued stats */}
      {(isVampire || isImbued) && (
        <div className="flex flex-wrap gap-3 mb-5">
          {clans.map(cl => <ClanBadge key={cl} clan={cl} />)}
          <StatBox label="Capacity" value={attrs.capacity} color="#e74c3c" />
          {attrs.group && <StatBox label="Group" value={attrs.group} color="#8e8e9e" />}
        </div>
      )}

      {/* Library card cost + clan restriction */}
      {!isVampire && !isImbued && (clans.length > 0 || hasCost) && (
        <div className="flex flex-wrap gap-3 mb-5">
          {clans.map(cl => <ClanBadge key={cl} clan={cl} />)}
          {attrs.pool_cost   != null && <StatBox label="Pool Cost"       value={attrs.pool_cost}       color="#f1c40f" />}
          {attrs.blood_cost  != null && <StatBox label="Blood Cost"      value={attrs.blood_cost}      color="#e74c3c" />}
          {attrs.conviction_cost != null && <StatBox label="Conviction"  value={attrs.conviction_cost} color="#5ba4e0" />}
        </div>
      )}

      {/* Disciplines */}
      {disciplines.length > 0 && (
        <div className="mb-5">
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#8e8e9e' }}>Disciplines</p>
          <div className="flex flex-wrap gap-2">
            {disciplines.map((d, i) => <DiscChip key={i} disc={d} />)}
          </div>
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

      {/* Legality */}
      {attrs.legality && (
        <p className="text-xs mt-2" style={{ color: '#444' }}>Legal since {attrs.legality}</p>
      )}
    </div>
  )
}

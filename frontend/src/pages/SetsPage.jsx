import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import { GAME_INFO } from '../data/gameInfo'

const MTG_TABS = [
  { key: 'all', label: 'All' },
  { key: 'expansion', label: 'Expansions' },
  { key: 'core', label: 'Core Sets' },
  { key: 'commander', label: 'Commander' },
  { key: 'masters', label: 'Masters' },
  { key: 'draft_innovation', label: 'Draft Innovation' },
  { key: 'starter', label: 'Starter' },
  { key: 'box', label: 'Box Sets' },
  { key: 'promo', label: 'Promos' },
  { key: 'token', label: 'Tokens' },
  { key: 'funny', label: 'Funny' },
  { key: 'memorabilia', label: 'Memorabilia' },
]

const STARTREK_1E_TABS = [
  { key: 'all', label: 'All Sets' },
  { key: 'official', label: 'Official Licensed Sets' },
  { key: 'virtual', label: 'Virtual Fan Expansions' },
]

const STARTREK_2E_TABS = [
  { key: 'all', label: 'All Sets' },
  { key: 'official', label: 'Decipher (Official)' },
  { key: 'community', label: 'Continuing Committee' },
  { key: 'virtual', label: 'Virtual Sets' },
]

const SEVENTHSEA_TABS = [
  { key: 'all', label: 'All Sets' },
  { key: 'official', label: 'AEG (Official)' },
  { key: 'community', label: 'Fan Expansions' },
]

function getTabsForGame(slug) {
  if (slug === 'mtg') return MTG_TABS
  if (slug === 'startrek_1e') return STARTREK_1E_TABS
  if (slug === 'startrek_2e') return STARTREK_2E_TABS
  if (slug === 'seventhsea') return SEVENTHSEA_TABS
  return [{ key: 'all', label: 'All' }]
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown'
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function SetRow({ set, isLast, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 sm:px-5 sm:py-4 cursor-pointer transition-all duration-150 gap-1 sm:gap-0"
      style={{
        backgroundColor: hovered ? '#363d52' : '#2d3243',
        borderBottom: isLast ? 'none' : '1px solid #363d52',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-3">
        {set.icon_url && (
          <img src={set.icon_url} alt="" className="w-5 h-5 invert opacity-50" />
        )}
        <span className="font-medium" style={{ color: '#EAEAEA' }}>{set.name}</span>
      </div>
      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
        <span className="text-xs sm:text-sm" style={{ color: '#8892a4' }}>
          {formatDate(set.release_date)}
        </span>
        <span
          className="text-sm transition-colors duration-150 hidden sm:block"
          style={{ color: hovered ? '#08D9D6' : '#363d52' }}
        >
          →
        </span>
      </div>
    </div>
  )
}

export default function SetsPage() {
  const { slug } = useParams()
  const [sets, setSets] = useState([])
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/games/${slug}`).then(r => r.json()),
      fetch(`${API_URL}/api/games/${slug}/sets`).then(r => r.json())
    ]).then(([gameData, setsData]) => {
      setGame(gameData)
      setSets(setsData)
      setLoading(false)
    })
  }, [slug])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-lg" style={{ color: '#8892a4' }}>Loading sets...</p>
    </div>
  )

  const SET_TYPE_TABS = getTabsForGame(slug)
  const availableTabs = SET_TYPE_TABS.filter(tab =>
    tab.key === 'all' || sets.some(s => s.set_type === tab.key)
  )

  const filteredSets = activeTab === 'all'
    ? sets
    : sets.filter(s => s.set_type === activeTab)

  const showGrouped = activeTab === 'all' && availableTabs.length > 1

  const gameInfo = GAME_INFO[slug]

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        className="text-sm mb-6 flex items-center gap-1 hover:opacity-80 transition-opacity"
        style={{ color: '#08D9D6' }}
      >
        ← Back to Games
      </button>

      <h1 className="text-4xl font-bold mb-3" style={{ color: '#EAEAEA' }}>{game?.name}</h1>

      {gameInfo?.description && (
        <p className="text-base mb-4 max-w-2xl leading-relaxed" style={{ color: '#8892a4' }}>
          {gameInfo.description}
        </p>
      )}

      {gameInfo?.links?.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          {gameInfo.links.map(link => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm px-3 py-1.5 rounded-lg border transition-all duration-150 hover:opacity-80"
              style={{ color: '#08D9D6', borderColor: '#08D9D6', textDecoration: 'none' }}
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      )}

      <h2 className="text-xs font-semibold uppercase tracking-widest mb-2 mt-2" style={{ color: '#8892a4' }}>
        Sets — {filteredSets.length} total
      </h2>

      {/* Filter row — only show if more than one tab available */}
      {availableTabs.length > 1 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 text-sm">
          <span style={{ color: '#8892a4' }}>Show:</span>
          {availableTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="transition-all duration-150 hover:opacity-100"
              style={{
                color: activeTab === tab.key ? '#08D9D6' : '#8892a4',
                fontWeight: activeTab === tab.key ? '600' : '400',
                textDecoration: activeTab === tab.key ? 'underline' : 'none',
                textUnderlineOffset: '3px',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Grouped view — when showing All for a game with categories */}
      {showGrouped ? (
        <div className="flex flex-col gap-6">
          {availableTabs
            .filter(tab => tab.key !== 'all')
            .filter(tab => sets.some(s => s.set_type === tab.key))
            .map(tab => (
              <div key={tab.key}>
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: '#8892a4' }}
                >
                  {tab.label}
                </p>
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#363d52' }}>
                  {sets
                    .filter(s => s.set_type === tab.key)
                    .map((set, index, arr) => (
                      <SetRow
                        key={set.id}
                        set={set}
                        isLast={index === arr.length - 1}
                        onClick={() => navigate(`/sets/${set.id}`)}
                      />
                    ))}
                </div>
              </div>
            ))}

          {/* Sets with no matching type — show under Other */}
          {sets.some(s => !availableTabs.find(t => t.key !== 'all' && t.key === s.set_type)) && (
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: '#8892a4' }}
              >
                Other
              </p>
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#363d52' }}>
                {sets
                  .filter(s => !availableTabs.find(t => t.key !== 'all' && t.key === s.set_type))
                  .map((set, index, arr) => (
                    <SetRow
                      key={set.id}
                      set={set}
                      isLast={index === arr.length - 1}
                      onClick={() => navigate(`/sets/${set.id}`)}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Flat list — filtered view or games with no categories */
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#363d52' }}>
          {filteredSets.map((set, index) => (
            <SetRow
              key={set.id}
              set={set}
              isLast={index === filteredSets.length - 1}
              onClick={() => navigate(`/sets/${set.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
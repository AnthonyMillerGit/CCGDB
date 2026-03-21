import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const SET_TYPE_TABS = [
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

export default function SetsPage() {
  const { slug } = useParams()
  const [sets, setSets] = useState([])
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      fetch(`http://localhost:8000/api/games/${slug}`).then(r => r.json()),
      fetch(`http://localhost:8000/api/games/${slug}/sets`).then(r => r.json())
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

  const filteredSets = activeTab === 'all'
    ? sets
    : sets.filter(s => s.set_type === activeTab)

  const availableTabs = SET_TYPE_TABS.filter(tab =>
    tab.key === 'all' || sets.some(s => s.set_type === tab.key)
  )

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        className="text-sm mb-6 flex items-center gap-1 hover:opacity-80 transition-opacity"
        style={{ color: '#08D9D6' }}
      >
        ← Back to Games
      </button>
      <h2 className="text-3xl font-bold mb-1" style={{ color: '#EAEAEA' }}>{game?.name}</h2>
      <p className="mb-6" style={{ color: '#8892a4' }}>{filteredSets.length} sets</p>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 pb-4" style={{ borderBottom: '1px solid #363d52' }}>
        {availableTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={activeTab === tab.key
              ? { backgroundColor: '#08D9D6', color: '#252A34' }
              : { backgroundColor: '#2d3243', color: '#8892a4', border: '1px solid #363d52' }
            }
          >
            {tab.label}
            <span className="ml-2 text-xs opacity-60">
              {tab.key === 'all' ? sets.length : sets.filter(s => s.set_type === tab.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Sets grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSets.map(set => (
          <div
            key={set.id}
            onClick={() => navigate(`/sets/${set.id}`)}
            className="rounded-xl p-5 cursor-pointer transition-all duration-200 border"
            style={{ backgroundColor: '#2d3243', borderColor: '#363d52' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#08D9D6'
              e.currentTarget.style.backgroundColor = '#363d52'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#363d52'
              e.currentTarget.style.backgroundColor = '#2d3243'
            }}
          >
            <div className="flex items-center gap-3 mb-1">
              {set.icon_url && (
                <img
                  src={set.icon_url}
                  alt={set.name}
                  className="w-8 h-8 invert opacity-70"
                />
              )}
              <h3 className="text-lg font-semibold" style={{ color: '#EAEAEA' }}>{set.name}</h3>
            </div>
            <div className="mt-3">
              <span className="text-sm" style={{ color: '#8892a4' }}>
                Released: {set.release_date?.split('T')[0] ?? 'Unknown'}
              </span>
            </div>
            <div className="mt-2">
              <span className="text-sm font-medium" style={{ color: '#08D9D6' }}>
                {set.total_cards} cards
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
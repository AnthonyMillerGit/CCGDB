import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'

function formatDate(str) {
  if (!str) return null
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function GamesPage() {
  const [games, setGames] = useState([])
  const [recentSets, setRecentSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState(new Set())
  const navigate = useNavigate()
  const { user, authFetch } = useAuth()

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/games`).then(r => r.json()),
      fetch(`${API_URL}/api/sets/recent?limit=10`).then(r => r.json()),
    ]).then(([gamesData, setsData]) => {
      setGames(Array.isArray(gamesData) ? gamesData : [])
      setRecentSets(Array.isArray(setsData) ? setsData : [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user) { setFavorites(new Set()); return }
    authFetch(`${API_URL}/api/users/me/favorites/games`)
      .then(r => r.json())
      .then(data => setFavorites(new Set(Array.isArray(data) ? data.map(g => g.id) : [])))
      .catch(() => setFavorites(new Set()))
  }, [user, authFetch])

  async function toggleFavorite(e, game) {
    e.stopPropagation()
    if (!user) return
    const isFav = favorites.has(game.id)
    setFavorites(prev => {
      const next = new Set(prev)
      isFav ? next.delete(game.id) : next.add(game.id)
      return next
    })
    await authFetch(`${API_URL}/api/users/me/favorites/games/${game.id}`, {
      method: isFav ? 'DELETE' : 'POST',
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p style={{ color: '#7a6248' }} className="text-lg">Loading games...</p>
    </div>
  )

  const filtered = games.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  )

  const favoriteGames = games.filter(g => favorites.has(g.id))

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-1" style={{ color: '#1c1008' }}>Games</h2>
          <p style={{ color: '#7a6248' }}>
            {filtered.length} game{filtered.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </p>
        </div>
        <input
          type="text"
          placeholder="Search games..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg px-4 py-2 text-sm outline-none w-full sm:w-64"
          style={{
            backgroundColor: '#faf6ee',
            border: '1px solid #d4c4a8',
            color: '#1c1008',
          }}
          onFocus={e => e.target.style.borderColor = '#0097a7'}
          onBlur={e => e.target.style.borderColor = '#d4c4a8'}
        />
      </div>

      {/* Recently released */}
      {recentSets.length > 0 && !search && (
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#7a6248' }}>
            ✦ Recently Released
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentSets.map(set => (
              <div
                key={set.set_id}
                className="flex-shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-xl w-40 sm:w-[220px]"
                style={{ backgroundColor: '#faf6ee', border: '1px solid #d4c4a8' }}
              >
                {set.card_back_image ? (
                  <img src={set.card_back_image} alt={set.game_name} className="shrink-0 rounded object-cover"
                    style={{ width: 36, height: 50 }} />
                ) : (
                  <div className="shrink-0 rounded flex items-center justify-center text-xs font-bold"
                    style={{ width: 36, height: 50, backgroundColor: '#d4c4a8', color: '#7a6248' }}>
                    {set.game_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <Link
                    to={`/sets/${set.set_id}`}
                    className="text-sm font-semibold leading-tight hover:underline block truncate"
                    style={{ color: '#1c1008' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {set.set_name}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Link
                      to={`/games/${set.game_slug}`}
                      className="text-xs hover:underline truncate"
                      style={{ color: '#0097a7' }}
                      onClick={e => e.stopPropagation()}
                    >
                      {set.game_name}
                    </Link>
                  </div>
                  {set.release_date && (
                    <p className="text-xs mt-0.5" style={{ color: '#7a6248' }}>{formatDate(set.release_date)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favorites row */}
      {user && favoriteGames.length > 0 && !search && (
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#7a6248' }}>
            ★ Favorites
          </p>
          <div
            className="p-4 rounded-xl border"
            style={{ backgroundColor: '#faf6ee', borderColor: '#d4c4a8' }}
          >
            <div className="flex gap-4 overflow-x-auto pb-1">
              {favoriteGames.map(game => (
                <div key={game.id} className="flex-shrink-0 w-24">
                  <GameCard
                    game={game}
                    isFavorite={true}
                    showStar={!!user}
                    onClick={() => navigate(`/games/${game.slug}`)}
                    onToggleFavorite={e => toggleFavorite(e, game)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All games grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {filtered.map(game => (
          <GameCard
            key={game.id}
            game={game}
            isFavorite={favorites.has(game.id)}
            showStar={!!user}
            onClick={() => navigate(`/games/${game.slug}`)}
            onToggleFavorite={e => toggleFavorite(e, game)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex items-center justify-center h-48">
          <p style={{ color: '#7a6248' }}>No games found matching "{search}"</p>
        </div>
      )}
    </div>
  )
}

function GameCard({ game, isFavorite, showStar, onClick, onToggleFavorite }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      className="cursor-pointer flex flex-col w-full transition-all duration-200 relative"
      style={{ transform: hovered ? 'scale(1.05)' : 'scale(1)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Star button */}
      {showStar && (
        <button
          onClick={onToggleFavorite}
          className="absolute top-1.5 right-1.5 z-10 w-6 h-6 flex items-center justify-center rounded-full transition-all duration-150"
          style={{
            backgroundColor: isFavorite ? 'rgba(0, 151, 167, 0.15)' : 'rgba(28,16,8,0.25)',
            opacity: isFavorite ? 1 : (hovered ? 1 : 0),
            color: isFavorite ? '#0097a7' : '#7a6248',
            fontSize: '0.7rem',
          }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      )}

      {/* Card image */}
      <div
        className="w-full rounded-xl overflow-hidden border transition-all duration-200"
        style={{
          borderColor: hovered ? '#0097a7' : (isFavorite ? '#2a5a58' : '#d4c4a8'),
          boxShadow: hovered ? '0 0 16px rgba(0, 151, 167, 0.25)' : 'none',
          backgroundColor: '#faf6ee',
        }}
      >
        {game.card_back_image ? (
          <img
            src={game.card_back_image}
            alt={game.name}
            className="w-full h-auto object-cover"
          />
        ) : (
          <div
            className="w-full aspect-[2.5/3.5] flex flex-col items-center justify-center gap-2 p-2"
            style={{ backgroundColor: '#faf6ee' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: '#d4c4a8' }}
            >
              🃏
            </div>
            <span
              className="text-xs text-center leading-tight"
              style={{ color: '#7a6248' }}
            >
              {game.name}
            </span>
          </div>
        )}
      </div>

      {/* Name below card */}
      <p
        className="text-xs font-medium text-center mt-2 leading-tight px-1 transition-colors duration-200"
        style={{ color: hovered ? '#0097a7' : '#1c1008' }}
      >
        {game.name}
      </p>
    </div>
  )
}

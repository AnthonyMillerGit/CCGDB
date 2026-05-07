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
      <p style={{ color: '#8e8e9e' }} className="text-lg">Loading games...</p>
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
          <h2 className="text-3xl font-bold mb-1" style={{ color: '#EDF2F6' }}>Games</h2>
          <p style={{ color: '#8e8e9e' }}>
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
            backgroundColor: '#35353f',
            border: '1px solid #42424e',
            color: '#EDF2F6',
          }}
          onFocus={e => e.target.style.borderColor = '#6A7EFC'}
          onBlur={e => e.target.style.borderColor = '#42424e'}
        />
      </div>

      {/* Recently released */}
      {recentSets.length > 0 && !search && (
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8e8e9e' }}>
            ✦ Recently Released
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentSets.map(set => (
              <div
                key={set.set_id}
                className="flex-shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-xl w-40 sm:w-[220px]"
                style={{ backgroundColor: '#35353f', border: '1px solid #42424e' }}
              >
                {set.card_back_image ? (
                  <img src={set.card_back_image} alt={set.game_name} className="shrink-0 rounded object-cover"
                    style={{ width: 36, height: 50 }} />
                ) : (
                  <div className="shrink-0 rounded flex items-center justify-center text-xs font-bold"
                    style={{ width: 36, height: 50, backgroundColor: '#42424e', color: '#8e8e9e' }}>
                    {set.game_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <Link
                    to={`/sets/${set.set_id}`}
                    className="text-sm font-semibold leading-tight hover:underline block truncate"
                    style={{ color: '#EDF2F6' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {set.set_name}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Link
                      to={`/games/${set.game_slug}`}
                      className="text-xs hover:underline truncate"
                      style={{ color: '#6A7EFC' }}
                      onClick={e => e.stopPropagation()}
                    >
                      {set.game_name}
                    </Link>
                  </div>
                  {set.release_date && (
                    <p className="text-xs mt-0.5" style={{ color: '#8e8e9e' }}>{formatDate(set.release_date)}</p>
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
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8e8e9e' }}>
            ★ Favorites
          </p>
          <div
            className="p-4 rounded-xl border"
            style={{ backgroundColor: '#35353f', borderColor: '#42424e' }}
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
          <p style={{ color: '#8e8e9e' }}>No games found matching "{search}"</p>
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
            backgroundColor: isFavorite ? 'rgba(8,217,214,0.15)' : 'rgba(0,0,0,0.45)',
            opacity: isFavorite ? 1 : (hovered ? 1 : 0),
            color: isFavorite ? '#6A7EFC' : '#8e8e9e',
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
          borderColor: hovered ? '#6A7EFC' : (isFavorite ? '#2a5a58' : '#42424e'),
          boxShadow: hovered ? '0 0 16px rgba(8, 217, 214, 0.25)' : 'none',
          backgroundColor: '#35353f',
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
            style={{ backgroundColor: '#35353f' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: '#42424e' }}
            >
              🃏
            </div>
            <span
              className="text-xs text-center leading-tight"
              style={{ color: '#8e8e9e' }}
            >
              {game.name}
            </span>
          </div>
        )}
      </div>

      {/* Name below card */}
      <p
        className="text-xs font-medium text-center mt-2 leading-tight px-1 transition-colors duration-200"
        style={{ color: hovered ? '#6A7EFC' : '#EDF2F6' }}
      >
        {game.name}
      </p>
    </div>
  )
}

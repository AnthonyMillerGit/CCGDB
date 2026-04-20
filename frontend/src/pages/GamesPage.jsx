import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'

export default function GamesPage() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState(new Set())
  const navigate = useNavigate()
  const { user, authFetch } = useAuth()

  useEffect(() => {
    fetch(`${API_URL}/api/games`)
      .then(res => res.json())
      .then(data => { setGames(data); setLoading(false) })
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
      <p style={{ color: '#8892a4' }} className="text-lg">Loading games...</p>
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
          <h2 className="text-3xl font-bold mb-1" style={{ color: '#EAEAEA' }}>Games</h2>
          <p style={{ color: '#8892a4' }}>
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
            backgroundColor: '#2d3243',
            border: '1px solid #363d52',
            color: '#EAEAEA',
          }}
          onFocus={e => e.target.style.borderColor = '#08D9D6'}
          onBlur={e => e.target.style.borderColor = '#363d52'}
        />
      </div>

      {/* Favorites row */}
      {user && favoriteGames.length > 0 && !search && (
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8892a4' }}>
            ★ Favorites
          </p>
          <div
            className="p-4 rounded-xl border"
            style={{ backgroundColor: '#2d3243', borderColor: '#363d52' }}
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
          <p style={{ color: '#8892a4' }}>No games found matching "{search}"</p>
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
            color: isFavorite ? '#08D9D6' : '#8892a4',
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
          borderColor: hovered ? '#08D9D6' : (isFavorite ? '#2a5a58' : '#363d52'),
          boxShadow: hovered ? '0 0 16px rgba(8, 217, 214, 0.25)' : 'none',
          backgroundColor: '#2d3243',
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
            style={{ backgroundColor: '#2d3243' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: '#363d52' }}
            >
              🃏
            </div>
            <span
              className="text-xs text-center leading-tight"
              style={{ color: '#8892a4' }}
            >
              {game.name}
            </span>
          </div>
        )}
      </div>

      {/* Name below card */}
      <p
        className="text-xs font-medium text-center mt-2 leading-tight px-1 transition-colors duration-200"
        style={{ color: hovered ? '#08D9D6' : '#EAEAEA' }}
      >
        {game.name}
      </p>
    </div>
  )
}

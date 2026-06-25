import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'

function formatDate(str) {
  if (!str) return null
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function SetCard({ set, upcoming = false }) {
  return (
    <div
      className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl w-56 sm:w-[300px] snap-start"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      {set.card_back_image ? (
        <img src={set.card_back_image} alt={set.game_name} className="shrink-0 rounded object-cover"
          style={{ width: 42, height: 58 }} />
      ) : (
        <div className="shrink-0 rounded flex items-center justify-center text-xs font-bold"
          style={{ width: 42, height: 58, backgroundColor: 'var(--bg-chip)', color: 'var(--text-muted)' }}>
          {set.game_name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <Link
          to={`/sets/${set.set_id}`}
          className="text-sm font-semibold leading-tight hover:underline block line-clamp-2"
          style={{ color: 'var(--text-primary)' }}
          onClick={e => e.stopPropagation()}
        >
          {set.set_name}
        </Link>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Link
            to={`/games/${set.game_slug}`}
            className="text-xs hover:underline truncate"
            style={{ color: 'var(--accent)' }}
            onClick={e => e.stopPropagation()}
          >
            {set.game_name}
          </Link>
        </div>
        {set.release_date && (
          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            {upcoming && (
              <span className="font-semibold px-1 rounded" style={{ color: 'var(--accent)', backgroundColor: 'var(--bg-chip)' }}>
                Upcoming
              </span>
            )}
            {formatDate(set.release_date)}
          </p>
        )}
      </div>
    </div>
  )
}

function ScrollRow({ title, children }) {
  const scrollRef = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const updateArrows = () => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 1)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  useEffect(() => {
    updateArrows()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [children])

  const scrollBy = dir => {
    const el = scrollRef.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  const arrowStyle = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        {title}
      </p>
      <div className="relative group">
        {canLeft && (
          <button
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full shadow-md flex items-center justify-center transition-opacity opacity-90 hover:opacity-100"
            style={arrowStyle}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory no-scrollbar">
          {children}
        </div>
        {canRight && (
          <button
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full shadow-md flex items-center justify-center transition-opacity opacity-90 hover:opacity-100"
            style={arrowStyle}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default function GamesPage() {
  const [games, setGames] = useState([])
  const [recentSets, setRecentSets] = useState([])
  const [upcomingSets, setUpcomingSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState(new Set())
  const navigate = useNavigate()
  const { user, authFetch } = useAuth()

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/games`).then(r => r.json()),
      fetch(`${API_URL}/api/sets/recent?limit=10`).then(r => r.json()),
      fetch(`${API_URL}/api/sets/upcoming?limit=10`).then(r => r.json()),
    ]).then(([gamesData, setsData, upcomingData]) => {
      setGames(Array.isArray(gamesData) ? gamesData : [])
      setRecentSets(Array.isArray(setsData) ? setsData : [])
      setUpcomingSets(Array.isArray(upcomingData) ? upcomingData : [])
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
      <p style={{ color: 'var(--text-muted)' }} className="text-lg">Loading games...</p>
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
          <h2 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Games</h2>
          <p style={{ color: 'var(--text-muted)' }}>
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
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* Upcoming */}
      {upcomingSets.length > 0 && !search && (
        <div className="mb-8">
          <ScrollRow title="✦ Upcoming">
            {upcomingSets.map(set => (
              <SetCard key={set.set_id} set={set} upcoming />
            ))}
          </ScrollRow>
        </div>
      )}

      {/* Recently released */}
      {recentSets.length > 0 && !search && (
        <div className="mb-10">
          <ScrollRow title="✦ Recently Released">
            {recentSets.map(set => (
              <SetCard key={set.set_id} set={set} />
            ))}
          </ScrollRow>
        </div>
      )}

      {/* Favorites row */}
      {user && favoriteGames.length > 0 && !search && (
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            ★ Favorites
          </p>
          <div
            className="p-4 rounded-xl border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
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
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 3xl:grid-cols-10 ultra:grid-cols-14 gap-4">
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
          <p style={{ color: 'var(--text-muted)' }}>No games found matching "{search}"</p>
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
            color: isFavorite ? 'var(--accent)' : 'var(--text-muted)',
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
          borderColor: hovered ? '#6b2d8f' : (isFavorite ? 'var(--accent)' : 'var(--border)'),
          boxShadow: hovered ? '0 0 16px rgba(107, 45, 143, 0.3)' : 'none',
          backgroundColor: 'var(--bg-surface)',
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
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: 'var(--bg-chip)' }}
            >
              🃏
            </div>
            <span
              className="text-xs text-center leading-tight"
              style={{ color: 'var(--text-muted)' }}
            >
              {game.name}
            </span>
          </div>
        )}
      </div>

      {/* Name below card */}
      <p
        className="text-xs font-medium text-center mt-2 leading-tight px-1 transition-colors duration-200"
        style={{ color: hovered ? 'var(--accent)' : 'var(--text-primary)' }}
      >
        {game.name}
      </p>
    </div>
  )
}

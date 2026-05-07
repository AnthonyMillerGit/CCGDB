import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_URL, goToRandomCard } from '../config'
import { useAuth } from '../context/AuthContext'

// Fixed rotations and offsets for the card fan — deterministic so no layout shift
const FAN_CARDS = [
  { rotate: -32, x: -22, y: 18, z: 1 },
  { rotate: -16, x: -11, y: 6,  z: 2 },
  { rotate: 0,   x: 0,   y: 0,  z: 3 },
  { rotate: 16,  x: 11,  y: 6,  z: 4 },
  { rotate: 32,  x: 22,  y: 18, z: 5 },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [posts, setPosts] = useState([])
  const [fanCards, setFanCards] = useState([])

  useEffect(() => {
    async function load() {
      const [statsRes, postsRes, gamesRes] = await Promise.all([
        fetch(`${API_URL}/api/stats`),
        fetch(`${API_URL}/api/blog?limit=3`),
        fetch(`${API_URL}/api/games`),
      ])
      const statsData = await statsRes.json()
      const postData = await postsRes.json()
      const games = await gamesRes.json()
      setStats(statsData)
      setPosts(Array.isArray(postData) ? postData : [])

      if (Array.isArray(games) && games.length > 0) {
        const shuffled = games.sort(() => Math.random() - 0.5).slice(0, 5)
        const params = shuffled.map(g => `game=${g.slug}`).join('&')
        const cards = await fetch(`${API_URL}/api/cards/random?limit=5&${params}`)
          .then(r => r.json())
          .catch(() => [])
        setFanCards(Array.isArray(cards) ? cards.filter(c => c.image_url) : [])
      }
    }
    load()
  }, [])

  return (
    <div className="max-w-5xl mx-auto">

      {/* Hero */}
      <div className="text-center py-10 sm:py-16 md:py-20">
        <h1 className="text-3xl sm:text-5xl font-bold mb-3" style={{ color: 'var(--accent)' }}>CCGVault</h1>
        <p className="text-base sm:text-xl mb-6" style={{ color: 'var(--text-primary)' }}>
          The collectible card game database for everyone.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/games')}
            className="px-5 py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}
          >
            Browse Games
          </button>
          <button
            onClick={() => goToRandomCard(navigate)}
            className="px-5 py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}
          >
            🎲 Random Card
          </button>
          {!user && (
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-lg font-semibold text-sm sm:text-base"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              Sign Up Free
            </Link>
          )}
        </div>
      </div>

      {/* Stats + card fan */}
      {stats && (
        <div
          className="flex flex-col md:flex-row items-center gap-6 px-5 sm:px-8 py-6 sm:py-8 rounded-xl mb-10 sm:mb-16"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          {/* Stats + description */}
          <div className="flex flex-col items-center md:items-start gap-4 w-full md:w-1/2">
            <div className="flex items-center justify-center md:justify-start gap-6 sm:gap-10 w-full">
              <div className="text-center">
                <p className="text-3xl sm:text-5xl font-bold" style={{ color: 'var(--accent)' }}>{stats.games}</p>
                <p className="text-sm sm:text-base mt-0.5" style={{ color: 'var(--text-muted)' }}>Games</p>
              </div>
              <div className="text-center">
                <p className="text-3xl sm:text-5xl font-bold" style={{ color: 'var(--accent)' }}>{stats.sets?.toLocaleString()}</p>
                <p className="text-sm sm:text-base mt-0.5" style={{ color: 'var(--text-muted)' }}>Sets</p>
              </div>
              <div className="text-center">
                <p className="text-3xl sm:text-5xl font-bold" style={{ color: 'var(--accent)' }}>{stats.cards?.toLocaleString()}</p>
                <p className="text-sm sm:text-base mt-0.5" style={{ color: 'var(--text-muted)' }}>Cards</p>
              </div>
            </div>
            <p className="text-sm sm:text-base text-center md:text-left leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              CCGVault is a collector's companion — track your collection, build decks,
              and explore card games in one place. Whether you're rediscovering a game
              from the 90s or diving into something new, we've got the cards.
              No pricing, no market data — just the games and the collections.
            </p>
          </div>

          {/* Card fan — hidden on mobile, shown md+ */}
          {fanCards.length > 0 && (
            <div className="relative hidden md:block w-full md:w-1/2" style={{ height: 300 }}>
              {fanCards.map((card, i) => {
                const f = FAN_CARDS[i] || FAN_CARDS[0]
                return (
                  <img
                    key={card.id}
                    src={card.image_url}
                    alt={card.name}
                    className="absolute rounded-lg shadow-xl"
                    style={{
                      width: 160,
                      top: '50%',
                      left: '62%',
                      transform: `translate(calc(-50% + ${f.x}px), calc(-50% + ${f.y}px)) rotate(${f.rotate}deg)`,
                      zIndex: f.z,
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}


      {/* Latest posts */}
      {posts.length > 0 && (
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Latest from the Blog</h2>
            <Link to="/blog" className="text-sm" style={{ color: 'var(--accent)' }}>All posts →</Link>
          </div>
          <div className="flex flex-col gap-4">
            {posts.map(post => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="p-5 rounded-xl transition-colors hover:border-[#0097a7]"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{post.title}</p>
                {post.excerpt && (
                  <p className="text-sm line-clamp-2" style={{ color: 'var(--text-muted)' }}>{post.excerpt}</p>
                )}
                <p className="text-xs mt-2" style={{ color: '#9e836a' }}>
                  {new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

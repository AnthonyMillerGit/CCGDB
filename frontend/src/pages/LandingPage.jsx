import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'

// Fixed rotations and offsets for the card fan — deterministic so no layout shift
const FAN_CARDS = [
  { rotate: -18, x: -10, y: 8,  z: 1 },
  { rotate: -9,  x: -5,  y: 3,  z: 2 },
  { rotate: 0,   x: 0,   y: 0,  z: 3 },
  { rotate: 9,   x: 5,   y: 3,  z: 4 },
  { rotate: 18,  x: 10,  y: 8,  z: 5 },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [posts, setPosts] = useState([])
  const [fanCards, setFanCards] = useState([])

  useEffect(() => {
    async function load() {
      const [gamesRes, postsRes] = await Promise.all([
        fetch(`${API_URL}/api/games`),
        fetch(`${API_URL}/api/blog?limit=3`),
      ])
      const games = await gamesRes.json()
      const postData = await postsRes.json()
      setStats({ games: games.length })
      setPosts(Array.isArray(postData) ? postData : [])
    }

    async function loadFanCards() {
      // Pull from a few different popular games for variety
      const slugs = ['mtg', 'pokemon', 'yugioh', 'fab', 'sorcery']
      const results = await Promise.all(
        slugs.map(slug =>
          fetch(`${API_URL}/api/cards/search?q=&game=${slug}&limit=20`)
            .then(r => r.json())
            .catch(() => [])
        )
      )
      const cards = results.flat().filter(c => c.image_url)
      // Pick 5 random cards with images
      const shuffled = cards.sort(() => Math.random() - 0.5).slice(0, 5)
      setFanCards(shuffled)
    }

    load()
    loadFanCards()
  }, [])

  return (
    <div className="max-w-5xl mx-auto">

      {/* Hero */}
      <div className="text-center py-20">
        <h1 className="text-5xl font-bold mb-4" style={{ color: '#08D9D6' }}>CCGVault</h1>
        <p className="text-xl mb-2" style={{ color: '#EAEAEA' }}>
          The collectible card game database for everyone.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate('/games')}
            className="px-6 py-3 rounded-lg font-semibold text-base transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#08D9D6', color: '#252A34' }}
          >
            Browse Games
          </button>
          {!user && (
            <Link
              to="/login"
              className="px-6 py-3 rounded-lg font-semibold text-base"
              style={{ backgroundColor: '#2d3243', border: '1px solid #363d52', color: '#EAEAEA' }}
            >
              Sign Up Free
            </Link>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div
          className="flex flex-col md:flex-row items-center gap-10 px-12 py-10 rounded-xl mb-16"
          style={{ backgroundColor: '#2d3243', border: '1px solid #363d52' }}
        >
          {/* Card fan */}
          {fanCards.length > 0 && (
            <div className="relative flex-shrink-0" style={{ width: 180, height: 220 }}>
              {fanCards.map((card, i) => {
                const f = FAN_CARDS[i] || FAN_CARDS[0]
                return (
                  <img
                    key={card.id}
                    src={card.image_url}
                    alt={card.name}
                    className="absolute rounded-lg shadow-xl"
                    style={{
                      width: 100,
                      top: '50%',
                      left: '50%',
                      transform: `translate(calc(-50% + ${f.x}px), calc(-50% + ${f.y}px)) rotate(${f.rotate}deg)`,
                      zIndex: f.z,
                    }}
                  />
                )
              })}
            </div>
          )}

          {/* Stats + description */}
          <div className="flex flex-col items-center md:items-start gap-4 flex-1">
            <div className="flex items-center gap-12">
              <div className="text-center md:text-left">
                <p className="text-6xl font-bold" style={{ color: '#08D9D6' }}>{stats.games}+</p>
                <p className="text-lg mt-1" style={{ color: '#8892a4' }}>Games</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-6xl font-bold" style={{ color: '#08D9D6' }}>500k+</p>
                <p className="text-lg mt-1" style={{ color: '#8892a4' }}>Cards</p>
              </div>
            </div>
            <p className="text-sm text-center md:text-left max-w-sm" style={{ color: '#8892a4' }}>
              From Magic: The Gathering to obscure 90s games you forgot existed —
              browse cards, track your collection, and build decks across hundreds of games.
            </p>
          </div>
        </div>
      )}


      {/* Latest posts */}
      {posts.length > 0 && (
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: '#EAEAEA' }}>Latest from the Blog</h2>
            <Link to="/blog" className="text-sm" style={{ color: '#08D9D6' }}>All posts →</Link>
          </div>
          <div className="flex flex-col gap-4">
            {posts.map(post => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="p-5 rounded-xl transition-colors hover:border-[#08D9D6]"
                style={{ backgroundColor: '#2d3243', border: '1px solid #363d52' }}
              >
                <p className="font-semibold mb-1" style={{ color: '#EAEAEA' }}>{post.title}</p>
                {post.excerpt && (
                  <p className="text-sm line-clamp-2" style={{ color: '#8892a4' }}>{post.excerpt}</p>
                )}
                <p className="text-xs mt-2" style={{ color: '#4a5268' }}>
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

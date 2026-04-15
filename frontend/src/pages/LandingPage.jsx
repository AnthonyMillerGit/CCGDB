import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'

const FEATURED_SLUGS = ['mtg', 'pokemon', 'yugioh', 'starwars_decipher', 'fab', 'sorcery']

export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [featured, setFeatured] = useState([])
  const [posts, setPosts] = useState([])

  useEffect(() => {
    async function load() {
      const [gamesRes, postsRes] = await Promise.all([
        fetch(`${API_URL}/api/games`),
        fetch(`${API_URL}/api/blog?limit=3`),
      ])
      const games = await gamesRes.json()
      const postData = await postsRes.json()
      setStats({ games: games.length })
      setFeatured(games.filter(g => FEATURED_SLUGS.includes(g.slug)).slice(0, 6))
      setPosts(Array.isArray(postData) ? postData : [])
    }
    load()
  }, [])

  return (
    <div className="max-w-5xl mx-auto">

      {/* Hero */}
      <div className="text-center py-20">
        <h1 className="text-5xl font-bold mb-4" style={{ color: '#08D9D6' }}>CCGVault</h1>
        <p className="text-xl mb-2" style={{ color: '#EAEAEA' }}>
          The collectible card game database for everyone.
        </p>
        <p className="text-base mb-10 max-w-xl mx-auto" style={{ color: '#8892a4' }}>
          From Magic: The Gathering to obscure 90s games you forgot existed —
          browse cards, track your collection, and build decks across hundreds of games.
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
          className="flex items-center justify-center gap-12 py-6 rounded-xl mb-16"
          style={{ backgroundColor: '#2d3243', border: '1px solid #363d52' }}
        >
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: '#08D9D6' }}>{stats.games}+</p>
            <p className="text-sm" style={{ color: '#8892a4' }}>Games</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: '#08D9D6' }}>500k+</p>
            <p className="text-sm" style={{ color: '#8892a4' }}>Cards</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: '#08D9D6' }}>90GB+</p>
            <p className="text-sm" style={{ color: '#8892a4' }}>Card Images</p>
          </div>
        </div>
      )}

      {/* Featured games */}
      {featured.length > 0 && (
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: '#EAEAEA' }}>Featured Games</h2>
            <Link to="/games" className="text-sm" style={{ color: '#08D9D6' }}>View all →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {featured.map(game => (
              <Link
                key={game.id}
                to={`/games/${game.slug}`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-colors hover:border-[#08D9D6]"
                style={{ backgroundColor: '#2d3243', border: '1px solid #363d52' }}
              >
                <img
                  src={`${API_URL}/assets${game.card_back_image}`}
                  alt={game.name}
                  className="w-12 h-12 object-cover rounded"
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }}
                />
                <div className="w-12 h-12 rounded hidden" style={{ backgroundColor: '#363d52' }} />
                <span className="text-xs text-center font-medium leading-tight" style={{ color: '#EAEAEA' }}>
                  {game.name}
                </span>
              </Link>
            ))}
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

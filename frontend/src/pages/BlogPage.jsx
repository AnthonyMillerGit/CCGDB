import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'

const POST_TYPE_LABELS = {
  'deck-tech':  { label: 'Deck Tech',          color: '#a78bfa' },
  'set-review': { label: 'Set Review',          color: '#4ade80' },
  'tournament': { label: 'Tournament Report',   color: '#fb923c' },
  'news':       { label: 'News',                color: '#60a5fa' },
}


const PAGE_SIZE = 20

function PostCard({ post }) {
  const typeInfo = POST_TYPE_LABELS[post.post_type]
  const accentColor = typeInfo?.color || '#0097a7'

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="flex rounded-xl overflow-hidden transition-all"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        textDecoration: 'none',
        alignItems: 'stretch',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#0097a7' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      {/* Left accent bar (no image) or nothing (image handles visual weight) */}
      {!post.cover_image_url && (
        <div style={{ width: 4, flexShrink: 0, backgroundColor: accentColor, opacity: 0.7 }} />
      )}

      {/* Content */}
      <div style={{ flex: 1, padding: '1rem 1.25rem', minWidth: 0 }}>
        {typeInfo && (
          <span style={{
            display: 'inline-block', marginBottom: 6,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
            padding: '2px 8px', borderRadius: 20,
            backgroundColor: accentColor + '22',
            color: accentColor,
            border: `1px solid ${accentColor}44`,
          }}>
            {typeInfo.label}
          </span>
        )}
        <h2 style={{
          color: 'var(--text-primary)', fontWeight: 700,
          fontSize: '1.05rem', lineHeight: 1.35, marginBottom: 6,
        }}>
          {post.title}
        </h2>
        {post.excerpt && (
          <p style={{
            color: 'var(--text-muted)', fontSize: '0.875rem',
            lineHeight: 1.55, marginBottom: 10,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {post.excerpt}
          </p>
        )}
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span>{post.author_name}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Right thumbnail — portrait-friendly, no forced aspect ratio */}
      {post.cover_image_url && (
        <div style={{ width: 110, flexShrink: 0, overflow: 'hidden' }}>
          <img
            src={post.cover_image_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
          />
        </div>
      )}
    </Link>
  )
}

export default function BlogPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/blog?limit=${PAGE_SIZE}`)
        const data = await res.json()
        const list = Array.isArray(data) ? data : []
        setPosts(list)
        setHasMore(list.length === PAGE_SIZE)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const res = await fetch(`${API_URL}/api/blog?limit=${PAGE_SIZE}&offset=${posts.length}`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setPosts(prev => [...prev, ...list])
      setHasMore(list.length === PAGE_SIZE)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Blog</h1>
        {user?.is_admin && (
          <Link
            to="/admin/posts/new"
            className="px-4 py-2 rounded text-sm font-semibold"
            style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}
          >
            + New Post
          </Link>
        )}
      </div>

      {loading && <p style={{ color: 'var(--text-muted)' }}>Loading posts…</p>}

      {!loading && posts.length === 0 && (
        <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
          <p className="text-lg mb-2">No posts yet.</p>
          {user?.is_admin && (
            <p>Hit <strong style={{ color: 'var(--text-primary)' }}>+ New Post</strong> to write your first one.</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-5">
        {posts.map(post => <PostCard key={post.id} post={post} />)}
      </div>

      {hasMore && !loading && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--accent)' }}
          >
            {loadingMore ? 'Loading…' : 'Load more posts'}
          </button>
        </div>
      )}
    </div>
  )
}

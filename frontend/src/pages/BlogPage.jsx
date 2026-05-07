import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'

const PAGE_SIZE = 20

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
        <h1 className="text-3xl font-bold" style={{ color: '#1c1008' }}>Blog</h1>
        {user?.is_admin && (
          <Link
            to="/admin/posts/new"
            className="px-4 py-2 rounded text-sm font-semibold"
            style={{ backgroundColor: '#8b1a3a', color: '#f0e6d3' }}
          >
            + New Post
          </Link>
        )}
      </div>

      {loading && <p style={{ color: '#7a6248' }}>Loading posts…</p>}

      {!loading && posts.length === 0 && (
        <div className="text-center py-20" style={{ color: '#7a6248' }}>
          <p className="text-lg mb-2">No posts yet.</p>
          {user?.is_admin && (
            <p>Hit <strong style={{ color: '#1c1008' }}>+ New Post</strong> to write your first one.</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6">
        {posts.map(post => (
          <Link
            key={post.id}
            to={`/blog/${post.slug}`}
            className="p-6 rounded-xl transition-colors hover:border-[#0097a7]"
            style={{ backgroundColor: '#faf6ee', border: '1px solid #d4c4a8' }}
          >
            <h2 className="text-xl font-bold mb-2" style={{ color: '#1c1008' }}>{post.title}</h2>
            {post.excerpt && (
              <p className="text-sm mb-3 line-clamp-3" style={{ color: '#7a6248' }}>{post.excerpt}</p>
            )}
            <div className="flex items-center gap-3 text-xs" style={{ color: '#9e836a' }}>
              <span>{post.author_name}</span>
              <span>·</span>
              <span>{new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && !loading && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#faf6ee', border: '1px solid #d4c4a8', color: '#0097a7' }}
          >
            {loadingMore ? 'Loading…' : 'Load more posts'}
          </button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config'

function postStatus(post) {
  if (!post.published_at) return 'draft'
  if (new Date(post.published_at) > new Date()) return 'scheduled'
  return 'published'
}

const STATUS_STYLE = {
  published: { bg: '#0a2e2d', color: '#08D9D6', border: '#08D9D6', label: 'Published' },
  scheduled:  { bg: '#2e2a0a', color: '#f4c542', border: '#f4c542', label: 'Scheduled' },
  draft:      { bg: '#252A34', color: '#8892a4', border: '#4a5268', label: 'Draft' },
}

export default function AdminPostsPage() {
  const { user, authFetch } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    if (user && !user.is_admin) { navigate('/blog'); return }
  }, [user, navigate])

  useEffect(() => {
    authFetch(`${API_URL}/api/admin/posts`)
      .then(r => r.json())
      .then(data => { setPosts(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [authFetch])

  async function handleDelete(post) {
    setDeleting(post.slug)
    try {
      await authFetch(`${API_URL}/api/admin/posts/${post.slug}`, { method: 'DELETE' })
      setPosts(prev => prev.filter(p => p.slug !== post.slug))
    } finally {
      setDeleting(null)
      setConfirm(null)
    }
  }

  const published = posts.filter(p => postStatus(p) === 'published')
  const scheduled = posts.filter(p => postStatus(p) === 'scheduled')
  const drafts    = posts.filter(p => postStatus(p) === 'draft')

  function Section({ title, items }) {
    if (items.length === 0) return null
    return (
      <div className="mb-8">
        <h2 className="text-xs font-semibold uppercase mb-3" style={{ color: '#8892a4' }}>{title}</h2>
        <div className="flex flex-col gap-3">
          {items.map(post => {
            const s = STATUS_STYLE[postStatus(post)]
            return (
              <div
                key={post.slug}
                className="p-4 rounded-xl flex items-center justify-between gap-4"
                style={{ backgroundColor: '#2d3243', border: '1px solid #363d52' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
                      style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                    >
                      {s.label}
                    </span>
                    {post.published_at && (
                      <span className="text-xs" style={{ color: '#4a5268' }}>
                        {new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold truncate" style={{ color: '#EAEAEA' }}>{post.title}</p>
                  {post.excerpt && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#8892a4' }}>{post.excerpt}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {postStatus(post) === 'published' && (
                    <Link
                      to={`/blog/${post.slug}`}
                      className="text-xs px-3 py-1.5 rounded"
                      style={{ backgroundColor: '#363d52', color: '#8892a4', border: '1px solid #4a5268' }}
                    >
                      View
                    </Link>
                  )}
                  <Link
                    to={`/admin/posts/${post.slug}/edit`}
                    className="text-xs px-3 py-1.5 rounded"
                    style={{ backgroundColor: '#363d52', color: '#08D9D6', border: '1px solid #4a5268' }}
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => setConfirm(post)}
                    disabled={deleting === post.slug}
                    className="text-xs px-3 py-1.5 rounded disabled:opacity-50"
                    style={{ backgroundColor: '#363d52', color: '#FF2E63', border: '1px solid #4a5268' }}
                  >
                    {deleting === post.slug ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <div className="rounded-xl p-6 w-full max-w-sm mx-4" style={{ backgroundColor: '#2d3243', border: '1px solid #363d52' }}>
            <p className="text-sm mb-6" style={{ color: '#EAEAEA' }}>
              Delete <strong>"{confirm.title}"</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} className="px-4 py-2 rounded text-sm"
                style={{ backgroundColor: '#363d52', color: '#EAEAEA' }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(confirm)} className="px-4 py-2 rounded text-sm font-semibold"
                style={{ backgroundColor: '#FF2E63', color: '#fff' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#EAEAEA' }}>Posts</h1>
        <Link
          to="/admin/posts/new"
          className="px-4 py-2 rounded text-sm font-semibold"
          style={{ backgroundColor: '#08D9D6', color: '#252A34' }}
        >
          + New Post
        </Link>
      </div>

      {loading && <p style={{ color: '#8892a4' }}>Loading…</p>}

      {!loading && posts.length === 0 && (
        <div className="text-center py-20" style={{ color: '#8892a4' }}>
          <p className="text-lg mb-2">No posts yet.</p>
          <p>Hit <strong style={{ color: '#EAEAEA' }}>+ New Post</strong> to write your first one.</p>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <>
          <Section title="Published" items={published} />
          <Section title="Scheduled" items={scheduled} />
          <Section title="Drafts" items={drafts} />
        </>
      )}
    </div>
  )
}

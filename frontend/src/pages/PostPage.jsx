import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { generateHTML } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import DOMPurify from 'dompurify'
import { API_URL } from '../config'
import '../styles/editor.css'
import { useAuth } from '../context/AuthContext'

function renderBody(body) {
  if (!body || Object.keys(body).length === 0) return ''
  try {
    const html = generateHTML(body, [StarterKit])
    return DOMPurify.sanitize(html)
  } catch {
    return ''
  }
}

export default function PostPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const bodyRef = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/blog/${slug}`)
        if (!res.ok) { navigate('/blog'); return }
        setPost(await res.json())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug, navigate])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const handleClick = e => {
      const a = e.target.closest('a')
      if (!a) return
      const href = a.getAttribute('href')
      if (href && href.startsWith('/')) {
        e.preventDefault()
        navigate(href)
      }
    }
    el.addEventListener('click', handleClick)
    return () => el.removeEventListener('click', handleClick)
  }, [post, navigate])

  if (loading) return <p className="text-center py-20" style={{ color: '#8e8e9e' }}>Loading…</p>
  if (!post) return null

  const html = renderBody(post.body)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back + edit */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/blog" className="text-sm" style={{ color: '#8e8e9e' }}>← Back to Blog</Link>
        {user?.is_admin && (
          <Link
            to={`/admin/posts/${post.slug}/edit`}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: '#42424e', color: '#6A7EFC' }}
          >
            Edit Post
          </Link>
        )}
      </div>

      {/* Header */}
      <h1 className="text-4xl font-bold mb-3" style={{ color: '#EDF2F6' }}>{post.title}</h1>
      <div className="flex items-center gap-3 text-sm mb-8" style={{ color: '#8e8e9e' }}>
        <span>{post.author_name}</span>
        <span>·</span>
        <span>{new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      {/* Body — intercept internal links for React Router */}
      <div
        ref={bodyRef}
        className="editor-content max-w-none mb-12"
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ color: '#EDF2F6' }}
      />

      {/* Tags */}
      {(post.game_tags?.length > 0 || post.card_tags?.length > 0) && (
        <div className="pt-8 border-t" style={{ borderColor: '#42424e' }}>
          {post.game_tags?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#8e8e9e' }}>Games</p>
              <div className="flex flex-wrap gap-2">
                {post.game_tags.map(t => (
                  <Link key={t.game_id} to={`/games/${t.game_slug}`}
                    className="text-xs px-3 py-1 rounded-full"
                    style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#6A7EFC' }}>
                    {t.game_name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {post.card_tags?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#8e8e9e' }}>Cards Mentioned</p>
              <div className="flex flex-wrap gap-2">
                {post.card_tags.map(t => (
                  <Link key={t.card_id} to={`/cards/${t.card_id}`}
                    className="text-xs px-3 py-1 rounded-full"
                    style={{ backgroundColor: '#35353f', border: '1px solid #42424e', color: '#EDF2F6' }}>
                    {t.card_name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

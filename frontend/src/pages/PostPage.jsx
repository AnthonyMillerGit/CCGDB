import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { generateHTML } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TiptapImage from '@tiptap/extension-image'
import TiptapLink from '@tiptap/extension-link'
import DOMPurify from 'dompurify'
import { API_URL } from '../config'
import '../styles/editor.css'
import { useAuth } from '../context/AuthContext'

function renderBody(body) {
  if (!body || Object.keys(body).length === 0) return ''
  try {
    const html = generateHTML(body, [StarterKit, TiptapImage, TiptapLink])
    return DOMPurify.sanitize(html)
  } catch {
    return ''
  }
}

// Find the direct child of `root` that contains `node`
function getTopLevelBlock(root, node) {
  let el = node
  while (el.parentElement && el.parentElement !== root) {
    el = el.parentElement
  }
  return el.parentElement === root ? el : null
}

// Walk backwards from `block` looking for the nearest heading sibling
function findPrecedingHeading(block) {
  let prev = block.previousElementSibling
  while (prev) {
    if (/^H[1-6]$/.test(prev.tagName)) return prev
    prev = prev.previousElementSibling
  }
  return null // card is before any heading — insert at top
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

  // Intercept internal link clicks for React Router
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

  // Inject card images above the section heading where each card is first mentioned
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return

    // Collect first occurrence of each unique card link
    const seen = new Set()
    const firstMentions = []
    for (const anchor of el.querySelectorAll('a[href]')) {
      const match = anchor.getAttribute('href').match(/^\/cards\/(\d+)$/)
      if (!match) continue
      const cardId = match[1]
      if (seen.has(cardId)) continue
      seen.add(cardId)
      firstMentions.push({ cardId, anchor })
    }
    if (!firstMentions.length) return

    // Group cards by the heading element that starts their section
    // Key: heading element (or the symbol null = "before any heading")
    const byHeading = new Map()
    for (const mention of firstMentions) {
      const block = getTopLevelBlock(el, mention.anchor)
      if (!block) continue
      const heading = findPrecedingHeading(block)
      const key = heading ?? '__top__'
      if (!byHeading.has(key)) byHeading.set(key, [])
      byHeading.get(key).push(mention)
    }

    // Build and insert a card-image strip above each heading
    const insertedWrappers = []
    for (const [key, mentions] of byHeading) {
      const insertionPoint = key === '__top__' ? el.firstElementChild : key

      const strip = document.createElement('div')
      strip.className = 'card-mention-strip'
      strip.style.cssText = [
        'display:flex',
        'justify-content:center',
        'gap:16px',
        'flex-wrap:wrap',
        'margin:2em 0 0.75em',
      ].join(';')

      for (const { cardId } of mentions) {
        const frame = document.createElement('div')
        frame.style.cssText = [
          'width:160px',
          'height:224px',
          'background:#faf6ee',
          'border-radius:10px',
          'border:1px solid #d4c4a8',
          'flex-shrink:0',
        ].join(';')
        strip.appendChild(frame)

        fetch(`${API_URL}/api/cards/${cardId}`)
          .then(r => r.json())
          .then(card => {
            const imgUrl = card.printings?.find(p => p.image_url)?.image_url
            if (!imgUrl) { frame.remove(); return }
            frame.style.cssText = ''
            frame.style.flexShrink = '0'
            const img = document.createElement('img')
            img.src = imgUrl
            img.alt = card.name
            img.style.cssText = [
              'width:160px',
              'border-radius:10px',
              'display:block',
              'box-shadow:0 4px 24px rgba(0,0,0,0.55)',
            ].join(';')
            frame.appendChild(img)
          })
          .catch(() => frame.remove())
      }

      insertionPoint.parentElement?.insertBefore(strip, insertionPoint)
      insertedWrappers.push(strip)
    }

    return () => insertedWrappers.forEach(w => w.remove())
  }, [post])

  if (loading) return <p className="text-center py-20" style={{ color: '#7a6248' }}>Loading…</p>
  if (!post) return null

  const html = renderBody(post.body)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back + edit */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/blog" className="text-sm" style={{ color: '#7a6248' }}>← Back to Blog</Link>
        {user?.is_admin && (
          <Link
            to={`/admin/posts/${post.slug}/edit`}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: '#d4c4a8', color: '#0097a7' }}
          >
            Edit Post
          </Link>
        )}
      </div>

      {/* Header */}
      <h1 className="text-4xl font-bold mb-3" style={{ color: '#1c1008' }}>{post.title}</h1>
      <div className="flex items-center gap-3 text-sm mb-8" style={{ color: '#7a6248' }}>
        <span>{post.author_name}</span>
        <span>·</span>
        <span>{new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        className="editor-content max-w-none mb-12"
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ color: '#1c1008' }}
      />

      {/* Tags */}
      {(post.game_tags?.length > 0 || post.card_tags?.length > 0) && (
        <div className="pt-8 border-t" style={{ borderColor: '#d4c4a8' }}>
          {post.game_tags?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#7a6248' }}>Games</p>
              <div className="flex flex-wrap gap-2">
                {post.game_tags.map(t => (
                  <Link key={t.game_id} to={`/games/${t.game_slug}`}
                    className="text-xs px-3 py-1 rounded-full"
                    style={{ backgroundColor: '#faf6ee', border: '1px solid #d4c4a8', color: '#0097a7' }}>
                    {t.game_name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {post.card_tags?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#7a6248' }}>Cards Mentioned</p>
              <div className="flex flex-wrap gap-2">
                {post.card_tags.map(t => (
                  <Link key={t.card_id} to={`/cards/${t.card_id}`}
                    className="text-xs px-3 py-1 rounded-full"
                    style={{ backgroundColor: '#faf6ee', border: '1px solid #d4c4a8', color: '#1c1008' }}>
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

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
import { CardImageBlock } from '../extensions/CardImageBlock.jsx'
import { DeckBoxBlock } from '../extensions/DeckBoxBlock.jsx'

function renderBody(body) {
  if (!body || Object.keys(body).length === 0) return ''
  try {
    const html = generateHTML(body, [StarterKit, TiptapImage, TiptapLink, CardImageBlock, DeckBoxBlock])
    return DOMPurify.sanitize(html, { ADD_ATTR: ['data-type', 'data-card-id', 'data-card-name', 'data-image-url', 'data-card-url', 'data-title', 'data-cards', 'data-game'] })
  } catch {
    return ''
  }
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildDeckBoxHTML(cards, title) {
  const total = cards.reduce((s, c) => s + c.quantity, 0)
  const sections = []
  let current = { name: '', cards: [] }
  for (const card of cards) {
    const sec = card.section || ''
    if (sec !== current.name) {
      if (current.cards.length) sections.push(current)
      current = { name: sec, cards: [] }
    }
    current.cards.push(card)
  }
  if (current.cards.length) sections.push(current)

  const rowsHTML = sections.map(section => {
    const header = section.name ? `<div class="deckbox-section-header">${esc(section.name)}</div>` : ''
    const rows = section.cards.map(card => {
      const hoverImg = card.imageUrl
        ? `<img class="deckbox-hover-img" src="${esc(card.imageUrl)}" alt="${esc(card.name)}" />`
        : ''
      return `<div class="deckbox-row">${hoverImg}<span class="deckbox-qty">×${card.quantity}</span><span class="deckbox-name">${esc(card.name)}</span></div>`
    }).join('')
    return header + rows
  }).join('')

  return `<div class="deckbox-block">
    <div class="deckbox-header">
      <span class="deckbox-title">🃏 ${esc(title)}</span>
      <span class="deckbox-count">${total} cards</span>
    </div>
    <div class="deckbox-body">${rowsHTML}</div>
  </div>`
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

  // Hydrate CardImageBlock nodes
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.querySelectorAll('figure[data-type="card-image"]').forEach(fig => {
      const imageUrl = fig.dataset.imageUrl
      const cardName = fig.dataset.cardName || ''
      const cardUrl  = fig.dataset.cardUrl || ''
      if (!imageUrl && !cardName) return

      fig.className = 'card-image-block'
      fig.style.cssText = 'display:inline-block;float:left;margin:0 1.5rem 1.5rem 0;max-width:180px;'

      const a = document.createElement('a')
      a.href = cardUrl

      if (imageUrl) {
        const img = document.createElement('img')
        img.src = imageUrl
        img.alt = cardName
        img.style.cssText = 'width:180px;border-radius:10px;display:block;box-shadow:0 4px 24px rgba(0,0,0,0.55);'
        a.appendChild(img)
      } else {
        const placeholder = document.createElement('div')
        placeholder.textContent = cardName
        placeholder.style.cssText = 'width:180px;height:252px;border-radius:10px;background:#2e2e38;display:flex;align-items:center;justify-content:center;padding:1rem;text-align:center;font-size:13px;color:#8e8e9e;'
        a.appendChild(placeholder)
      }

      const caption = document.createElement('figcaption')
      caption.textContent = cardName
      caption.style.cssText = 'text-align:center;font-size:12px;color:#8e8e9e;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;'

      fig.innerHTML = ''
      fig.appendChild(a)
      fig.appendChild(caption)
    })
  }, [post])

  // Hydrate DeckBoxBlock nodes
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.querySelectorAll('div[data-type="deck-box"]').forEach(deckEl => {
      const title = deckEl.dataset.title || 'Deck List'
      const cardsJson = deckEl.dataset.cards || '[]'
      try {
        const cards = JSON.parse(cardsJson)
        deckEl.innerHTML = buildDeckBoxHTML(cards, title)
        deckEl.removeAttribute('data-type')
        deckEl.removeAttribute('data-cards')
        deckEl.removeAttribute('data-title')
      } catch { /* malformed JSON — leave as-is */ }
    })
  }, [post])

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

  if (loading) return <p className="text-center py-20" style={{ color: 'var(--text-muted)' }}>Loading…</p>
  if (!post) return null

  const html = renderBody(post.body)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back + edit */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/blog" className="text-sm" style={{ color: 'var(--text-muted)' }}>← Back to Blog</Link>
        {user?.is_admin && (
          <Link
            to={`/admin/posts/${post.slug}/edit`}
            className="text-sm px-3 py-1.5 rounded"
            style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent)' }}
          >
            Edit Post
          </Link>
        )}
      </div>

      {/* Header */}
      <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{post.title}</h1>
      <div className="flex items-center gap-3 text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        <span>{post.author_name}</span>
        <span>·</span>
        <span>{new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        className="editor-content max-w-none mb-12"
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ color: 'var(--text-primary)' }}
      />

      {/* Tags */}
      {(post.game_tags?.length > 0 || post.card_tags?.length > 0) && (
        <div className="pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
          {post.game_tags?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Games</p>
              <div className="flex flex-wrap gap-2">
                {post.game_tags.map(t => (
                  <Link key={t.game_id} to={`/games/${t.game_slug}`}
                    className="text-xs px-3 py-1 rounded-full"
                    style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
                    {t.game_name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {post.card_tags?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Cards Mentioned</p>
              <div className="flex flex-wrap gap-2">
                {post.card_tags.map(t => (
                  <Link key={t.card_id} to={`/cards/${t.card_id}`}
                    className="text-xs px-3 py-1 rounded-full"
                    style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
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

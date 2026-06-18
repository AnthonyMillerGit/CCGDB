import { useEffect, useLayoutEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { generateHTML } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TiptapImage from '@tiptap/extension-image'
import TiptapLink from '@tiptap/extension-link'
import { TableKit } from '@tiptap/extension-table'
import DOMPurify from 'dompurify'
import { API_URL } from '../config'
import '../styles/editor.css'
import { useAuth } from '../context/AuthContext'
import { CardImageBlock } from '../extensions/CardImageBlock.jsx'
import { DeckBoxBlock } from '../extensions/DeckBoxBlock.jsx'

function renderBody(body) {
  if (!body || Object.keys(body).length === 0) return ''
  try {
    const html = generateHTML(body, [StarterKit, TiptapImage, TiptapLink, CardImageBlock, DeckBoxBlock, TableKit])
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
      const dataAttrs = card.imageUrl
        ? ` data-image-url="${esc(card.imageUrl)}" data-card-name="${esc(card.name)}"`
        : ''
      const indicator = card.imageUrl ? '<span class="deckbox-hover-indicator">◈</span>' : ''
      return `<div class="deckbox-row"${dataAttrs}><span class="deckbox-qty">×${card.quantity}</span><span class="deckbox-name">${esc(card.name)}</span>${indicator}</div>`
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


export default function PostPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [related, setRelated] = useState([])
  const [toc, setToc] = useState([])
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

  // Inject the rendered post HTML manually (NOT via dangerouslySetInnerHTML) so
  // that later re-renders for toc/related state never re-assert and wipe the
  // card-image / deck-box DOM that the hydration effects below build.
  useLayoutEffect(() => {
    if (bodyRef.current && post) bodyRef.current.innerHTML = renderBody(post.body)
  }, [post])

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

  // Hydrate CardImageBlock nodes — consecutive images go into a flex row
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return

    const figs = [...el.querySelectorAll('figure[data-type="card-image"]')]
    if (!figs.length) return

    // Group figures that are direct adjacent siblings (no elements between them)
    const groups = [[figs[0]]]
    for (let i = 1; i < figs.length; i++) {
      const prev = groups[groups.length - 1]
      if (figs[i].previousElementSibling === prev[prev.length - 1]) {
        prev.push(figs[i])
      } else {
        groups.push([figs[i]])
      }
    }

    function hydrateFig(fig, inRow) {
      const imageUrl = fig.dataset.imageUrl
      const cardName = fig.dataset.cardName || ''
      const cardUrl  = fig.dataset.cardUrl || ''
      const w = inRow ? 150 : 180
      fig.className = 'card-image-block'
      fig.style.cssText = inRow ? `max-width:${w}px;` : `display:block;float:none;margin:1.25rem 0;max-width:${w}px;`
      const a = document.createElement('a')
      a.href = cardUrl
      if (imageUrl) {
        const img = document.createElement('img')
        img.src = imageUrl
        img.alt = cardName
        img.style.cssText = `width:${w}px;border-radius:10px;display:block;box-shadow:0 4px 24px rgba(0,0,0,0.55);`
        a.appendChild(img)
      } else {
        const ph = document.createElement('div')
        ph.textContent = cardName
        ph.style.cssText = `width:${w}px;height:${Math.round(w*1.4)}px;border-radius:10px;background:#2e2e38;display:flex;align-items:center;justify-content:center;padding:1rem;text-align:center;font-size:13px;color:#8e8e9e;`
        a.appendChild(ph)
      }
      const cap = document.createElement('figcaption')
      cap.textContent = cardName
      cap.style.cssText = `text-align:center;font-size:12px;color:#8e8e9e;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:${w}px;`
      fig.innerHTML = ''
      fig.appendChild(a)
      fig.appendChild(cap)
    }

    for (const group of groups) {
      const inRow = group.length > 1
      if (inRow) {
        const row = document.createElement('div')
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:1rem;margin:1.25rem 0;align-items:flex-start;'
        group[0].parentNode.insertBefore(row, group[0])
        group.forEach(f => row.appendChild(f))
      }
      group.forEach(f => hydrateFig(f, inRow))
    }
  }, [post])

  // Hydrate DeckBoxBlock nodes + attach hover preview
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return

    // Shared floating preview card (position:fixed so it escapes overflow:hidden)
    const preview = document.createElement('div')
    preview.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;display:none;'
    const previewImg = document.createElement('img')
    previewImg.style.cssText = 'width:200px;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.8);display:block;'
    preview.appendChild(previewImg)
    document.body.appendChild(preview)

    el.querySelectorAll('div[data-type="deck-box"]').forEach(deckEl => {
      const title = deckEl.dataset.title || 'Deck List'
      const cardsJson = deckEl.dataset.cards || '[]'
      try {
        const cards = JSON.parse(cardsJson)
        // Replace deckEl itself rather than setting innerHTML — avoids a spurious
        // wrapper div that can cause deck boxes to render twice in some browsers.
        const built = document.createElement('div')
        built.innerHTML = buildDeckBoxHTML(cards, title)
        const deckboxDiv = built.firstElementChild
        deckEl.parentNode.replaceChild(deckboxDiv, deckEl)

        deckboxDiv.querySelectorAll('.deckbox-row[data-image-url]').forEach(row => {
          row.addEventListener('mouseenter', () => {
            previewImg.src = row.dataset.imageUrl
            previewImg.alt = row.dataset.cardName || ''
            const rect = row.getBoundingClientRect()
            preview.style.left = (rect.right + 8) + 'px'
            preview.style.top = Math.max(8, rect.top - 60) + 'px'
            preview.style.display = 'block'
          })
          row.addEventListener('mouseleave', () => {
            preview.style.display = 'none'
          })
        })
      } catch { /* malformed JSON — leave as-is */ }
    })

    return () => preview.remove()
  }, [post])

  // Related posts — other posts sharing this post's first game tag
  useEffect(() => {
    if (!post?.game_tags?.length) { setRelated([]); return }
    const gslug = post.game_tags[0].game_slug
    fetch(`${API_URL}/api/games/${gslug}/posts`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setRelated(data.filter(p => p.slug !== post.slug).slice(0, 3))
      })
      .catch(() => {})
  }, [post])

  // Build a table of contents from the body's H2 headings (and give them ids)
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const items = [...el.querySelectorAll('h2')].map((h, i) => ({ i, text: h.textContent }))
    setToc(items)
  }, [post])

  // Card-mention hovers: link tagged card names in the prose to their card page
  // and show a floating image preview on hover (also covers the "Cards Mentioned" pills).
  useEffect(() => {
    const el = bodyRef.current
    if (!el || !post?.card_tags?.length) return
    const cards = {}
    for (const t of post.card_tags) if (t.image_url) cards[t.card_name] = { id: t.card_id, img: t.image_url }
    const names = Object.keys(cards).sort((a, b) => b.length - a.length)
    if (names.length) {
      const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const rx = new RegExp('(?<![A-Za-z0-9])(' + names.map(esc).join('|') + ')(?![A-Za-z0-9])', 'g')
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null)
      const nodes = []; let nd
      while ((nd = walker.nextNode())) {
        if (nd.nodeValue.trim() && !nd.parentElement.closest('a')) nodes.push(nd)
      }
      nodes.forEach(node => {
        const t = node.nodeValue; rx.lastIndex = 0
        if (!rx.test(t)) return; rx.lastIndex = 0
        const frag = document.createDocumentFragment()
        let last = 0, m
        while ((m = rx.exec(t))) {
          if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)))
          const info = cards[m[1]]
          const a = document.createElement('a')
          a.href = '/cards/' + info.id
          a.className = 'card-mention'
          a.dataset.img = info.img
          a.textContent = m[1]
          frag.appendChild(a)
          last = m.index + m[1].length
        }
        if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)))
        node.parentNode.replaceChild(frag, node)
      })
    }

    // Floating preview shared by body mentions + "Cards Mentioned" pills
    const preview = document.createElement('div')
    preview.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;display:none;'
    const pImg = document.createElement('img')
    pImg.style.cssText = 'width:240px;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,0.7);display:block;'
    preview.appendChild(pImg); document.body.appendChild(preview)
    function place(e) {
      const pad = 16, w = 240, h = 336
      let x = e.clientX + pad, y = e.clientY + pad
      if (x + w > innerWidth) x = e.clientX - w - pad
      if (y + h > innerHeight) y = Math.max(8, innerHeight - h - pad)
      preview.style.left = x + 'px'; preview.style.top = y + 'px'
    }
    function over(e) { const a = e.target.closest('[data-card-img]'); if (!a) return; pImg.src = a.dataset.cardImg; preview.style.display = 'block'; place(e) }
    function over2(e) { const a = e.target.closest('.card-mention'); if (!a) return; pImg.src = a.dataset.img; preview.style.display = 'block'; place(e) }
    function move(e) { if (preview.style.display === 'block') place(e) }
    function out(e) { if (e.target.closest('.card-mention') || e.target.closest('[data-card-img]')) preview.style.display = 'none' }
    document.addEventListener('mouseover', over)
    document.addEventListener('mouseover', over2)
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseout', out)
    return () => {
      preview.remove()
      document.removeEventListener('mouseover', over)
      document.removeEventListener('mouseover', over2)
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseout', out)
    }
  }, [post])


  if (loading) return <p className="text-center py-20" style={{ color: 'var(--text-muted)' }}>Loading…</p>
  if (!post) return null

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

      {/* Hero image */}
      {post.cover_image_url && (
        <div style={{
          width: '100%', height: 300, marginBottom: '2rem',
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}>
          <img
            src={post.cover_image_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
          />
        </div>
      )}

      {/* Header */}
      <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{post.title}</h1>
      <div className="flex items-center gap-3 text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        <span>{post.author_name}</span>
        <span>·</span>
        <span>{new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      {/* Table of contents */}
      {toc.length >= 3 && (
        <nav className="mb-8 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Contents</p>
          <ol className="flex flex-col gap-1" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {toc.map(item => (
              <li key={item.i}>
                <a
                  href="#"
                  onClick={e => {
                    e.preventDefault()
                    const h = bodyRef.current?.querySelectorAll('h2')[item.i]
                    if (h) {
                      const y = h.getBoundingClientRect().top + window.scrollY - 16
                      window.scrollTo({ top: y, behavior: 'smooth' })
                    }
                  }}
                  className="text-sm hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Body */}
      <div
        ref={bodyRef}
        className="editor-content max-w-none mb-12"
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
                    data-card-img={t.image_url || undefined}
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

      {/* Related posts */}
      {related.length > 0 && (
        <div className="pt-8 mt-8 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            More about {post.game_tags[0].game_name}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map(rp => (
              <Link
                key={rp.id}
                to={`/blog/${rp.slug}`}
                className="rounded-xl overflow-hidden transition-all"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                {rp.cover_image_url && (
                  <div style={{ height: 90, overflow: 'hidden' }}>
                    <img src={rp.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                )}
                <div style={{ padding: '0.7rem 0.85rem' }}>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3 }}>{rp.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Mention from '@tiptap/extension-mention'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import { mentionSuggestion } from '../components/mentionSuggestion'
import { CardImageBlock } from '../extensions/CardImageBlock.jsx'
import { DeckBoxBlock } from '../extensions/DeckBoxBlock.jsx'
import '../styles/editor.css'

const POST_TYPES = [
  { value: 'article',    label: 'Article' },
  { value: 'deck-tech',  label: 'Deck Tech' },
  { value: 'set-review', label: 'Set Review' },
  { value: 'tournament', label: 'Tournament Report' },
  { value: 'news',       label: 'News' },
]

const POST_TYPE_COLORS = {
  'article':    null,
  'deck-tech':  '#a78bfa',
  'set-review': '#4ade80',
  'tournament': '#fb923c',
  'news':       '#60a5fa',
}

// ── Deck list parser ─────────────────────────────────────────────────────────

function parseDeckList(text) {
  const cards = []
  let currentSection = ''

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    // Section header: "// Creatures", "Creatures:", "# Spells", "Sideboard:"
    if (/^(\/\/|#)/.test(line) || /^(Companion|Sideboard|Commander|Deck):?$/i.test(line)) {
      currentSection = line.replace(/^[/#\s]+/, '').replace(/:$/, '').trim()
      continue
    }
    if (/^(Companion|Sideboard|Commander|Deck|Creatures?|Lands?|Spells?|Instants?|Sorceries|Planeswalkers?|Artifacts?|Enchantments?):$/i.test(line)) {
      currentSection = line.replace(/:$/, '').trim()
      continue
    }

    // Handle "SB: 4 Lightning Bolt"
    const sideboardLine = line.match(/^SB:\s*(.+)$/)
    const actualLine = sideboardLine ? sideboardLine[1] : line
    if (sideboardLine && !currentSection) currentSection = 'Sideboard'

    // Parse quantity + name: "4x Lightning Bolt (M10) 152" → 4, "Lightning Bolt"
    const match = actualLine.match(/^(\d+)[x×]?\s+(.+?)(?:\s+\([A-Z0-9]+\))?(?:\s+\d+)?$/)
    if (match) {
      cards.push({ quantity: parseInt(match[1], 10), name: match[2].trim(), section: currentSection })
    }
  }

  return cards
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

function Divider() {
  return <span style={{ borderLeft: '1px solid var(--border)', margin: '0 2px', alignSelf: 'stretch' }} />
}

function ToolBtn({ onClick, label, active, title }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title || label}
      className="px-2 py-1 rounded text-xs font-medium transition-all duration-100 flex-shrink-0"
      style={{
        backgroundColor: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--bg-page)' : 'var(--text-primary)',
        border: active ? '1px solid var(--accent)' : '1px solid transparent',
        fontWeight: active ? 700 : 500,
      }}
    >
      {label}
    </button>
  )
}

function MenuBar({ editor, onOpenCardPicker, onOpenDeckBuilder }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!editor) return
    const bump = () => setTick(t => t + 1)
    editor.on('selectionUpdate', bump)
    editor.on('transaction', bump)
    return () => {
      editor.off('selectionUpdate', bump)
      editor.off('transaction', bump)
    }
  }, [editor])

  function insertLink() {
    const existing = editor.getAttributes('link').href || ''
    const url = window.prompt('Link URL:', existing)
    if (url === null) return
    if (!url) { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().setLink({ href: url }).run()
  }

  function insertImage() {
    const url = window.prompt('Image URL:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} label="B" title="Bold" active={editor.isActive('bold')} />
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} label="I" title="Italic" active={editor.isActive('italic')} />
      <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} label="S̶" title="Strikethrough" active={editor.isActive('strike')} />
      <Divider />
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="H2" active={editor.isActive('heading', { level: 2 })} />
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="H3" active={editor.isActive('heading', { level: 3 })} />
      <Divider />
      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} label="• List" active={editor.isActive('bulletList')} />
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} label="1. List" active={editor.isActive('orderedList')} />
      <Divider />
      <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} label="❝ Quote" active={editor.isActive('blockquote')} />
      <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} label="</> Code" active={editor.isActive('codeBlock')} />
      <Divider />
      {/* CCG-specific blocks */}
      <ToolBtn onClick={onOpenCardPicker} label="🎴 Card Image" title="Insert a card image into the post" active={false} />
      <ToolBtn onClick={onOpenDeckBuilder} label="🃏 Deck" title="Insert a deck list with hover card previews" active={false} />
      <Divider />
      <ToolBtn onClick={insertLink} label="🔗 Link" active={editor.isActive('link')} />
      <ToolBtn onClick={insertImage} label="🖼 Image" active={false} />
      <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} label="— Rule" active={false} />
      <Divider />
      <ToolBtn onClick={() => editor.chain().focus().undo().run()} label="↩" title="Undo" active={false} />
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} label="↪" title="Redo" active={false} />
    </div>
  )
}

// ── Card Image Picker Modal ───────────────────────────────────────────────────

function CardPickerModal({ onInsert, onClose }) {
  const [query, setQuery] = useState('')
  const [game, setGame] = useState('')
  const [games, setGames] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetch(`${API_URL}/api/games`).then(r => r.json()).then(d => setGames(Array.isArray(d) ? d : []))
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const url = `${API_URL}/api/cards/search?name=${encodeURIComponent(query)}${game ? `&game=${game}` : ''}`
        const data = await fetch(url).then(r => r.json())
        // Deduplicate by card name — keep first printing with an image
        const seen = new Set()
        const deduped = (Array.isArray(data) ? data : []).filter(c => {
          if (seen.has(c.id)) return false
          seen.add(c.id)
          return true
        })
        setResults(deduped.slice(0, 24))
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, game])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl rounded-xl overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Insert Card Image</h2>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: 'var(--text-muted)' }}>×</button>
        </div>

        {/* Search controls */}
        <div className="flex gap-3 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search card name…"
            className="flex-1 px-3 py-2 rounded text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <select value={game} onChange={e => setGame(e.target.value)}
            className="px-3 py-2 rounded text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-muted)', maxWidth: 160 }}>
            <option value="">All games</option>
            {games.map(g => <option key={g.id} value={g.slug}>{g.name}</option>)}
          </select>
        </div>

        {/* Results grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Searching…</p>}
          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No cards found.</p>
          )}
          {!loading && query.length < 2 && (
            <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Type at least 2 characters to search.</p>
          )}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {results.map(card => (
              <button
                key={`${card.id}-${card.printing_id}`}
                type="button"
                onClick={() => onInsert({
                  cardId: card.id,
                  cardName: card.name,
                  imageUrl: card.image_url || null,
                  cardUrl: `/cards/${card.id}`,
                })}
                className="flex flex-col items-center gap-1 rounded-lg p-1 transition-opacity hover:opacity-80"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-chip)' }}
                title={card.name}
              >
                {card.image_url ? (
                  <img src={card.image_url} alt={card.name} className="w-full rounded" style={{ aspectRatio: '5/7', objectFit: 'cover' }} />
                ) : (
                  <div className="w-full rounded flex items-center justify-center p-2 text-xs text-center" style={{ aspectRatio: '5/7', backgroundColor: '#2e2e38', color: 'var(--text-muted)' }}>
                    {card.name}
                  </div>
                )}
                <span className="text-xs truncate w-full text-center" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                  {card.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Deck Builder Modal ────────────────────────────────────────────────────────

function DeckBuilderModal({ onInsert, onClose }) {
  const [deckText, setDeckText] = useState('')
  const [deckTitle, setDeckTitle] = useState('')
  const [building, setBuilding] = useState(false)
  const [preview, setPreview] = useState(null) // [{quantity, name, imageUrl, cardId, section}]

  async function handleBuild() {
    const parsed = parseDeckList(deckText)
    if (!parsed.length) return
    setBuilding(true)

    // Look up unique card names for image URLs
    const uniqueNames = [...new Set(parsed.map(c => c.name))]
    const imageMap = {}

    await Promise.all(uniqueNames.map(async name => {
      try {
        const url = `${API_URL}/api/cards/search?name=${encodeURIComponent(name)}`
        const data = await fetch(url).then(r => r.json())
        if (!Array.isArray(data) || !data.length) return
        // Prefer exact name match (case-insensitive)
        const exact = data.find(c => c.name.toLowerCase() === name.toLowerCase()) || data[0]
        if (exact) {
          imageMap[name] = { cardId: exact.id, imageUrl: exact.image_url || null }
        }
      } catch { /* skip */ }
    }))

    const enriched = parsed.map(card => ({
      ...card,
      cardId:   imageMap[card.name]?.cardId ?? null,
      imageUrl: imageMap[card.name]?.imageUrl ?? null,
    }))

    setPreview(enriched)
    setBuilding(false)
  }

  function handleInsert() {
    if (!preview) return
    onInsert({
      title: deckTitle.trim() || 'Deck List',
      cards: JSON.stringify(preview),
    })
  }

  const total = preview ? preview.reduce((s, c) => s + c.quantity, 0) : 0
  const found = preview ? preview.filter(c => c.imageUrl).length : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-xl rounded-xl overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Insert Deck List</h2>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: 'var(--text-muted)' }}>×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <input
            type="text"
            value={deckTitle}
            onChange={e => setDeckTitle(e.target.value)}
            placeholder="Deck name (optional)"
            className="w-full px-3 py-2 rounded text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />

          {!preview ? (
            <>
              <textarea
                value={deckText}
                onChange={e => setDeckText(e.target.value)}
                placeholder={`Paste your deck list here:\n\n4 Lightning Bolt\n4 Monastery Swiftspear\n// or with sections:\n// Creatures\n4 Goblin Guide\n// Spells\n4 Lightning Bolt`}
                rows={12}
                className="w-full px-3 py-2 rounded text-sm resize-none outline-none font-mono"
                style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)', lineHeight: 1.6 }}
              />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Supports formats: <code style={{ color: 'var(--accent)' }}>4 Card Name</code>, <code style={{ color: 'var(--accent)' }}>4x Card Name</code>, section headers with <code style={{ color: 'var(--accent)' }}>// Creatures</code>
              </p>
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {preview.length} unique cards · {total} total
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{found}/{preview.length} images found</span>
                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  >
                    Edit list
                  </button>
                </div>
              </div>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', maxHeight: 300, overflowY: 'auto' }}>
                {preview.map((card, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-1.5 border-b last:border-b-0"
                    style={{ borderColor: 'var(--border)', backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-chip)' }}>
                    {card.imageUrl ? (
                      <img src={card.imageUrl} alt={card.name}
                        style={{ width: 28, height: 39, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 28, height: 39, borderRadius: 3, backgroundColor: '#2e2e38', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#666', fontSize: 8 }}>?</span>
                      </div>
                    )}
                    <span className="text-sm font-semibold" style={{ color: 'var(--accent)', minWidth: 28 }}>×{card.quantity}</span>
                    <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{card.name}</span>
                    {card.section && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.section}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded text-sm"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            Cancel
          </button>
          {!preview ? (
            <button
              type="button"
              onClick={handleBuild}
              disabled={building || !deckText.trim()}
              className="px-5 py-2 rounded text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}>
              {building ? 'Looking up cards…' : 'Build Deck →'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleInsert}
              className="px-5 py-2 rounded text-sm font-semibold"
              style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}>
              Insert Deck
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tag Search ────────────────────────────────────────────────────────────────

function TagSearch({ label, searchUrl, selected, onAdd, onRemove, displayKey, idKey }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await fetch(`${searchUrl}${encodeURIComponent(query)}`).then(r => r.json())
        setResults(Array.isArray(data) ? data.slice(0, 10) : [])
        setOpen(true)
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, searchUrl])

  return (
    <div>
      <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {selected.map(item => (
          <span key={item[idKey]} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
            {item[displayKey]}
            <button type="button" onClick={() => onRemove(item[idKey])} className="ml-1 opacity-60 hover:opacity-100" style={{ color: 'var(--accent-maroon)' }}>×</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text" value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={`Search ${label.toLowerCase()}…`}
          className="w-full px-3 py-1.5 rounded text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded shadow-lg z-10 py-1 max-h-48 overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            {results.map(item => (
              <button key={item[idKey] ?? item.id} type="button"
                onMouseDown={() => { onAdd(item); setQuery(''); setResults([]); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-sm hover:opacity-80"
                style={{ color: 'var(--text-primary)' }}>
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Editor Page ──────────────────────────────────────────────────────────

export default function PostEditorPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, authFetch } = useAuth()
  const isEdit = Boolean(slug)

  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [postSlug, setPostSlug] = useState('')
  const [postType, setPostType] = useState('article')
  const [publishedAt, setPublishedAt] = useState('')
  const [gameTags, setGameTags] = useState([])
  const [cardTags, setCardTags] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showCardPicker, setShowCardPicker] = useState(false)
  const [showDeckBuilder, setShowDeckBuilder] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      CardImageBlock,
      DeckBoxBlock,
      Placeholder.configure({ placeholder: 'Write something amazing… Use @ to link cards, games, or sets.' }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Mention.configure({ suggestion: mentionSuggestion }),
    ],
    editorProps: {
      attributes: {
        class: 'editor-content outline-none min-h-[280px] sm:min-h-[420px] px-5 py-5',
        style: 'color: var(--text-primary); font-size: 1rem; line-height: 1.75;',
      },
    },
  })

  useEffect(() => {
    if (!user?.is_admin) navigate('/blog')
  }, [user, navigate])

  useEffect(() => {
    if (!isEdit || !editor) return
    async function loadPost() {
      const res = await authFetch(`${API_URL}/api/admin/posts/${slug}`)
      if (!res.ok) { navigate('/blog'); return }
      const post = await res.json()
      setTitle(post.title)
      setExcerpt(post.excerpt || '')
      setPostSlug(post.slug)
      setPostType(post.post_type || 'article')
      setPublishedAt(post.published_at ? post.published_at.slice(0, 16) : '')
      setGameTags(post.game_tags || [])
      setCardTags(post.card_tags || [])
      if (post.body && Object.keys(post.body).length > 0) {
        editor.commands.setContent(post.body)
      }
    }
    loadPost()
  }, [isEdit, slug, editor, authFetch, navigate])

  function autoSlug(t) {
    return t.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
  }

  const handleCardInsert = useCallback((attrs) => {
    setShowCardPicker(false)
    editor?.chain().focus().insertCardImage(attrs).run()
  }, [editor])

  const handleDeckInsert = useCallback((attrs) => {
    setShowDeckBuilder(false)
    editor?.chain().focus().insertDeckBox(attrs).run()
  }, [editor])

  async function handleSave(publish) {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')

    const resolvedPublishedAt = publish
      ? (publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString())
      : (publishedAt ? new Date(publishedAt).toISOString() : null)

    const payload = {
      title: title.trim(),
      slug: postSlug || autoSlug(title),
      excerpt: excerpt.trim() || null,
      body: editor.getJSON(),
      post_type: postType,
      published_at: resolvedPublishedAt,
      game_ids: gameTags.map(t => t.game_id),
      card_ids: cardTags.map(t => t.card_id),
      set_ids: [],
    }

    const url = isEdit ? `${API_URL}/api/admin/posts/${slug}` : `${API_URL}/api/admin/posts`
    const method = isEdit ? 'PATCH' : 'POST'

    try {
      const res = await authFetch(url, { method, body: JSON.stringify(payload) })
      if (res.ok) {
        const data = await res.json()
        const finalSlug = isEdit ? (payload.slug || slug) : data.slug
        const willBePublic = resolvedPublishedAt && new Date(resolvedPublishedAt) <= new Date()
        navigate(willBePublic ? `/blog/${finalSlug}` : '/admin/posts')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || `Failed to save post (${res.status})`)
      }
    } catch {
      setError('Network error — check your connection')
    }
    setSaving(false)
  }

  async function handleUnpublish() {
    setSaving(true)
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/admin/posts/${slug}/unpublish`, { method: 'POST' })
      if (res.ok) {
        setPublishedAt('')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || 'Failed to unpublish')
      }
    } catch {
      setError('Network error — check your connection')
    }
    setSaving(false)
  }

  const inputStyle = { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
  const typeColor = POST_TYPE_COLORS[postType]

  return (
    <div className="max-w-4xl mx-auto">
      {showCardPicker && (
        <CardPickerModal
          onInsert={handleCardInsert}
          onClose={() => setShowCardPicker(false)}
        />
      )}
      {showDeckBuilder && (
        <DeckBuilderModal
          onInsert={handleDeckInsert}
          onClose={() => setShowDeckBuilder(false)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <RouterLink to="/admin/posts" className="text-sm" style={{ color: 'var(--text-muted)' }}>← Posts</RouterLink>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{isEdit ? 'Edit Post' : 'New Post'}</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded text-sm"
          style={{ backgroundColor: '#3a1a1a', border: '1px solid #6a2d2d', color: 'var(--accent-maroon)' }}>
          {error}
        </div>
      )}

      {/* Title + post type */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <input
          type="text" placeholder="Post title" value={title}
          onChange={e => { setTitle(e.target.value); if (!isEdit) setPostSlug(autoSlug(e.target.value)) }}
          className="flex-1 px-4 py-3 rounded-lg text-xl font-bold outline-none"
          style={inputStyle}
        />
        <select value={postType} onChange={e => setPostType(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm font-semibold outline-none"
          style={{ ...inputStyle, color: typeColor || 'var(--text-muted)', border: `1px solid ${typeColor ? typeColor + '66' : 'var(--border)'}`, minWidth: 160 }}>
          {POST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-3 mb-5">
        <input
          type="text" placeholder="Slug (auto-generated from title)" value={postSlug}
          onChange={e => setPostSlug(e.target.value)}
          className="w-full px-3 py-2 rounded text-sm font-mono outline-none"
          style={inputStyle}
        />
        <textarea
          placeholder="Short excerpt (shows in post previews)" value={excerpt}
          onChange={e => setExcerpt(e.target.value)} rows={2}
          className="w-full px-3 py-2 rounded text-sm resize-none outline-none"
          style={inputStyle}
        />
      </div>

      {/* Editor */}
      <div className="rounded-lg overflow-hidden mb-5" style={{ border: '1px solid var(--border)' }}>
        <MenuBar
          editor={editor}
          onOpenCardPicker={() => setShowCardPicker(true)}
          onOpenDeckBuilder={() => setShowDeckBuilder(true)}
        />
        <div style={{ backgroundColor: 'var(--bg-chip)' }}>
          <EditorContent editor={editor} />
        </div>
        <div className="px-5 py-2 text-xs border-t" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <span>@ to link a card/game/set</span>
          <span className="mx-2" style={{ opacity: 0.4 }}>·</span>
          <span>🎴 Card Image inserts a floating card photo</span>
          <span className="mx-2" style={{ opacity: 0.4 }}>·</span>
          <span>🃏 Deck builds a deck list with hover previews</span>
        </div>
      </div>

      {/* Tags */}
      <div className="p-4 rounded-lg mb-5 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <TagSearch
          label="Games" searchUrl={`${API_URL}/api/games?q=`}
          selected={gameTags}
          onAdd={g => setGameTags(prev => prev.find(t => t.game_id === g.id) ? prev : [...prev, { game_id: g.id, game_name: g.name, game_slug: g.slug }])}
          onRemove={id => setGameTags(prev => prev.filter(t => t.game_id !== id))}
          displayKey="game_name" idKey="game_id"
        />
        <TagSearch
          label="Cards" searchUrl={`${API_URL}/api/cards/search?name=`}
          selected={cardTags}
          onAdd={c => setCardTags(prev => prev.find(t => t.card_id === c.id) ? prev : [...prev, { card_id: c.id, card_name: c.name }])}
          onRemove={id => setCardTags(prev => prev.filter(t => t.card_id !== id))}
          displayKey="card_name" idKey="card_id"
        />
      </div>

      {/* Publish controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm" style={{ color: 'var(--text-muted)' }}>Publish date</label>
          <input type="datetime-local" value={publishedAt} onChange={e => setPublishedAt(e.target.value)}
            className="px-3 py-1.5 rounded text-sm outline-none" style={inputStyle} />
        </div>
        <div className="flex gap-3 flex-wrap">
          {isEdit && publishedAt && new Date(publishedAt) <= new Date() && (
            <button type="button" onClick={handleUnpublish} disabled={saving}
              className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent-maroon)', border: '1px solid #9e836a' }}>
              Unpublish
            </button>
          )}
          <button type="button" onClick={() => handleSave(false)} disabled={saving}
            className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button type="button" onClick={() => handleSave(true)} disabled={saving}
            className="px-5 py-2 rounded text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}>
            {saving ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}

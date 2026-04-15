import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'

function MenuBar({ editor }) {
  if (!editor) return null
  const btn = (action, label, active) => (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); action() }}
      className="px-2 py-1 rounded text-xs font-medium transition-colors"
      style={{
        backgroundColor: active ? '#08D9D6' : '#363d52',
        color: active ? '#252A34' : '#EAEAEA',
      }}
    >
      {label}
    </button>
  )
  return (
    <div className="flex flex-wrap gap-1 p-2 rounded-t-lg border-b"
      style={{ backgroundColor: '#2d3243', borderColor: '#363d52' }}>
      {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleStrike().run(), 'S', editor.isActive('strike'))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
      {btn(() => editor.chain().focus().toggleBulletList().run(), '• List', editor.isActive('bulletList'))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. List', editor.isActive('orderedList'))}
      {btn(() => editor.chain().focus().toggleBlockquote().run(), 'Quote', editor.isActive('blockquote'))}
      {btn(() => editor.chain().focus().toggleCodeBlock().run(), 'Code', editor.isActive('codeBlock'))}
      {btn(() => editor.chain().focus().setHorizontalRule().run(), '—', false)}
    </div>
  )
}

function TagSearch({ label, searchUrl, selected, onAdd, onRemove, displayKey, idKey }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`${searchUrl}${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data.slice(0, 8) : [])
    }, 300)
    return () => clearTimeout(t)
  }, [query, searchUrl])

  return (
    <div>
      <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#8892a4' }}>{label}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {selected.map(item => (
          <span key={item[idKey]}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
            style={{ backgroundColor: '#2d3243', border: '1px solid #363d52', color: '#08D9D6' }}>
            {item[displayKey]}
            <button type="button" onClick={() => onRemove(item[idKey])}
              className="ml-1 hover:opacity-70" style={{ color: '#FF2E63' }}>×</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}…`}
          className="w-full px-3 py-1.5 rounded text-sm"
          style={{ backgroundColor: '#2d3243', border: '1px solid #363d52', color: '#EAEAEA' }}
        />
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded shadow-lg z-10 py-1"
            style={{ backgroundColor: '#2d3243', border: '1px solid #363d52' }}>
            {results.map(item => (
              <button key={item[idKey]} type="button"
                onClick={() => { onAdd(item); setQuery(''); setResults([]) }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#363d52] transition-colors"
                style={{ color: '#EAEAEA' }}>
                {item[displayKey]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PostEditorPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, authFetch } = useAuth()
  const isEdit = Boolean(slug)

  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [postSlug, setPostSlug] = useState('')
  const [publishedAt, setPublishedAt] = useState('')
  const [gameTags, setGameTags] = useState([])
  const [cardTags, setCardTags] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Write something amazing…' }),
    ],
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[400px] px-4 py-4',
        style: 'color: #EAEAEA; font-size: 1rem; line-height: 1.75;',
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
      setPublishedAt(post.published_at ? post.published_at.slice(0, 16) : '')
      setGameTags(post.game_tags || [])
      setCardTags(post.card_tags || [])
      if (post.body && Object.keys(post.body).length > 0) {
        editor.commands.setContent(post.body)
      }
    }
    loadPost()
  }, [isEdit, slug, editor, authFetch, navigate])

  const autoSlug = useCallback((t) => {
    return t.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }, [])

  async function handleSave(publish) {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')

    const body = {
      title: title.trim(),
      slug: postSlug || autoSlug(title),
      excerpt: excerpt.trim() || null,
      body: editor.getJSON(),
      published_at: publish ? (publishedAt || new Date().toISOString()) : (publishedAt || null),
      game_ids: gameTags.map(t => t.game_id),
      card_ids: cardTags.map(t => t.card_id),
      set_ids: [],
    }

    const url = isEdit ? `${API_URL}/api/admin/posts/${slug}` : `${API_URL}/api/admin/posts`
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await authFetch(url, { method, body: JSON.stringify(body) })

    if (res.ok) {
      const data = await res.json()
      navigate(`/blog/${isEdit ? (body.slug || slug) : data.slug}`)
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to save post')
    }
    setSaving(false)
  }

  const inputStyle = { backgroundColor: '#2d3243', border: '1px solid #363d52', color: '#EAEAEA' }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#EAEAEA' }}>
          {isEdit ? 'Edit Post' : 'New Post'}
        </h1>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded text-sm"
          style={{ backgroundColor: '#3a1a1a', border: '1px solid #6a2d2d', color: '#FF2E63' }}>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 mb-6">
        <input
          type="text"
          placeholder="Post title"
          value={title}
          onChange={e => {
            setTitle(e.target.value)
            if (!isEdit) setPostSlug(autoSlug(e.target.value))
          }}
          className="w-full px-4 py-3 rounded-lg text-xl font-bold"
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Slug (auto-generated from title)"
          value={postSlug}
          onChange={e => setPostSlug(e.target.value)}
          className="w-full px-3 py-2 rounded text-sm font-mono"
          style={inputStyle}
        />
        <textarea
          placeholder="Short excerpt (shows in post previews)"
          value={excerpt}
          onChange={e => setExcerpt(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded text-sm resize-none"
          style={inputStyle}
        />
      </div>

      {/* Editor */}
      <div className="rounded-lg overflow-hidden mb-6" style={{ border: '1px solid #363d52' }}>
        <MenuBar editor={editor} />
        <div style={{ backgroundColor: '#1e2330' }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Tags */}
      <div className="p-4 rounded-lg mb-6 flex flex-col gap-4"
        style={{ backgroundColor: '#2d3243', border: '1px solid #363d52' }}>
        <TagSearch
          label="Games"
          searchUrl={`${API_URL}/api/games?q=`}
          selected={gameTags}
          onAdd={g => setGameTags(prev => prev.find(t => t.game_id === g.id) ? prev : [...prev, { game_id: g.id, game_name: g.name, game_slug: g.slug }])}
          onRemove={id => setGameTags(prev => prev.filter(t => t.game_id !== id))}
          displayKey="name"
          idKey="game_id"
        />
        <TagSearch
          label="Cards"
          searchUrl={`${API_URL}/api/cards/search?q=`}
          selected={cardTags}
          onAdd={c => setCardTags(prev => prev.find(t => t.card_id === c.id) ? prev : [...prev, { card_id: c.id, card_name: c.name }])}
          onRemove={id => setCardTags(prev => prev.filter(t => t.card_id !== id))}
          displayKey="card_name"
          idKey="card_id"
        />
      </div>

      {/* Publish date + actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm" style={{ color: '#8892a4' }}>Publish date</label>
          <input
            type="datetime-local"
            value={publishedAt}
            onChange={e => setPublishedAt(e.target.value)}
            className="px-3 py-1.5 rounded text-sm"
            style={inputStyle}
          />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => handleSave(false)} disabled={saving}
            className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: '#363d52', color: '#EAEAEA' }}>
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button type="button" onClick={() => handleSave(true)} disabled={saving}
            className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: '#08D9D6', color: '#252A34' }}>
            {saving ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}

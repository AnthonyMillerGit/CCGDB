import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config'
import ConfirmModal from './ConfirmModal'
import ImportResultBanner from './ImportResultBanner'
import ExportMenu, { triggerDownload } from './ExportMenu'

export default function MyDecksTab({ authFetch }) {
  const navigate = useNavigate()
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [games, setGames] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [newDeckGame, setNewDeckGame] = useState('')
  const [creating, setCreating] = useState(false)
  const [showImportForm, setShowImportForm] = useState(false)
  const [importDeckName, setImportDeckName] = useState('')
  const [importDeckGame, setImportDeckGame] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const importFileRef = useRef(null)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`${API_URL}/api/users/me/decks`)
        const data = await res.json()
        setDecks(Array.isArray(data) ? data : [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authFetch])

  async function openForm() {
    setShowForm(true)
    if (games.length === 0) {
      const res = await fetch(`${API_URL}/api/games`)
      const data = await res.json()
      setGames(Array.isArray(data) ? data : [])
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!newDeckName.trim() || !newDeckGame) return
    setCreating(true)
    const res = await authFetch(`${API_URL}/api/users/me/decks`, {
      method: 'POST',
      body: JSON.stringify({ game_id: parseInt(newDeckGame), name: newDeckName.trim() }),
    })
    if (res.ok) {
      const deck = await res.json()
      navigate(`/decks/${deck.id}`)
    }
    setCreating(false)
  }

  async function handleCopy(deck) {
    const res = await authFetch(`${API_URL}/api/decks/${deck.id}/copy`, { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    navigate(`/decks/${data.id}`)
  }

  async function handleDelete(deck) {
    setConfirm({
      message: `Are you sure you want to delete "${deck.name}"? This cannot be undone.`,
      onConfirm: async () => {
        await authFetch(`${API_URL}/api/decks/${deck.id}`, { method: 'DELETE' })
        setDecks(prev => prev.filter(d => d.id !== deck.id))
        setConfirm(null)
      },
    })
  }

  async function openImportForm() {
    setShowImportForm(true)
    setShowForm(false)
    if (games.length === 0) {
      const res = await fetch(`${API_URL}/api/games`)
      const data = await res.json()
      setGames(Array.isArray(data) ? data : [])
    }
  }

  async function handleImportDeck(e) {
    e.preventDefault()
    if (!importDeckName.trim() || !importDeckGame || !importFile) {
      setImportResult({ error: 'Please fill in the deck name, select a game, and choose a file.' })
      return
    }
    setImporting(true)
    const form = new FormData()
    form.append('file', importFile)
    form.append('name', importDeckName.trim())
    form.append('game_id', importDeckGame)
    try {
      const res = await authFetch(`${API_URL}/api/decks/upload`, { method: 'POST', body: form })
      if (!res.ok) {
        const text = await res.text()
        let msg = 'Import failed'
        try { msg = JSON.parse(text).detail || msg } catch {}
        setImportResult({ error: `${msg} (${res.status})` })
        return
      }
      const data = await res.json()
      setImportResult(data)
      const decksRes = await authFetch(`${API_URL}/api/users/me/decks`)
      const decksData = await decksRes.json()
      setDecks(Array.isArray(decksData) ? decksData : [])
      setShowImportForm(false)
      setImportDeckName('')
      setImportDeckGame('')
      setImportFile(null)
      if (data.id) navigate(`/decks/${data.id}`)
    } catch {
      setImportResult({ error: 'Could not reach the server. Make sure you are connected and try again.' })
    } finally {
      setImporting(false)
    }
  }

  const inputStyle = { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading decks…</p>

  return (
    <div>
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      <ImportResultBanner result={importResult} onDismiss={() => setImportResult(null)} />
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {decks.length} {decks.length === 1 ? 'deck' : 'decks'}
        </span>
        {!showForm && !showImportForm && (
          <div className="flex items-center gap-2">
            <button
              onClick={openImportForm}
              className="text-xs px-3 py-1.5 rounded"
              style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent)', border: '1px solid var(--border)' }}
            >
              Import Deck
            </button>
            <button
              onClick={openForm}
              className="px-4 py-2 rounded text-sm font-semibold"
              style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}
            >
              + New Deck
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl flex flex-col sm:flex-row gap-3"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <input
            type="text"
            placeholder="Deck name"
            value={newDeckName}
            onChange={e => setNewDeckName(e.target.value)}
            required
            className="flex-1 px-3 py-2 rounded text-sm"
            style={inputStyle}
          />
          <select
            value={newDeckGame}
            onChange={e => setNewDeckGame(e.target.value)}
            required
            className="flex-1 px-3 py-2 rounded text-sm"
            style={inputStyle}
          >
            <option value="">Select a game…</option>
            {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="submit" disabled={creating}
              className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}>
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded text-sm"
              style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--text-primary)' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {showImportForm && (
        <form onSubmit={handleImportDeck} className="mb-6 p-4 rounded-xl flex flex-col gap-3"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Import Deck from File</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Supports CSV or JSON files exported from CCGVault, or .dec/.txt decklist files.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Deck name"
              value={importDeckName}
              onChange={e => setImportDeckName(e.target.value)}
              required
              className="flex-1 px-3 py-2 rounded text-sm"
              style={inputStyle}
            />
            <select
              value={importDeckGame}
              onChange={e => setImportDeckGame(e.target.value)}
              required
              className="flex-1 px-3 py-2 rounded text-sm"
              style={inputStyle}
            >
              <option value="">Select a game…</option>
              {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={importFileRef}
              type="file"
              accept=".csv,.json,.dec,.txt"
              className="hidden"
              onChange={e => setImportFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => importFileRef.current?.click()}
              className="px-3 py-1.5 rounded text-sm flex-shrink-0"
              style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent)', border: '1px solid var(--border)' }}
            >
              Choose File
            </button>
            <span className="text-sm truncate" style={{ color: importFile ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {importFile ? importFile.name : 'No file chosen'}
            </span>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={importing}
              className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}>
              {importing ? 'Importing…' : 'Import'}
            </button>
            <button type="button" onClick={() => setShowImportForm(false)}
              className="px-4 py-2 rounded text-sm"
              style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--text-primary)' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {decks.length === 0 && !showForm && (
        <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
          <p className="text-lg mb-2">No decks yet.</p>
          <p>Hit <strong style={{ color: 'var(--text-primary)' }}>+ New Deck</strong> to build your first one.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {decks.map(deck => (
          <div key={deck.id}
            className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            onClick={() => navigate(`/decks/${deck.id}`)}
          >
            <div className="shrink-0 rounded overflow-hidden" style={{ width: '44px', height: '62px', backgroundColor: 'var(--bg-chip)' }}>
              {deck.thumbnail_url
                ? <img src={deck.thumbnail_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-muted)', fontSize: '1.4rem' }}>🃏</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{deck.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--accent)' }}>{deck.game_name}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {deck.total_cards} {deck.total_cards === 1 ? 'card' : 'cards'}
                </span>
                {deck.format && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                    {deck.format}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
              <ExportMenu onExport={fmt =>
                triggerDownload(authFetch, `${API_URL}/api/decks/${deck.id}/export?format=${fmt}`, `${deck.name}.${fmt}`)
              } />
              <button
                onClick={e => { e.stopPropagation(); handleCopy(deck) }}
                className="text-xs px-3 py-1.5 rounded"
                style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent)', border: '1px solid var(--border)' }}
              >
                Copy
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(deck) }}
                className="text-xs px-3 py-1.5 rounded"
                style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent-maroon)', border: '1px solid var(--border)' }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

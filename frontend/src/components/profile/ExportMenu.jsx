import { useState, useRef } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'

export async function triggerDownload(authFetch, url, filename) {
  const res = await authFetch(url)
  if (!res.ok) return
  const blob = await res.blob()
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
  URL.revokeObjectURL(href)
}

export default function ExportMenu({ onExport }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const formats = [
    { label: 'CSV', value: 'csv' },
    { label: 'JSON', value: 'json' },
    { label: 'TXT', value: 'txt' },
  ]

  useClickOutside(ref, () => setOpen(false), open)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="text-xs px-3 py-1.5 rounded flex items-center gap-1"
        style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent)', border: '1px solid #9e836a' }}
      >
        Export ▾
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 rounded shadow-lg z-10 py-1 min-w-[80px]"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          {formats.map(f => (
            <button
              key={f.value}
              onClick={e => { e.stopPropagation(); setOpen(false); onExport(f.value) }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#d4c4a8] transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

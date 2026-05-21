export default function ImportResultBanner({ result, onDismiss }) {
  if (!result) return null
  return (
    <div
      className="mb-4 px-4 py-3 rounded flex items-center justify-between gap-4 text-sm"
      style={{
        backgroundColor: result.error ? '#3a1a1a' : '#1a3a2a',
        border: `1px solid ${result.error ? '#6a2d2d' : '#2d6a4a'}`,
        color: result.error ? 'var(--accent-maroon)' : '#1eff00',
      }}
    >
      {result.error
        ? <span>{result.error}</span>
        : <span>Imported {result.imported} card{result.imported !== 1 ? 's' : ''}{result.skipped > 0 ? ` · ${result.skipped} skipped (not found)` : ''}.</span>
      }
      <button onClick={onDismiss} style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1 }}>×</button>
    </div>
  )
}

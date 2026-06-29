import { useState, useRef, useCallback } from 'react'

// Shared pending-guard for quantity edits across collection/deck screens.
// `run(key, fn)` ignores re-entrant calls for the same key while one is in
// flight (preventing double-increments), and exposes `pending[key]` so the UI
// can disable its controls. Returns whatever `fn` resolves to.
export function useQtyEditor() {
  const [pending, setPending] = useState({})
  const inflight = useRef(new Set())

  const run = useCallback(async (key, fn) => {
    if (inflight.current.has(key)) return
    inflight.current.add(key)
    setPending(p => ({ ...p, [key]: true }))
    try {
      return await fn()
    } finally {
      inflight.current.delete(key)
      setPending(p => { const n = { ...p }; delete n[key]; return n })
    }
  }, [])

  return { pending, run }
}

import { useEffect } from 'react'

export function useClickOutside(ref, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    function handleMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) handler(e)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [ref, handler, enabled])
}

// Format a set's release date honestly, according to how precise it actually is.
// `precision` is one of 'exact' | 'month' | 'year' | 'unknown' (see the sets
// table's date_precision column). Guessed dates were placeheld to the 1st of a
// month, so showing a full "January 1, 2004" would be a fabrication — instead we
// show "2004" or "May 2004". Returns null when there's nothing trustworthy to
// show; callers decide the fallback ("Unknown", hidden, etc.).
export function formatSetDate(releaseDate, precision, { short = false } = {}) {
  if (!releaseDate || precision === 'unknown') return null
  const d = new Date(releaseDate + 'T00:00:00')
  if (isNaN(d)) return releaseDate
  const month = short ? 'short' : 'long'
  switch (precision) {
    case 'year':
      return String(d.getFullYear())
    case 'month':
      return d.toLocaleDateString('en-US', { year: 'numeric', month })
    case 'exact':
    default: // undefined precision (older API) → assume exact, preserving prior behavior
      return d.toLocaleDateString('en-US', { year: 'numeric', month, day: 'numeric' })
  }
}

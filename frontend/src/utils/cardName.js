// Display label for a card that has no name.
//
// Some card types are genuinely nameless at the source, not broken in ingest:
// every Godzilla "Rage" card (116) and every FFTCG "Crystal" card (7) ships with
// an empty card_name upstream, while every other type in those games is fully
// named. Their real identity is the printed collector number ("Rage-E09",
// "C-001"), so we show that rather than inventing a name — same principle as
// formatSetDate: surface what's actually known instead of fabricating a value
// that reads as authoritative.
//
// Pass the collector number when the caller has one (list rows and printings do;
// a bare card record may not).
export function displayCardName(card, collectorNumber) {
  if (!card) return ''
  const name = (card.name ?? card.card_name ?? '').trim()
  if (name) return name

  const num = (collectorNumber ?? card.collector_number ?? '').trim()
  const type = (card.card_type ?? '').trim()

  // "Rage-E09" already carries its type, so "Rage Rage-E09" would be redundant.
  if (num && type && !num.toLowerCase().startsWith(type.toLowerCase())) return `${type} ${num}`
  if (num) return num
  if (type) return type
  return 'Unnamed card'
}

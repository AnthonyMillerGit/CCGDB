export function parseAttrs(card) {
  if (!card.attributes) return null
  try { return typeof card.attributes === 'string' ? JSON.parse(card.attributes) : card.attributes }
  catch { return null }
}

export function getAttrVal(card, key) {
  const attrs = parseAttrs(card)
  return attrs ? (attrs[key] ?? null) : null
}

export function attrValToSortable(val) {
  if (val === null || val === undefined) return null
  if (Array.isArray(val)) return val.map(String).sort().join(', ')
  return String(val)
}

export function compareAttrVals(av, bv) {
  if (av === null && bv === null) return 0
  if (av === null) return 1
  if (bv === null) return -1
  const an = parseFloat(av), bn = parseFloat(bv)
  if (!isNaN(an) && !isNaN(bn)) return an - bn
  return av.localeCompare(bv)
}

export function formatAttrKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function isPrimitiveAttrVal(val) {
  if (val === null || val === undefined) return true
  if (Array.isArray(val)) return val.length === 0 || typeof val[0] !== 'object'
  return typeof val !== 'object'
}

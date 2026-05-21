// Recursively remove empty text nodes that make generateHTML throw silently.
export function cleanBody(node) {
  if (!node || typeof node !== 'object') return node
  const out = { ...node }
  if (Array.isArray(out.content)) {
    out.content = out.content
      .map(cleanBody)
      .filter(c => !(c.type === 'text' && c.text === ''))
  }
  return out
}

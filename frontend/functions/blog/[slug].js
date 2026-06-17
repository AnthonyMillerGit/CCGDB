// Cloudflare Pages Function: inject per-post Open Graph / Twitter meta into the
// SPA shell for /blog/:slug, so social crawlers (Discord/Twitter/Facebook),
// which don't run JS, get rich link previews. Human visitors still get the
// normal React SPA — we only rewrite the static HTML <head>.

const API = 'https://api.ccgvault.io'

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function onRequest(context) {
  const { params, next } = context

  // Pull the SPA shell (Pages serves index.html via SPA fallback for this route)
  const response = await next()
  const ct = response.headers.get('content-type') || ''
  if (!ct.includes('text/html')) return response

  let post
  try {
    const apiRes = await fetch(`${API}/api/blog/${encodeURIComponent(params.slug)}`)
    if (!apiRes.ok) return response
    post = await apiRes.json()
  } catch {
    return response
  }

  const title = `${post.title} — CCGVault`
  const desc = (post.excerpt || 'A guide on CCGVault.').slice(0, 200)
  const img = post.cover_image_url || ''
  const url = `https://ccgvault.io/blog/${params.slug}`

  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    img ? `<meta property="og:image" content="${esc(img)}" />` : '',
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    img ? `<meta name="twitter:image" content="${esc(img)}" />` : '',
  ].filter(Boolean).join('\n    ')

  let html = await response.text()
  // Drop the static defaults we're overriding, then inject before </head>
  html = html
    .replace(/<title>[^<]*<\/title>/, '')
    .replace(/<meta property="og:title"[^>]*>/, '')
    .replace(/<meta property="og:description"[^>]*>/, '')
    .replace(/<meta property="og:type"[^>]*>/, '')
    .replace(/<meta property="og:url"[^>]*>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('</head>', `    ${tags}\n  </head>`)

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.set('content-type', 'text/html; charset=utf-8')
  return new Response(html, { status: 200, headers })
}

// Pure builders for the crawler-facing <head>, robots.txt and sitemap.xml.
// No I/O, no browser globals — unit-tested against the real index.html shell.
import { ROUTE_META, SITE } from './routeMeta.js'

const DEFAULT_BASE = SITE.defaultBaseUrl
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s) => escText(s).replace(/"/g, '&quot;')
const clean = (base) => base.replace(/\/+$/, '')

function setTitle(html, title) {
  const t = `<title>${escText(title)}</title>`
  return /<title>[\s\S]*?<\/title>/i.test(html)
    ? html.replace(/<title>[\s\S]*?<\/title>/i, t)
    : html.replace(/<\/head>/i, `  ${t}\n</head>`)
}
function setMeta(html, attr, key, content) {
  const re = new RegExp(`(<meta ${attr}="${key}"[^>]*content=")[^"]*(")`, 'i')
  const tag = `<meta ${attr}="${key}" content="${escAttr(content)}" />`
  return re.test(html) ? html.replace(re, `$1${escAttr(content)}$2`) : html.replace(/<\/head>/i, `  ${tag}\n</head>`)
}
function setCanonical(html, href) {
  const re = /(<link rel="canonical"[^>]*href=")[^"]*(")/i
  const tag = `<link rel="canonical" href="${escAttr(href)}" />`
  return re.test(html) ? html.replace(re, `$1${escAttr(href)}$2`) : html.replace(/<\/head>/i, `  ${tag}\n</head>`)
}

export function injectRouteMeta(html, { meta, baseUrl = DEFAULT_BASE, path, noindex = false }) {
  const base = clean(baseUrl)
  let out = html
  if (base !== DEFAULT_BASE) out = out.split(DEFAULT_BASE).join(base) // swap og:image / JSON-LD host
  const canonical = path === '/' ? `${base}/` : `${base}${path}`
  out = setTitle(out, meta.title)
  out = setMeta(out, 'name', 'description', meta.description)
  out = setMeta(out, 'property', 'og:title', meta.title)
  out = setMeta(out, 'property', 'og:description', meta.description)
  out = setMeta(out, 'property', 'og:url', canonical)
  out = setMeta(out, 'name', 'twitter:title', meta.title)
  out = setMeta(out, 'name', 'twitter:description', meta.description)
  out = setCanonical(out, canonical)
  out = setMeta(out, 'name', 'robots', (noindex || meta.index === false) ? 'noindex, nofollow' : 'index, follow')
  return out
}

export function genRobots({ baseUrl = DEFAULT_BASE, noindex = false }) {
  if (noindex) return 'User-agent: *\nDisallow: /\n'
  return `User-agent: *\nAllow: /\n\nSitemap: ${clean(baseUrl)}/sitemap.xml\n`
}

export function genSitemap({ baseUrl = DEFAULT_BASE }) {
  const base = clean(baseUrl)
  const urls = Object.entries(ROUTE_META)
    .filter(([, m]) => m.index !== false)
    .map(([p]) => `  <url><loc>${base}${p === '/' ? '/' : p}</loc></url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

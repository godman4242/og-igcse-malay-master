import { useEffect } from 'react'

/**
 * Page-level <head> updater (title / description / canonical / OG / Twitter).
 * Replaces a prior react-helmet-async implementation (2026-05-25, perf pass)
 * that pulled ~28KB into the eager Layout chunk.
 *
 * Crawler-facing meta is handled at BUILD time by the seoPrerender Vite plugin
 * (src/lib/seoHead.js), which stamps each route's own <head> into a static
 * dist/<route>/index.html from src/lib/routeMeta.js — that is what a no-JS
 * crawler sees. THIS component keeps the live DOM in sync on client navigation
 * (correct tab title for humans, and correct canonical/OG for a JS-running
 * social scraper that follows an in-app link). VITE_BASE_URL feeds the
 * canonical/OG host so it matches the prerendered value per deployment.
 */
export default function Meta({
  title = "IGCSE Malay Master",
  description = "The ultimate AI-powered revision platform for IGCSE Malay students. Dictionary, Flashcards, and Cikgu Maya.",
}) {
  useEffect(() => {
    if (title && document.title !== title) document.title = title
    const base = (import.meta.env.VITE_BASE_URL || 'https://upg-igcse-malay-master.vercel.app').replace(/\/+$/, '')
    const path = window.location.pathname
    const canonical = path === '/' ? `${base}/` : `${base}${path.replace(/\/+$/, '')}`

    const setMeta = (sel, attr, key, content) => {
      if (content == null) return
      let el = document.head.querySelector(sel)
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    let link = document.head.querySelector('link[rel="canonical"]')
    if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'canonical'); document.head.appendChild(link) }
    link.setAttribute('href', canonical)
    setMeta('meta[name="description"]', 'name', 'description', description)
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonical)
    setMeta('meta[property="og:title"]', 'property', 'og:title', title)
    setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
  }, [title, description])
  return null
}

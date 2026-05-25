import { useEffect } from 'react'

/**
 * Page-level title + description updater. Replaces a prior implementation
 * built on react-helmet-async (2026-05-25, perf pass): that library pulled
 * ~28KB into the eager Layout chunk just to render <head> children which,
 * for an SPA, social crawlers never see anyway (they don't run JS — only
 * index.html's static <head> matters for OG/Twitter previews). For
 * humans the only meaningful effect is the browser tab title and the
 * in-DOM description meta tag, both of which we set imperatively here.
 *
 * If we ever want true social-preview support, add the OG/Twitter tags
 * to index.html (they're trivial and don't change per-route).
 */
export default function Meta({
  title = "IGCSE Malay Master",
  description = "The ultimate AI-powered revision platform for IGCSE Malay students. Dictionary, Flashcards, and Cikgu Maya.",
}) {
  useEffect(() => {
    if (title && document.title !== title) document.title = title
    if (description) {
      let el = document.querySelector('meta[name="description"]')
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('name', 'description')
        document.head.appendChild(el)
      }
      el.setAttribute('content', description)
    }
  }, [title, description])
  return null
}

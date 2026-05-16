import { Helmet } from 'react-helmet-async'

/**
 * SEO & Meta Manager component.
 * Sets the page title, description, and OpenGraph tags for rich link previews
 * on WhatsApp, iMessage, and social media.
 */
export default function Meta({ 
  title = "IGCSE Malay Master", 
  description = "The ultimate AI-powered revision platform for IGCSE Malay students. Dictionary, Flashcards, and Cikgu Maya.",
  path = ""
}) {
  const siteUrl = "https://upg-igcse-malay-master.vercel.app"
  const fullUrl = `${siteUrl}${path}`
  const siteName = "IGCSE Malay Master"

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* OpenGraph / Facebook / WhatsApp */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:image" content={`${siteUrl}/icon-512.png`} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={`${siteUrl}/icon-512.png`} />
    </Helmet>
  )
}

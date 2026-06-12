// Session JWT header for the server-side /api/translate proxy, shared by
// the deepl and google providers. Mirrors the attach logic in
// src/lib/gemini.js: await initSupabase (not the sync getSupabase getter)
// so a cold-load call doesn't race AuthGuard's lazy init and arrive at the
// proxy with no Authorization header.
//
// Guests get {} — the proxy answers 401 and the translate router's
// fall-through chain degrades to the free gtx provider, so this is never
// a dead end.
export async function getSessionAuthHeader() {
  try {
    const { initSupabase } = await import('../../../config/supabase')
    const client = await initSupabase()
    if (client) {
      const { data } = await client.auth.getSession()
      if (data?.session?.access_token) {
        return { Authorization: `Bearer ${data.session.access_token}` }
      }
    }
  } catch { /* no session — the proxy will 401 and the router falls through */ }
  return {}
}

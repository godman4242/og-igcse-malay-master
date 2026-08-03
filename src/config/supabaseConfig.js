// src/config/supabaseConfig.js
// Zero-dependency shim: exposes only the env-derived config so consumers can
// statically import it without pulling the full supabase.js module (and the
// @supabase/supabase-js runtime it lazy-loads) into their chunk.

// ⚠️ `enabled` is a PRESENCE check — "a backend is configured" — and is
// deliberately NOT a reachability check. It stays a synchronous constant
// because ~12 consumers read it on a render path (AuthModal, AuthUnlock,
// Settings, the store's sync gates); making it async would push a network
// round-trip into first paint.
//
// The cost of that is real and bit us: Supabase pauses a free-tier project
// after ~1 week idle and the subdomain stops resolving, so every call rejects
// while `enabled` still says true — the app believed cloud sync was on and
// failed silently for days (2026-08-02, review finding C1).
//
// Reachability is therefore observed at the point of failure, not here:
// `hydrateCloudData` (src/store/useStore.js) and AuthGuard's state-blob sync
// call `setCloudUnavailable(...)`, which raises `sync.cloudUnavailable` and
// makes the header pill read "Cloud backup unavailable" (lib/syncStatus.js
// `cloudPillLabel`). If you add a NEW cloud call, report its failure the same
// way — a swallowed catch here is invisible to the user by construction.
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  key: import.meta.env.VITE_SUPABASE_KEY || '',
  enabled: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_KEY),
}

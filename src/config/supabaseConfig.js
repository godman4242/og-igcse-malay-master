// src/config/supabaseConfig.js
// Zero-dependency shim: exposes only the env-derived config so consumers can
// statically import it without pulling the full supabase.js module (and the
// @supabase/supabase-js runtime it lazy-loads) into their chunk.

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  key: import.meta.env.VITE_SUPABASE_KEY || '',
  enabled: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_KEY),
}

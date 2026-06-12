// In-memory fake Supabase backend for the cross-device cloud-sync integration
// suite (quality-debt ledger Q-1). NOT shipped to production — test-utils only.
//
// Design: fake at the `@supabase/supabase-js` createClient boundary, one level
// DEEPER than the data-access layer. The real cloudSync.js query chains, the
// real pushStateBlob/pullStateBlob sanitization, the real syncEngine, and the
// real store merge all execute against this; only the network/Postgres layer
// is replaced. Semantics mirrored from PostgREST/Postgres:
//   - upsert with onConflict: replace the whole row on key collision
//   - .eq() filters compose; .order()/.limit() apply after filtering
//   - .single() errors on 0 rows (PGRST116-style), like the real client
//   - JSONB round-trip: payloads are JSON-cloned on write, so functions are
//     dropped and later mutations of the caller's object never leak in —
//     exactly what shipping a Zustand store through Postgres does.
//
// `hooks.beforeUpsert(table, rows)` is awaited BEFORE a write lands — the
// injection point that lets a test mutate a store mid-flush deterministically
// (the P1-2 queue-clobber scenario).

function jsonClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

// Conflict keys per table, mirroring supabase/setup_all_tables.sql.
const CONFLICT_KEYS = {
  user_cards: ['user_id', 'card_key'],
  user_state: ['user_id'],
  writing_history: ['user_id', 'entry_id'],
  speaking_history: ['user_id', 'entry_id'],
  sync_events: ['user_id', 'idempotency_key'],
  profiles: ['user_id'],
}

export function createFakeSupabaseBackend() {
  const tables = new Map() // table name -> Map(conflictKey -> row) | Array (no key)
  const hooks = { beforeUpsert: null }
  const counts = { upserts: {}, inserts: {} }

  function tableStore(name) {
    if (!tables.has(name)) {
      tables.set(name, CONFLICT_KEYS[name] ? new Map() : [])
    }
    return tables.get(name)
  }

  function rowsOf(name) {
    const store = tableStore(name)
    return Array.isArray(store) ? [...store] : [...store.values()]
  }

  function conflictKeyOf(name, row, onConflict) {
    const cols = onConflict ? onConflict.split(',').map(c => c.trim()) : CONFLICT_KEYS[name]
    return (cols || []).map(c => String(row[c])).join('|')
  }

  async function applyUpsert(name, rawRows, onConflict) {
    const rows = (Array.isArray(rawRows) ? rawRows : [rawRows]).map(jsonClone)
    if (hooks.beforeUpsert) await hooks.beforeUpsert(name, rows)
    const store = tableStore(name)
    counts.upserts[name] = (counts.upserts[name] || 0) + 1
    for (const row of rows) {
      if (Array.isArray(store)) store.push(row)
      else store.set(conflictKeyOf(name, row, onConflict), row)
    }
    return { data: rows, error: null }
  }

  async function applyInsert(name, rawRows) {
    const rows = (Array.isArray(rawRows) ? rawRows : [rawRows]).map(jsonClone)
    const store = tableStore(name)
    counts.inserts[name] = (counts.inserts[name] || 0) + 1
    for (const row of rows) {
      if (Array.isArray(store)) store.push(row)
      else store.set(conflictKeyOf(name, row), row)
    }
    return { data: rows, error: null }
  }

  function runSelect(name, { columns, filters, order, limit, single }) {
    let rows = rowsOf(name).filter(row => filters.every(([col, val]) => row[col] === val))
    if (order) {
      const { column, ascending } = order
      rows = [...rows].sort((a, b) => {
        const av = a[column]; const bv = b[column]
        if (av === bv) return 0
        return (av > bv ? 1 : -1) * (ascending ? 1 : -1)
      })
    }
    if (limit != null) rows = rows.slice(0, limit)
    const cols = columns && columns !== '*'
      ? columns.split(',').map(c => c.trim())
      : null
    const data = rows.map(row => {
      if (!cols) return jsonClone(row)
      const out = {}
      for (const c of cols) out[c] = jsonClone(row[c])
      return out
    })
    if (single) {
      if (data.length === 0) {
        return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } }
      }
      return { data: data[0], error: null }
    }
    return { data, error: null }
  }

  // Thenable query builder mirroring PostgrestFilterBuilder: every method
  // returns the builder; awaiting it executes the accumulated query.
  function makeBuilder(name) {
    const q = { columns: null, filters: [], order: null, limit: null, single: false }
    let exec = null // set by upsert/insert/delete; select path executes lazily

    const builder = {
      select(columns) { q.columns = columns; return builder },
      eq(col, val) { q.filters.push([col, val]); return builder },
      order(column, opts = {}) { q.order = { column, ascending: opts.ascending !== false }; return builder },
      limit(n) { q.limit = n; return builder },
      single() { q.single = true; return builder },
      upsert(rows, opts = {}) { exec = () => applyUpsert(name, rows, opts.onConflict); return builder },
      insert(rows) { exec = () => applyInsert(name, rows); return builder },
      delete() { exec = async () => ({ data: null, error: null }); return builder },
      then(resolve, reject) {
        const run = exec ? exec() : Promise.resolve(runSelect(name, q))
        return Promise.resolve(run).then(resolve, reject)
      },
    }
    return builder
  }

  function createClient({ user }) {
    return {
      __fake: true,
      from: (name) => makeBuilder(name),
      auth: {
        getUser: async () => ({ data: { user }, error: null }),
        getSession: async () => ({ data: { session: user ? { user } : null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({ error: null }),
      },
    }
  }

  return {
    tables,
    hooks,
    counts,
    rows: rowsOf,
    createClient,
    // Direct row lookup by conflict key, e.g. backend.row('user_cards', 'user-1|rumah::DeckA')
    row(name, key) {
      const store = tableStore(name)
      return Array.isArray(store) ? undefined : store.get(key)
    },
  }
}

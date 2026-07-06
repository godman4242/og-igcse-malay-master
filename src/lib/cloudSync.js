import { getCurrentUser, initSupabase, upsertUserProfile } from '../config/supabase'
import { cardLang } from './cardLang'

const UPSERT_CHUNK_SIZE = 250

function cardKey(card) {
  const base = `${card?.m || ''}::${card?.t || ''}`
  // v34: English cards get a `::en` suffix so a same-word MS/EN pair (e.g. the
  // loanword "hotel" saved in both decks) no longer collides on the
  // (user_id, card_key) unique constraint and silently overwrite each other.
  // MS keys stay byte-identical to pre-v34 → existing cloud rows need no backfill.
  return cardLang(card) === 'en' ? `${base}::en` : base
}

function writingEntryId(entry) {
  return entry?.id || `${entry?.ts || ''}:${entry?.lang || ''}:${entry?.format || ''}:${entry?.words || ''}`
}

function speakingEntryId(entry) {
  return entry?.id || `${entry?.ts || ''}:${entry?.scenarioId || ''}:${entry?.turnIndex || ''}:${entry?.words || ''}`
}

async function getCloudContext() {
  const client = await initSupabase()
  if (!client) throw new Error('cloud_not_configured')
  const user = await getCurrentUser()
  if (!user) throw new Error('cloud_auth_required')
  return { client, user }
}

async function upsertRows(client, table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE)
    const { error } = await client
      .from(table)
      .upsert(chunk, { onConflict })
    if (error) throw error
  }
}

export async function upsertCloudCards(cards) {
  const cleanCards = (cards || []).filter(card => card?.m)
  if (!cleanCards.length) return true

  const { client, user } = await getCloudContext()
  const rows = cleanCards.map(card => ({
    user_id: user.id,
    card_key: cardKey(card),
    card,
    deleted: false,
    updated_at: new Date().toISOString(),
  }))

  await upsertRows(client, 'user_cards', rows, 'user_id,card_key')
  return true
}

export async function deleteCloudCard({ malay, deck, lang }) {
  if (!malay) return true
  const { client, user } = await getCloudContext()
  // Carry lang so the tombstone targets the SAME card_key the card was upserted
  // under (an English copy's key has the `::en` suffix). Absent → ms key.
  const card = { m: malay, t: deck || '', lang }
  const { error } = await client
    .from('user_cards')
    .upsert({
      user_id: user.id,
      card_key: cardKey(card),
      card,
      deleted: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,card_key' })
  if (error) throw error
  return true
}

export async function fetchCloudCards() {
  const { client, user } = await getCloudContext()
  const { data, error } = await client
    .from('user_cards')
    .select('card')
    .eq('user_id', user.id)
    .eq('deleted', false)
    .order('updated_at', { ascending: false })
    .limit(5000)
  if (error) throw error
  return (data || []).map(row => row.card).filter(card => card?.m)
}

// The COMPLEMENT of fetchCloudCards: the set of card_keys the cloud has
// tombstoned (deleted:true). fetchCloudCards hides these, so the sign-in pull
// can't see a card another device deleted — and a stale device would re-push
// its still-local copy as live (deleted:false), resurrecting it everywhere
// (P2-C2). hydrateCloudData uses this set to drop locally-tombstoned cards
// BEFORE the snapshot push, so the device stops resurrecting them.
export async function fetchCloudDeletedCardKeys() {
  const { client, user } = await getCloudContext()
  const { data, error } = await client
    .from('user_cards')
    .select('card_key')
    .eq('user_id', user.id)
    .eq('deleted', true)
    .limit(5000)
  if (error) throw error
  return new Set((data || []).map(row => row.card_key).filter(Boolean))
}

export async function insertCloudWritingHistory(entry) {
  if (!entry?.ts) return true
  return upsertCloudWritingHistory([entry])
}

export async function upsertCloudWritingHistory(entries) {
  const cleanEntries = (entries || []).filter(entry => entry?.ts)
  if (!cleanEntries.length) return true

  const { client, user } = await getCloudContext()
  const rows = cleanEntries.map(entry => ({
    user_id: user.id,
    entry_id: writingEntryId(entry),
    entry,
    created_at: entry.ts,
  }))

  await upsertRows(client, 'writing_history', rows, 'user_id,entry_id')
  return true
}

export async function fetchCloudWritingHistory() {
  const { client, user } = await getCloudContext()
  const { data, error } = await client
    .from('writing_history')
    .select('entry')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data || []).map(row => row.entry).filter(entry => entry?.ts)
}

export async function insertCloudSpeakingHistory(entry) {
  if (!entry?.ts) return true
  return upsertCloudSpeakingHistory([entry])
}

export async function upsertCloudSpeakingHistory(entries) {
  const cleanEntries = (entries || []).filter(entry => entry?.ts)
  if (!cleanEntries.length) return true

  const { client, user } = await getCloudContext()
  const rows = cleanEntries.map(entry => ({
    user_id: user.id,
    entry_id: speakingEntryId(entry),
    entry,
    created_at: entry.ts,
  }))

  await upsertRows(client, 'speaking_history', rows, 'user_id,entry_id')
  return true
}

export async function fetchCloudSpeakingHistory() {
  const { client, user } = await getCloudContext()
  const { data, error } = await client
    .from('speaking_history')
    .select('entry')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data || []).map(row => row.entry).filter(entry => entry?.ts)
}

export async function syncCloudSnapshot({ cards, writingHistory, speakingHistory }) {
  await Promise.all([
    upsertCloudCards(cards || []),
    upsertCloudWritingHistory(writingHistory || []),
    upsertCloudSpeakingHistory(speakingHistory || []),
  ])
  return {
    cards: (cards || []).filter(card => card?.m).length,
    writingEntries: (writingHistory || []).filter(entry => entry?.ts).length,
    speakingEntries: (speakingHistory || []).filter(entry => entry?.ts).length,
  }
}

export async function archiveCloudSyncEvent(event) {
  const { client, user } = await getCloudContext()
  const { error } = await client
    .from('sync_events')
    .upsert({
      user_id: user.id,
      idempotency_key: event.idempotencyKey || event.id,
      event_type: event.type,
      payload: event.payload || {},
      created_at: event.createdAt || new Date().toISOString(),
    }, { onConflict: 'user_id,idempotency_key' })
  if (error) throw error
  return true
}

export async function processCloudSyncEvent(event, state) {
  const payload = event.payload || {}

  if (event.type === 'card_added') {
    return upsertCloudCards([payload.card])
  }

  if (event.type === 'cards_added') {
    return upsertCloudCards(payload.cards || [])
  }

  if (event.type === 'card_removed') {
    return deleteCloudCard(payload)
  }

  if (event.type === 'card_reviewed') {
    // Scope by m::t (+ lang when present) so a review syncs ONLY the studied
    // copy, not every deck — or, for a same-word MS/EN pair, the other language
    // (P2-C1 + v34). Mirrors reviewCardAction.
    const { malay, deck, lang } = payload
    const cards = state.cards.filter(c => c.m === malay && c.t === deck && (!lang || cardLang(c) === lang))
    if (cards.length) return upsertCloudCards(cards)
    return archiveCloudSyncEvent(event)
  }

  if (event.type === 'writing_feedback_logged') {
    return insertCloudWritingHistory(payload.entry)
  }

  if (event.type === 'speaking_attempt_logged') {
    return insertCloudSpeakingHistory(payload.entry)
  }

  if (event.type === 'profile_updated') {
    // Best-effort upsert of UDL preferences (userInterests, theme flags, identity).
    // Payload carries the slice the caller wants to push; falls back to current store snapshot.
    const ok = await upsertUserProfile(payload || {})
    if (!ok) throw new Error('profile_upsert_failed')
    return true
  }

  return archiveCloudSyncEvent(event)
}

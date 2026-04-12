# Database Schema — IGCSE Malay Master

**Status:** Phase 0 documentation | Phase 1 implementation planned Q2 2026  
**Stack:** Supabase (PostgreSQL) + localStorage (offline-first cache)

## Overview

The app uses a **hybrid persistence model**:
- **Client-side:** localStorage for instant, offline study (no latency)
- **Server-side:** Supabase PostgreSQL for cloud sync, accounts, and analytics (Phase 1)

All cards, progress, and user data are stored locally first. When online and authenticated, changes sync to Supabase asynchronously.

---

## Phase 0: localStorage Schema

Current production schema (client-side only).

### Key: `igcse-cc` — Custom Cards Deck

```javascript
[
  {
    m: "buku",                          // Malay word
    e: "book",                          // English translation
    ex: "Dia membaca buku setiap hari.", // Example sentence
    t: "Imported",                      // Topic/deck name
    p: "n",                             // Progress: n=new, l=learning, m=mastered
    box: 0,                             // Leitner box (0-5)
    ease: 2.5,                          // SM-2 ease factor
    interval: 1,                        // Days until next review
    lastReview: 1712000000000,          // Timestamp of last review
    nextReview: 1712086400000,          // Timestamp of next review
    mn: ""                              // Mnemonic/extra notes
  }
]
```

### Key: `igcse-prog` — Progress State

```javascript
{
  streak: 5,                            // Current study streak (days)
  lastReviewDate: "2026-04-07",        // Last day studied
  sessionCount: 42,                     // Total study sessions
  totalReviewed: 1200,                  // Total cards reviewed
  totalMastered: 87,                    // Cards in mastered state
  topicsProgress: {
    "Imported": { total: 45, mastered: 12 },
    "Dictionary": { total: 495, mastered: 67 }
  }
}
```

### Key: `igcse-cache` — Translation Cache

```javascript
{
  "buku": "book",
  "rumah": "house",
  "makan": "eat"
}
```

---

## Phase 1: Supabase Schema

Planned for Q2 2026 when backend support is introduced.

### Table: `users`

User accounts and preferences.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, FK → auth.users | User ID from Supabase Auth |
| email | TEXT | UNIQUE, NOT NULL | Email address (login credential) |
| display_name | TEXT | | User's display name |
| daily_goal | INTEGER | DEFAULT 10 | Cards to review per day |
| theme | TEXT | DEFAULT 'dark' | 'dark' or 'light' |
| language | TEXT | DEFAULT 'ms-MY' | Locale (ms-MY for Malaysian Malay) |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation date |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last profile update |

**Indexes:** PRIMARY KEY, email UNIQUE

### Table: `card_state`

SM-2 progress for each flashcard.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → users.id | Which user owns this card |
| card_m | TEXT | NOT NULL | Malay word (lookup key) |
| ease | FLOAT | DEFAULT 2.5 | SM-2 ease factor (1.3–2.5) |
| interval | INTEGER | DEFAULT 1 | Days until next review |
| box | INTEGER | DEFAULT 0 | Leitner box level (0–5) |
| last_review | TIMESTAMP | | When the card was last reviewed |
| next_review | TIMESTAMP | | When the card is due next |
| created_at | TIMESTAMP | DEFAULT NOW() | When this card was added to deck |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last sync with client |
| **Unique** | | (user_id, card_m) | One entry per user per card |

**Indexes:**
- PRIMARY KEY on id
- UNIQUE (user_id, card_m)
- INDEX ON user_id (fast user lookups)
- INDEX ON next_review (fast "due cards" queries)

**Queries:**
```sql
-- Get due cards for today
SELECT * FROM card_state 
WHERE user_id = $1 AND next_review <= NOW()
ORDER BY next_review ASC;

-- Update card after review
UPDATE card_state 
SET ease = $1, interval = $2, box = $3, next_review = $4, updated_at = NOW()
WHERE user_id = $5 AND card_m = $6;
```

### Table: `study_session`

Metadata about study sessions for analytics.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Session ID |
| user_id | UUID | FK → users.id |
| mode | TEXT | Study mode: 'fc', 'quiz', 'type', 'listen', 'cloze', 'speak', 'roleplay' |
| deck | TEXT | Deck name studied (nullable for mixed) |
| cards_due | INTEGER | Cards due at session start |
| cards_reviewed | INTEGER | Cards actually reviewed |
| duration_seconds | INTEGER | How long the session lasted |
| average_quality | FLOAT | Average quality rating (0–5) |
| created_at | TIMESTAMP | Session start time |

**Indexes:** user_id, created_at

### Table: `roleplay_attempt`

Interactive roleplay session results.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Attempt ID |
| user_id | UUID | FK → users.id |
| scenario | TEXT | Scenario name (e.g., "Kapal Terbang") |
| score | INTEGER | Score out of 100 |
| turns_json | JSONB | Array of turn data: `[{ turn: 1, userText, feedback, score }, ...]` |
| feedback | TEXT | Overall session feedback |
| created_at | TIMESTAMP | When attempt was completed |

**Example turns_json:**
```json
[
  {
    "turn": 1,
    "userText": "Selamat pagi, saya ingin membeli tiket pesawat.",
    "feedback": "Bagus! Anda menggunakan bahasa formal.",
    "score": 85
  }
]
```

### Table: `streak`

Daily study streaks (one per user).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Streak ID |
| user_id | UUID | FK → users.id (UNIQUE) |
| count | INTEGER | Current streak count (days) |
| last_date | DATE | Last day studied |
| created_at | TIMESTAMP | When streak tracking started |

**Logic:**
- Increment `count` if studied today and `last_date` = yesterday
- Reset `count` to 1 if studied today but `last_date` < yesterday
- Preserve `count` if studied today and `last_date` = today (idempotent)

---

## Data Sync Flow (Phase 1)

### Write Path (Client → Server)

1. User reviews card locally (localStorage update)
2. useStore calls `addCardReview()` → SM-2 algorithm updates card
3. If authenticated: fire `syncProgressToCloud(userId, card)`
4. Supabase upsert into `card_state` table
5. On conflict (same user+card), update ease/interval/next_review
6. localStorage as source of truth until sync complete

### Read Path (Server → Client)

1. App loads; user is authenticated
2. Call `fetchProgressFromCloud(userId)`
3. Merge cloud state with localStorage:
   - For each cloud card: `last_updated_at` > `local updated_at` → use cloud
   - For each local card: not in cloud → push to cloud
4. Resolve conflicts with last-write-wins + explicit timestamps

### Offline Behavior

- Study works entirely from localStorage
- No sync attempts until online + authenticated
- On reconnect: auto-sync in background without blocking UI
- Offline indicator in top nav (future)

---

## Authentication (Phase 1)

Supabase Auth provides:
- Email/password signup and login
- Google OAuth (optional)
- Email verification (optional)
- Password reset flow
- JWT tokens for API requests

**Session persistence:** localStorage token auto-revalidates on app load.

---

## Query Patterns

### Due Cards for Today
```sql
SELECT * FROM card_state 
WHERE user_id = $1 AND next_review <= CURRENT_DATE
ORDER BY next_review ASC
LIMIT 20;
```

### Weekly Study Heatmap
```sql
SELECT DATE(created_at) as date, COUNT(*) as sessions
FROM study_session
WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date ASC;
```

### Progress by Topic (Future)
```sql
SELECT card_m, AVG(ease) as avg_ease, COUNT(*) as reviews
FROM card_state
WHERE user_id = $1
GROUP BY card_m
ORDER BY avg_ease DESC;
```

---

## Performance Notes

- **Indexes:** All FK columns and frequently-queried fields indexed
- **Partitioning:** Consider partitioning `study_session` by user_id if > 10M rows
- **Caching:** Supabase auto-caches for 1 min by default
- **Realtime:** Not needed for Phase 1 (single-device study)
- **Row security:** Implement RLS policies to prevent cross-user data access

---

## Migration Strategy (Phase 1)

1. Existing localStorage data migrates to Supabase on first login
2. Endpoint: `POST /api/migrate-local-to-cloud`
3. Bulk upsert into card_state from localStorage
4. Mark migration as complete in users table
5. Clear localStorage copy (keep as backup for 7 days)

---

## Backup & Recovery

- **Client backup:** Export to JSON via `exportToJSON()` utility
- **Server backup:** Supabase daily auto-backup + point-in-time recovery
- **User-initiated:** "Download my data" feature (Phase 2) via CSV/JSON export

---

## Cost Estimate (Phase 1)

**Supabase Free Tier Limits:**
- 500MB DB storage
- 2GB egress/month
- Up to 100k realtime connections (not used)
- Perfect for 1,000 monthly active users

**Upgrade plan (if needed):**
- Pro: $25/month → 2GB storage, 50GB egress
- Scales linearly beyond that

---

## GDPR & Data Privacy

- Users can request data export via `exportProgressStats()`
- Account deletion cascades: delete from users → ON CASCADE delete all related rows
- No personally identifiable info except email (for auth only)
- localStorage not sent to analytics (Phase 4)

---

## Future Enhancements (Phase 2+)

- **Realtime sync:** Multi-device study with instant updates
- **Analytics:** Funnel analysis, cohort retention, LTV
- **Tuning:** Adaptive SM-2 based on historical performance
- **Export:** Per-topic progress reports for teachers

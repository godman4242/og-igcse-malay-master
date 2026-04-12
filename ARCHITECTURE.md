# Architecture — IGCSE Malay Master

**Version:** Phase 0 (Current) | Phase 1 planned Q2 2026  
**Last Updated:** 2026-04-07

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
├─────────────────────────────────────────────────────────────────┤
│  React 19 SPA                                                     │
│  ├─ React Router v7 (7 routes)                                  │
│  ├─ Zustand (localStorage persistence)                          │
│  ├─ Tailwind CSS 4 (@theme tokens)                              │
│  └─ Web Speech API (TTS/STT)                                    │
├─────────────────────────────────────────────────────────────────┤
│  localStorage (Phase 0: Source of truth)                        │
│  ├─ igcse-cc (custom cards)                                     │
│  ├─ igcse-prog (progress state)                                 │
│  └─ igcse-cache (translations)                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    (Phase 1: with auth)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Supabase Backend (Cloud)                        │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                             │
│  ├─ users (auth profiles)                                       │
│  ├─ card_state (SM-2 progress)                                  │
│  ├─ study_session (analytics)                                   │
│  ├─ roleplay_attempt (speaking practice results)                │
│  └─ streak (daily study tracking)                               │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Auth (JWT + OAuth)                                    │
│  Realtime Subscriptions (Phase 2+)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Client Architecture

### Directory Structure

```
src/
├── main.jsx                 # React entry point
├── App.jsx                  # Router setup + global layout
├── index.css               # Tailwind + theme tokens (@theme block)
│
├── components/
│   ├── Layout.jsx          # Shared header + nav wrapper
│   └── SearchModal.jsx     # Global / search for vocabulary
│
├── pages/                  # One per route (self-contained)
│   ├── Dashboard.jsx       # Home: streak, due cards, progress ring
│   ├── Study.jsx           # 7 study modes (fc, quiz, type, listen, cloze, speak)
│   ├── Roleplay.jsx        # Interactive AI conversation (Phase 1)
│   ├── Grammar.jsx         # Imbuhan drills + exercises
│   ├── Writing.jsx         # Malay essays + feedback (regex + LLM Phase 1)
│   ├── Import.jsx          # Paste text, create vocab + word-by-word
│   └── Settings.jsx        # Theme, language, daily goal, export
│
├── lib/                    # Pure utility functions
│   ├── sm2.js              # Spaced repetition algorithm
│   ├── speech.js           # Web Speech API wrapper (TTS/STT)
│   ├── pronunciation.js    # Speech scoring (phonetic diff)
│   ├── translate.js        # Dictionary + Google Translate fallback
│   ├── confetti.js         # Celebration animation
│   ├── cikguBot.js         # AI conversation engine (NEW Phase 0)
│   └── export.js           # CSV/JSON/PDF export (NEW Phase 0)
│
├── data/                   # Static JS objects (imported at build time)
│   ├── dictionary.js       # 495 base vocabulary words
│   ├── topics.js           # Deck/topic definitions
│   ├── grammar.js          # Grammar rules + imbuhan patterns
│   ├── scenarios.js        # 9 roleplay scenarios
│   └── writing.js          # Essay templates + markers
│
├── store/
│   └── useStore.js         # Zustand store (single source of truth)
│
└── config/
    └── supabase.js         # Supabase client init (NEW Phase 0, used in Phase 1)
```

---

## State Management: Zustand Store

**File:** `src/store/useStore.js`

All app state lives in one Zustand store, persisted to localStorage automatically.

### Store Structure

```javascript
{
  // Deck: all flashcards (base dict + custom)
  cards: [...],
  addCard(card),
  addCards(cards),
  updateCard(malay, updates),
  removeCard(malay),
  
  // Progress: SM-2 state for cards
  reviewCard(malay, quality),      // Updates ease/interval via SM-2
  getReviewQueue(deckName),         // Returns due cards sorted
  
  // Streaks: daily study tracking
  streak: 0,
  incrementStreak(),
  resetStreak(),
  getStreak(),
  lastReviewDate: "2026-04-07",
  
  // User preferences
  theme: 'dark',                   // 'dark' or 'light'
  dailyGoal: 10,                   // Cards to review per day
  language: 'ms-MY',               // Malay locale
  
  // Study session state (transient, not persisted long-term)
  currentDeck: null,
  currentSession: null,
  
  // Auth state (Phase 1)
  user: null,
  isAuthenticated: false,
  
  // Cloud sync (Phase 1)
  syncStatus: 'idle',              // 'idle' | 'syncing' | 'error'
  lastSyncTime: null
}
```

### Key Patterns

**Card lookup:** O(1) via object key `cards['malay_word']`  
**Progress update:** SM-2 algorithm applied in-place to card  
**Persistence:** Zustand middleware auto-saves to localStorage on every change  
**Rehydration:** On app load, localStorage state restored automatically

---

## Routing & Pages

**Router:** React Router v7 (client-side)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Dashboard.jsx | Home: streak, due cards, progress dashboard |
| `/study` | Study.jsx | Core learning: 7 study modes, SM-2 progress |
| `/roleplay` | Roleplay.jsx | Interactive roleplay scenarios (Phase 1) |
| `/grammar` | Grammar.jsx | Imbuhan drills + grammar exercises |
| `/writing` | Writing.jsx | Essay analyzer + templates |
| `/import` | Import.jsx | Text import + vocabulary builder |
| `/settings` | Settings.jsx | User prefs, export, theme toggle |

**Navigation:** Bottom nav bar + / key for global search

---

## Study Modes (in Study.jsx)

All modes share the same card pool, SM-2 algorithm, and progress state.

### Mode: Flashcard (`fc`)
- Show card front (Malay), flip to show back (English + example)
- Rate quality 1–5 → SM-2 updates ease/interval
- Keyboard shortcuts: Space to flip, 1-3 to rate, N for next, S for sound

### Mode: Quiz (`quiz`)
- Multiple choice: 1 correct + 3 random distractors
- Auto-grade on selection
- Wrong answer shows correct one before moving to next

### Mode: Type Answer (`type`)
- Show English definition, user types Malay word
- Fuzzy match (strip diacritics, accept ~80% char match)
- Show correct spelling after timeout

### Mode: Listen (`listen`)
- Play TTS of Malay word (Web Speech Synthesis)
- User must type what they heard
- Scoring: character match % → quality rating

### Mode: Cloze (`cloze`)
- Malay sentence with blank: "Dia makan _____ (nasi goreng)"
- User fills in the blank
- Match exact word or accept with diacritics stripped

### Mode: Speak (`speak`)
- App says English, user speaks Malay response
- Web Speech Recognition (ms-MY locale)
- Phonetic diff scoring (how close their speech matched reference)
- **Fallback:** If browser lacks speech API, show text input instead

### Mode: Roleplay (`roleplay` — Phase 1)
- Turn-based conversation with Cikgu Bot
- User responds to examiner prompt (text or speech)
- Bot evaluates response quality + gives feedback
- After 5 turns, show session summary + score

---

## Styling Architecture

### Tailwind CSS 4 + Custom Tokens

**File:** `src/index.css`

```css
@theme {
  --color-bg: #0a0a16;
  --color-surface: #12122a;
  --color-card: #181838;
  --color-card2: #1e1e40;
  --color-border: #2a2a50;
  --color-accent: #ff4d6d;
  --color-accent2: #7c3aed;
  --color-green: #00e676;
  --color-orange: #ff9100;
  --color-red: #ff5252;
  --color-blue: #448aff;
  --color-cyan: #00e5ff;
  --color-purple: #b388ff;
  --color-text: #e8e8f0;
  --color-dim: #7a7a9e;
}

/* Light mode overrides */
.light {
  --color-bg: #f5f5f8;
  --color-surface: #ffffff;
  --color-card: #f0f0f5;
  /* ... */
}
```

### Usage Patterns

- **Layout/spacing:** Tailwind utilities (flex, gap, p-4, etc.)
- **Colors:** CSS variables via inline styles
  ```jsx
  <div style={{ background: 'var(--color-card)', color: 'var(--color-text)' }}>
  ```
- **Responsive:** Tailwind breakpoints (sm, md, lg)
- **3D effects:** CSS perspective, preserve-3d, backface-hidden for card flip

---

## Data Flow

### User Reviews a Card (Flashcard Mode)

```
1. User sees Malay + English on card
2. User rates difficulty (1-5)
3. Study.jsx calls: store.reviewCard(malay, quality)
4. useStore sm2() algorithm updates:
   - card.ease (difficulty modifier)
   - card.interval (days until next review)
   - card.box (Leitner box 0-5)
   - card.nextReview (new due date)
5. Zustand saves to localStorage
6. (Phase 1: background sync to Supabase)
7. Study.jsx re-renders with updated queue
```

### User Searches Vocabulary (/ Key)

```
1. Anywhere on page, user presses /
2. Layout.jsx detects keydown, opens SearchModal
3. SearchModal filters across:
   - Dictionary (495 words)
   - User's custom cards
4. Results shown with color coding (green=dict, purple=custom)
5. User clicks word → adds to deck or listens (TTS)
```

---

## Web Speech API Integration

**File:** `src/lib/speech.js`

### Text-to-Speech (TTS)
```javascript
import { speak } from '../lib/speech'
speak('Selamat pagi')  // Plays audio of Malay phrase
```

### Speech-to-Text (STT)
```javascript
import { listen } from '../lib/speech'
const transcript = await listen('ms-MY')  // Waits for user to speak
```

### Fallbacks
- TTS unavailable → show text only (iOS Safari)
- STT unavailable → show text input instead
- Locale ms-MY not available → silently fall back to ms

---

## Translation Priority Chain

**File:** `src/lib/translate.js` + Import.jsx

```
1. Check src/data/dictionary.js
   ✓ Found? Return immediately
   
2. Check igcse-cache (localStorage)
   ✓ Found? Return from cache
   
3. Apply Malay stemming (strip prefixes/suffixes)
   - Remove meN-, ber-, di-, ter-, ke-, se-, pe-
   - Remove -kan, -an, -i suffixes
   - Restore dropped consonants (P, T, K, S)
   ✓ Root found in dictionary? Return + cache
   
4. Call Google Translate API (fallback)
   - Requires VITE_TRANSLATE_API_KEY
   ✓ Get translation + cache
   
5. Return "?" (unknown)
```

This ensures:
- Fast dictionary lookups
- Offline stemming for morphologically-rich Malay
- Graceful degradation if API unavailable

---

## Performance Optimization

### Bundle Size
- React 19 (slim): 42KB gzipped
- React Router: 8KB
- Zustand: 2KB
- Tailwind: ~30KB (purged for used classes)
- **Total:** ~90KB gzipped

### Lazy Loading (Future Phase 2)
```javascript
const Grammar = lazy(() => import('./pages/Grammar'))
const Writing = lazy(() => import('./pages/Writing'))
// Routes loaded only when navigated to
```

### Code Splitting
- Each page as separate bundle
- Shared libs loaded once
- Vite handles tree-shaking automatically

### localStorage Limits
- Current data: ~500KB (fits in typical 5-10MB quota)
- Growth: ~100 bytes per new card
- Scaling: Cloud sync (Phase 1) moves progress to server

---

## Error Handling & Resilience

### Study Session Crashes
- LocalStorage auto-persists every action
- If crash mid-session, on reload: resumedeck + queue intact
- No data loss

### Web Speech Failures
- Both TTS + STT have text fallbacks
- App fully functional without speech

### Network Failures (Phase 1)
- All study works offline from localStorage
- Sync queues updates + retries when online
- Conflict resolution: last-write-wins + timestamps

---

## Testing Strategy (Phase 1)

**Framework:** Vitest (configured next phase)

```javascript
// Example: SM-2 algorithm
test('sm2 algorithm updates interval correctly', () => {
  const card = { ease: 2.5, interval: 1 }
  const updated = calculateSM2(card, 5)  // Quality 5 (perfect)
  expect(updated.interval).toBe(6)       // ~1 * 2.5 = 2.5, round up
})

// Example: Roleplay evaluation
test('cikguBot evaluates response quality', () => {
  const eval = evaluateResponse('Selamat pagi, apa kabar?', 'greetings')
  expect(eval.quality).toBe('good')
  expect(eval.hasGreeting).toBe(true)
})
```

---

## Security Considerations

### Phase 0 (Current)
- All data in localStorage (unencrypted, user-accessible)
- No backend, no auth required
- No API keys exposed

### Phase 1 (Backend)
- Supabase Auth (JWT tokens)
- Row-level security (RLS) policies
- Never expose API keys in client (use edge functions)
- CORS configured for single origin

### Phase 2+ (Production Hardening)
- Implement refresh token rotation
- Add rate limiting on API
- Audit logging for user data access
- GDPR compliance (data export, right to delete)

---

## Deployment Checklist (Phase 0 → Phase 1)

**Before Going Live:**

- [ ] Set up Supabase project + run schema SQL
- [ ] Configure environment variables (.env.local)
- [ ] Enable CORS in Supabase API settings
- [ ] Set up GitHub Actions for CI/CD
- [ ] Deploy staging to Vercel
- [ ] QA all 7 routes on mobile + desktop
- [ ] Test offline + online sync flows
- [ ] Load test: 100 concurrent users
- [ ] Security audit (OWASP top 10)
- [ ] Data backup strategy
- [ ] Monitoring/alerts (Sentry, Vercel Analytics)

---

## Future Architecture Improvements

### Phase 2
- Lazy-load large data files (grammar.js, scenarios.js)
- Add Framer Motion for animations
- Implement service worker for true offline PWA
- Stream LLM responses for faster feedback

### Phase 3+
- Mobile app (React Native)
- Real-time collaboration (Supabase Realtime)
- Advanced analytics (Posthog, Mixpanel)
- CDN for static assets
- GraphQL for efficient API queries

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| localStorage-first | Instant load, works offline, no auth overhead Phase 0 |
| Single Zustand store | Easier to understand than Redux, auto-persists |
| Page-per-route | Self-contained logic, easier to modify without affecting others |
| CSS variables for colors | Single source of truth for theme, dark/light mode toggle |
| Malay stemming in JS | Works offline, no API call needed for morphology |
| Supabase (Phase 1) | Generous free tier, built-in auth + real-time, PostgreSQL power |
| Web Speech API | Native browser support, no extra dependencies |

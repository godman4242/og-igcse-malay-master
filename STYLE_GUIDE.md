# Style Guide — IGCSE Malay Master

**Purpose:** Ensure consistent, maintainable code across all contributors  
**Enforced by:** ESLint (auto-run on commit) + Manual PR review

---

## JavaScript/JSX Conventions

### File Naming

- **Pages:** PascalCase, match route name  
  `src/pages/Dashboard.jsx`, `src/pages/Grammar.jsx`

- **Components:** PascalCase  
  `src/components/SearchModal.jsx`, `src/components/Layout.jsx`

- **Utilities/Libs:** camelCase  
  `src/lib/sm2.js`, `src/lib/cikguBot.js`, `src/lib/export.js`

- **Data:** camelCase  
  `src/data/dictionary.js`, `src/data/grammar.js`

### Naming Conventions

**Variables/Functions:**
```javascript
// ✓ Good
const dueCards = cards.filter(c => c.nextReview <= today)
function calculateSM2(card, quality) { }

// ✗ Bad
const dc = cards.filter(...)  // Too abbreviated
const calculate_SM2 = () => { }  // Snake case in JS
```

**Boolean flags:**
```javascript
// ✓ Good
const isLoading = true
const hasError = false
const canReview = streak > 0

// ✗ Bad
const loading = true  // Ambiguous
const error = false   // Ambiguous
```

**Constants:**
```javascript
// ✓ Good
const VOCAB_CATEGORIES = { greetings: [...], courtesy: [...] }
const DEFAULT_EASE = 2.5

// ✗ Bad
const VOCAB = { greetings: [...] }  // Vague
const EASE = 2.5  // Not obviously constant
```

### React Component Structure

```jsx
import { useState } from 'react'
import { SomeIcon } from 'lucide-react'
import useStore from '../store/useStore'

// Constants at top (if page-specific)
const DEFAULT_TOPIC = 'General'

// Component function
export default function MyPage() {
  // 1. Hooks (useState, useEffect, custom hooks)
  const [loading, setLoading] = useState(false)
  const cards = useStore(s => s.cards)
  
  // 2. Derived state (const variables)
  const dueCards = cards.filter(c => c.nextReview <= today)
  
  // 3. Event handlers
  const handleReview = (card) => {
    // ...
  }
  
  // 4. Effects (if any)
  useEffect(() => {
    // ...
  }, [cards])
  
  // 5. JSX render
  return (
    <div>
      {/* ... */}
    </div>
  )
}
```

### Import Organization

```javascript
// 1. React/framework imports
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// 2. Third-party component/icon imports
import { AlertCircle, Check } from 'lucide-react'

// 3. Local store imports
import useStore from '../store/useStore'

// 4. Local util/lib imports
import { speak } from '../lib/speech'
import { exportToJSON } from '../lib/export'

// 5. Data imports
import DICTIONARY from '../data/dictionary'
```

### No Unused Variables

```javascript
// ✓ Good
const isReady = cards.length > 0
if (isReady) { /* ... */ }

// ✗ Bad
const isReady = cards.length > 0  // Declared but never used
const { data, error } = await fetch()  // error never used
```

**Exception:** Destructuring to skip items is OK:
```javascript
const { user, _unused, ...rest } = state  // Explicitly ignored
```

---

## Styling Conventions

### Tailwind CSS

**Always use Tailwind utilities for spacing/layout:**
```jsx
// ✓ Good
<div className="flex gap-3 p-4 rounded-xl">
  <button className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600">
    Action
  </button>
</div>

// ✗ Bad
<div style={{ display: 'flex', gap: '12px', padding: '16px' }}>
  <button style={{ padding: '8px 12px', backgroundColor: 'blue' }}>
    Action
  </button>
</div>
```

### CSS Custom Properties (Theme Colors)

**For theme-dependent colors, use CSS variables:**
```jsx
// ✓ Good
<div style={{ background: 'var(--color-card)', color: 'var(--color-text)' }}>
  Content
</div>

// ✗ Bad
<div style={{ background: '#181838', color: '#e8e8f0' }}>
  Content (won't change with light mode)
</div>
```

**Theme variables defined in `src/index.css`:**
```css
@theme {
  --color-bg: #0a0a16;
  --color-card: #181838;
  --color-accent: #ff4d6d;
  --color-text: #e8e8f0;
  /* ... */
}

.light {
  --color-bg: #f5f5f8;
  --color-card: #f0f0f5;
  --color-text: #1a1a2e;
  /* ... */
}
```

### Responsive Design

**Mobile-first approach:**
```jsx
// ✓ Good
<div className="text-sm md:text-base lg:text-lg">
  Responsive text
</div>

<button className="w-full md:w-auto px-4">
  Button scales on mobile
</button>

// ✗ Bad
<div className="text-lg md:text-sm">
  Desktop-first (confusing)
</div>
```

---

## Code Organization Best Practices

### Zustand Store Usage

**Always select only needed state:**
```javascript
// ✓ Good
const cards = useStore(s => s.cards)
const addCard = useStore(s => s.addCard)

// ✗ Bad
const store = useStore()  // Subscribes to entire store (re-renders on any change)
const { cards, addCard } = store
```

### SM-2 Algorithm Integrity

**Never modify `src/lib/sm2.js` without understanding full impact:**

```javascript
// ✓ Good (use sm2.js functions as-is)
const updated = sm2(card, userQuality)
store.updateCard(card.m, updated)

// ✗ Bad (custom SM-2 logic)
card.ease = card.ease * 0.9  // Breaks algorithm
```

### Dictionary Lookups

**Always use the priority chain:**
```javascript
// ✓ Good
import { translateWord } from '../lib/translate'
const meaning = await translateWord('buku')
// Tries: dictionary → cache → stemmer → Google Translate

// ✗ Bad
const meaning = DICTIONARY['buku']  // Skips cache/translation
const meaning = await googleTranslate('buku')  // Skips dictionary
```

### Web Speech API

**Always check for browser support:**
```javascript
// ✓ Good
import { hasSpeechRecognition, hasSpeechSynthesis } from '../lib/speech'

if (hasSpeechRecognition()) {
  const text = await listen('ms-MY')
} else {
  // Fallback to text input
}

// ✗ Bad
const text = await listen('ms-MY')  // Crashes on Safari
```

---

## Comments & Documentation

### When to Comment

**DO comment:**
- Complex algorithms (SM-2 logic, pronunciation scoring)
- Non-obvious regex patterns
- Workarounds or quirks in browser APIs
- Exported functions (JSDoc)

**DON'T comment:**
- Self-evident code
  ```javascript
  const dueCards = cards.filter(c => c.nextReview <= today)  // Clear enough
  ```
- Commented-out code (delete it or use git history)

### JSDoc for Exported Functions

```javascript
/**
 * Evaluate user speech response quality
 * @param {string} text - User's spoken/typed response
 * @param {string} expected - Reference text to match against
 * @returns {number} Quality score 0–100
 */
export function evaluateResponse(text, expected) {
  // ...
}
```

### Inline Comments for Quirks

```javascript
// Malay meN- prefix drops consonants: "men" + "tulis" → "menulis" (not "mentulis")
// We restore the dropped consonant if found in dictionary
if (p === 'men' && DICTIONARY['t' + root]) return 't' + root
```

---

## Error Handling

### Async/Await

**Always handle rejections:**
```javascript
// ✓ Good
try {
  const result = await translateWord(word)
  setTranslation(result)
} catch (error) {
  setTranslation('?')  // Fallback
  console.error('Translation failed:', error)
}

// ✗ Bad
const result = await translateWord(word)  // Uncaught rejection crashes app
```

### Optional Chaining & Nullish Coalescing

```javascript
// ✓ Good
const name = user?.displayName ?? 'Guest'
const topic = cards?.[0]?.t

// ✗ Bad
const name = user.displayName || 'Guest'  // Fails if user is null
```

---

## Performance Guidelines

### Avoid Unnecessary Re-renders

**Selector in useStore minimizes re-renders:**
```javascript
// ✓ Good (component only re-renders if `cards` changes)
const cards = useStore(s => s.cards)

// ✗ Bad (component re-renders on any store change)
const store = useStore()
const { cards } = store
```

### Memoize Expensive Computations

```javascript
// ✓ Good
const dueCards = useMemo(() => {
  return cards.filter(c => c.nextReview <= today)
}, [cards])

// ✗ Bad (recalculated every render)
const dueCards = cards.filter(c => c.nextReview <= today)
```

### Key Prop in Lists

```javascript
// ✓ Good (stable keys)
{cards.map(card => (
  <div key={card.m}>{card.m}</div>
))}

// ✗ Bad (index as key causes re-renders)
{cards.map((card, i) => (
  <div key={i}>{card.m}</div>
))}
```

---

## PR Review Checklist

**All PRs must satisfy:**

- [ ] ESLint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] All 7 routes render and are functional
- [ ] Dark and light themes both work
- [ ] localStorage persists across reload
- [ ] No console errors or warnings
- [ ] No unused variables or imports
- [ ] Feature preservation: no existing features regressed
- [ ] Mobile-friendly (tested on 375px width)
- [ ] SM-2 algorithm not modified (unless intentional)
- [ ] Malay locale (ms-MY) used for speech
- [ ] Theme colors use `var(--color-*)`, not hardcoded hex
- [ ] Commit message is clear and concise

**For new files/features:**
- [ ] Follows naming conventions
- [ ] Has JSDoc for exported functions
- [ ] Includes test cases (Phase 1+)
- [ ] Does not break offline functionality

---

## Common Gotchas

### 1. String Matching (Malay Diacritics)

Malay uses á, é, í, ó, ú. Never compare raw text without normalization:

```javascript
// ✗ Bad
if (word === 'keluarga') { }  // Fails for "keluarg
á"

// ✓ Good
const normalized = word.replace(/[àáâãäå]/g, 'a').toLowerCase()
if (normalized === 'keluarga') { }
```

### 2. SM-2 Algorithm Initialization

New cards must have ease=2.5, interval=1, box=0:

```javascript
// ✓ Good
const newCard = { m, e, ease: 2.5, interval: 1, box: 0, ... }

// ✗ Bad
const newCard = { m, e }  // Missing SM-2 fields → will break
```

### 3. localStorage Key Collisions

All keys prefixed with `igcse-`:

```javascript
// Keys in use:
// - igcse-cc (custom cards)
// - igcse-prog (progress)
// - igcse-cache (translations)
// - igcse-settings (user prefs, Phase 1)

// ✓ Good
localStorage.setItem('igcse-mydata', JSON.stringify(data))

// ✗ Bad
localStorage.setItem('mydata', JSON.stringify(data))  // Conflicts
```

### 4. Web Speech Locale

Always use `ms-MY` for Malaysian Malay (not `ms` or `id-ID`):

```javascript
// ✓ Good
const text = await speak('ms-MY', 'Selamat pagi')

// ✗ Bad
const text = await speak('ms', 'Selamat pagi')  // May default to Indonesian
```

---

## Git Conventions

### Commit Messages

```
Type: Short description (50 chars max)

Optional longer description (72 chars per line).
Reference issues: Fixes #123

Type can be: feat, fix, refactor, docs, test, perf
```

**Examples:**
```
feat: Add Cikgu Bot conversation engine
fix: Prevent service worker blank page issue
refactor: Extract speak() to separate utility
docs: Document Supabase schema and migrations
```

### Branch Naming

```
feature/cikgu-bot           # New feature
fix/service-worker-blank    # Bug fix
refactor/export-utils       # Code cleanup
docs/architecture           # Documentation
```

---

## Accessibility (a11y)

- Touch targets ≥ 44px (buttons, clickable elements)
- Color contrast ≥ 4.5:1 (text on background)
- Semantic HTML (`<button>` not `<div onClick>`)
- ARIA labels for icons-only buttons

```jsx
// ✓ Good
<button aria-label="Play audio" onClick={() => speak(word)}>
  <Volume2 size={20} />
</button>

// ✗ Bad
<div onClick={() => speak(word)}>
  <Volume2 size={20} />
</div>
```

---

## Summary

**Key Principles:**
1. **Consistency:** Follow patterns established in codebase
2. **Clarity:** Code reads like prose; names are descriptive
3. **Preservation:** No existing features deleted without discussion
4. **Testability:** Functions pure; dependencies injected
5. **Accessibility:** Works for all users, all devices, all browsers

When in doubt, check existing code for precedent.

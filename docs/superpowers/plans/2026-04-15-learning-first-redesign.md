# Learning-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add evidence-based learning science features (elaborative feedback with active correction, interleaved practice, metacognitive confidence, mistake clustering) to IGCSE Malay Master, then wire up 4-tier access control with anonymous telemetry via Supabase.

**Architecture:** Pure client-side learning features first (Phases 1-4, 6-7), Supabase infrastructure last (Phase 5). Static-first: zero server dependency for any learning feature. STORE_VERSION migrates from 5 to 6 (additive only).

**Tech Stack:** React 19, Zustand 5 (persisted), Tailwind CSS 4, Vite 8, ts-fsrs, Supabase 2 (Phase 5 only)

---

## File Structure

### New Files

| File                                     | Purpose                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/data/feedbackRules.js`              | "Why wrong" explanations per grammar rule, keyed by drill `rule` field                        |
| `src/lib/feedback.js`                    | `buildDrillFeedback()` and `buildVocabFeedback()` — select correct feedback for a given error |
| `src/components/ElaborativeFeedback.jsx` | Collapsible "Here's why" panel UI component                                                   |
| `src/lib/interleave.js`                  | `buildMixedSession()` — builds interleaved vocab+grammar+comprehension sessions               |
| `src/components/MixedSession.jsx`        | Unified session UI for interleaved practice                                                   |
| `src/components/ConfidencePrompt.jsx`    | "How sure are you?" pre-reveal prompt (3-point scale)                                         |
| `src/lib/confidence.js`                  | Confidence calibration tracking and scoring                                                   |
| `src/lib/patterns.js`                    | `clusterMistakes()` — groups errors by underlying grammar rule                                |
| `src/components/AuthUnlock.jsx`          | Magic link auth flow for Settings page                                                        |
| `src/components/AdminPanel.jsx`          | Owner invite system + admin telemetry dashboard                                               |
| `src/data/drillVariants.js`              | Harder/easier presentation variants per FSRS stability                                        |

### Modified Files

| File                                  | Changes                                                                    | Phase |
| ------------------------------------- | -------------------------------------------------------------------------- | ----- |
| `src/pages/Grammar.jsx`               | Integrate ElaborativeFeedback after wrong answers in all 4 check functions | 1     |
| `src/pages/Study.jsx`                 | Show vocab feedback on Again rating, integrate confidence prompts          | 1, 3  |
| `src/components/ActiveCorrection.jsx` | UI for re-typing wrong answers (Feedback Correction Effect)                | 1     |
| `src/store/useStore.js`               | v5→v6 migration: add `userRole`, `confidenceLog`, `interleaveSettings`     | 3, 5  |
| `src/pages/Dashboard.jsx`             | Add mixed session launcher, confidence calibration card                    | 2, 3  |
| `src/pages/MistakeJournal.jsx`        | Replace flat pattern detection with `clusterMistakes()`                    | 4     |
| `src/pages/Settings.jsx`              | Add "Unlock Enhanced Mode" section                                         | 5     |
| `src/config/supabase.js`              | Rewrite for 2-table schema (allowed_users + telemetry_events)              | 5     |
| `src/lib/telemetry.js`                | Add cloud telemetry for enhanced+ users (fire-and-forget)                  | 5     |

---

## Phase 1: Elaborative Feedback Engine

**Learning principle:** Elaborative feedback produces 2x retention vs binary correct/incorrect (Butler et al., 2013).

**Goal:** When a student gets a grammar drill or vocab card wrong, show them _why_ with the underlying rule, a mnemonic, and related examples.

---

### Task 1.1: Create Feedback Rules Data

**Files:**

- Create: `src/data/feedbackRules.js`

This file maps grammar drill `rule` strings (from `src/data/grammar.js`) to rich feedback objects.

**Enhancement:** Added `anchor` for Dual Coding and `prompt` for Generative Learning.

- [ ] **Step 1: Create `src/data/feedbackRules.js`**

```js
// src/data/feedbackRules.js
// Maps drill rule strings → elaborative feedback
// Key = the `rule` field from IMBUHAN_DRILLS, TENSE_DRILLS, etc.

export const GRAMMAR_FEEDBACK = {
  // === meN- prefix rules ===
  "men- + t → t drops": {
    explanation:
      'When meN- meets a root starting with T, the T is replaced by N. The nasal sound "absorbs" the original consonant.',
    mnemonic:
      "P, T, K, S DROP — these four consonants disappear when meN- is added.",
    anchor: "✂️",
    generativePrompt:
      'Think of "tulis" (to write). Why does it become "menulis" instead of "mentulis"?',
    examples: [
      { root: "tulis", result: "menulis", gloss: "to write" },
      { root: "tanya", result: "menanya", gloss: "to ask" },
      { root: "tanam", result: "menanam", gloss: "to plant" },
    ],
    relatedRule: "Same pattern applies with peN-: tulis → penulis (writer)",
  },
  "meny- + s → s drops": {
    explanation:
      'When meN- meets S, the S is replaced by NY. The nasal "ny" replaces the sibilant.',
    mnemonic: "P, T, K, S DROP — S becomes NY with meN-.",
    examples: [
      { root: "sapu", result: "menyapu", gloss: "to sweep" },
      { root: "siram", result: "menyiram", gloss: "to water" },
      { root: "sumbang", result: "menyumbang", gloss: "to contribute" },
    ],
    relatedRule: "Same with peN-: sapu → penyapu (broom)",
  },
  "mem- + p → p drops": {
    explanation:
      'When meN- meets P, the P is replaced by M. The bilabial nasal "m" absorbs the bilabial stop "p".',
    mnemonic: "P, T, K, S DROP — P becomes M with meN-.",
    examples: [
      { root: "potong", result: "memotong", gloss: "to cut" },
      { root: "pukul", result: "memukul", gloss: "to hit" },
      { root: "pilih", result: "memilih", gloss: "to choose" },
    ],
    relatedRule: 'Common error: writing "mempotong" — the P must drop!',
  },
  "meng- + k → k drops": {
    explanation:
      "When meN- meets K, the K is replaced by NG. The velar nasal replaces the velar stop.",
    mnemonic: "P, T, K, S DROP — K becomes NG with meN-.",
    examples: [
      { root: "karang", result: "mengarang", gloss: "to compose" },
      { root: "kira", result: "mengira", gloss: "to count" },
      { root: "kupas", result: "mengupas", gloss: "to peel" },
    ],
    relatedRule: 'Common error: writing "mengkarang" — the K must drop!',
  },
  "meng- + vowel": {
    explanation:
      'When meN- meets a vowel-initial root, use "meng-" and keep the root unchanged.',
    mnemonic: "Vowels are friendly — they don't change. Just add meng-.",
    examples: [
      { root: "ambil", result: "mengambil", gloss: "to take" },
      { root: "ubah", result: "mengubah", gloss: "to change" },
      { root: "ikut", result: "mengikut", gloss: "to follow" },
    ],
    relatedRule: "No consonant to drop — vowels keep their shape.",
  },
  "mem- + b": {
    explanation:
      'When meN- meets B, use "mem-" and keep the B. B is a bilabial like M, so it stays.',
    mnemonic:
      'Only P, T, K, S drop. B stays because it\'s not in the "drop club."',
    examples: [
      { root: "baca", result: "membaca", gloss: "to read" },
      { root: "beli", result: "membeli", gloss: "to buy" },
      { root: "bantu", result: "membantu", gloss: "to help" },
    ],
    relatedRule: "Compare: B stays (membaca) but P drops (memotong).",
  },
  "men- + c": {
    explanation: 'When meN- meets C, use "men-" and keep the C.',
    mnemonic: "C is not in P, T, K, S — so it stays.",
    examples: [
      { root: "cari", result: "mencari", gloss: "to search" },
      { root: "cuci", result: "mencuci", gloss: "to wash" },
      { root: "cuba", result: "mencuba", gloss: "to try" },
    ],
    relatedRule: "men- is the form for dental consonants: c, d, j.",
  },
  "men- + d": {
    explanation: 'When meN- meets D, use "men-" and keep the D.',
    mnemonic: "D is not in P, T, K, S — it stays.",
    examples: [
      { root: "dengar", result: "mendengar", gloss: "to hear" },
      { root: "dapat", result: "mendapat", gloss: "to obtain" },
      { root: "datang", result: "mendatang", gloss: "to approach" },
    ],
    relatedRule: 'Same "men-" form as C and J.',
  },
  "men- + j": {
    explanation: 'When meN- meets J, use "men-" and keep the J.',
    mnemonic: "J is not in P, T, K, S — it stays.",
    examples: [
      { root: "jual", result: "menjual", gloss: "to sell" },
      { root: "jaga", result: "menjaga", gloss: "to guard" },
      { root: "jahit", result: "menjahit", gloss: "to sew" },
    ],
    relatedRule: 'Same "men-" form as C and D.',
  },
  "meng- + g": {
    explanation: 'When meN- meets G, use "meng-" and keep the G.',
    mnemonic: "G is not in P, T, K, S — it stays. meng- for velar consonants.",
    examples: [
      { root: "goreng", result: "menggoreng", gloss: "to fry" },
      { root: "gali", result: "menggali", gloss: "to dig" },
      { root: "gunting", result: "menggunting", gloss: "to cut (scissors)" },
    ],
    relatedRule: "Compare: G stays (menggoreng) but K drops (mengarang).",
  },
  "meng- + h": {
    explanation: 'When meN- meets H, use "meng-" and keep the H.',
    mnemonic: "H is not in P, T, K, S — it stays.",
    examples: [
      { root: "hantar", result: "menghantar", gloss: "to send" },
      { root: "hitung", result: "menghitung", gloss: "to count" },
      { root: "hapus", result: "menghapus", gloss: "to erase" },
    ],
    relatedRule: "meng- is used for g, h, kh, and vowels.",
  },
  "menge- + 1-syllable": {
    explanation:
      'Single-syllable roots use the special "menge-" form. This is an exception to normal meN- rules.',
    mnemonic: 'Short word? Add menge-. The "e" cushions the single syllable.',
    examples: [
      { root: "cat", result: "mengecat", gloss: "to paint" },
      { root: "lap", result: "mengelap", gloss: "to wipe" },
      { root: "kejar", result: "mengejar", gloss: "to chase" },
    ],
    relatedRule:
      "This only applies to 1-syllable roots, regardless of starting consonant.",
  },
  "me- + l": {
    explanation:
      'When meN- meets L, use "me-" (no nasal). L is a liquid consonant.',
    mnemonic:
      'L, M, N, NY, NG, R, W, Y = just use "me-" (no extra nasal needed).',
    examples: [
      { root: "lukis", result: "melukis", gloss: "to draw" },
      { root: "lipat", result: "melipat", gloss: "to fold" },
      { root: "lawat", result: "melawat", gloss: "to visit" },
    ],
    relatedRule:
      'These consonants are already "soft" — no nasal transformation needed.',
  },
  "me- + r": {
    explanation:
      'When meN- meets R, use "me-" (no nasal). R is a liquid consonant.',
    mnemonic: 'L, M, N, NY, NG, R, W, Y = just "me-".',
    examples: [
      { root: "renang", result: "merenang", gloss: "to swim" },
      { root: "rasa", result: "merasa", gloss: "to feel" },
      { root: "rebus", result: "merebus", gloss: "to boil" },
    ],
    relatedRule: "Same pattern as L — both are liquid consonants.",
  },
  "me- + ny (already nasal)": {
    explanation:
      'NY is already a nasal sound, so just use "me-" without adding another nasal.',
    mnemonic: 'Already nasal? Don\'t double up — just "me-".',
    examples: [{ root: "nyanyi", result: "menyanyi", gloss: "to sing" }],
    relatedRule: 'Similarly, roots starting with M, N, NG just get "me-".',
  },
  "me- + w": {
    explanation: 'When meN- meets W, use "me-" (no nasal).',
    mnemonic: 'W is a semi-vowel — just use "me-".',
    examples: [{ root: "warna", result: "mewarnai", gloss: "to color" }],
    relatedRule: 'W and Y are semi-vowels that take simple "me-".',
  },
  "mem- + f": {
    explanation:
      'When meN- meets F, use "mem-" and keep the F. F is a labiodental like P but doesn\'t drop.',
    mnemonic: "F is not in P, T, K, S — only P drops, not F.",
    examples: [
      { root: "fitnah", result: "memfitnah", gloss: "to slander" },
      { root: "faham", result: "memahami", gloss: "to understand" },
    ],
    relatedRule: "mem- groups: B (stays), P (drops), F (stays).",
  },

  // === ber- prefix rules ===
  "ber- + main": {
    explanation: 'Standard ber- prefix. Just attach "ber-" to the root.',
    mnemonic:
      "ber- is simple — it rarely changes. Watch for the 2 exceptions: belajar and bekerja.",
    examples: [
      { root: "main", result: "bermain", gloss: "to play" },
      { root: "jalan", result: "berjalan", gloss: "to walk" },
      { root: "cakap", result: "bercakap", gloss: "to speak" },
    ],
    relatedRule: "ber- means: to do (action), to have, or to be in a state.",
  },
  "bel- + ajar (irregular)": {
    explanation:
      'This is an irregular form. "ber- + ajar" becomes "belajar", not "berajar".',
    mnemonic:
      "belajar is the ONE exception where ber- loses its R before a vowel-initial root.",
    examples: [{ root: "ajar", result: "belajar", gloss: "to study/learn" }],
    relatedRule:
      "Only ajar has this irregular form. All other vowel-initial roots keep ber-.",
  },
  "be- + kerja (r-initial syllable)": {
    explanation:
      'When the root has an R in the first syllable (ker-), ber- drops its R to avoid "ber-ker".',
    mnemonic:
      "Two R sounds too close together? Drop one: bekerja, not berkerja.",
    examples: [{ root: "kerja", result: "bekerja", gloss: "to work" }],
    relatedRule: "Same logic: ber- + kerjasama → bekerjasama.",
  },
  "ber- + jalan": {
    explanation: 'Standard ber- prefix. Just attach "ber-" to the root.',
    mnemonic: "ber- + consonant = just attach. No changes needed.",
    examples: [
      { root: "jalan", result: "berjalan", gloss: "to walk" },
      { root: "fikir", result: "berfikir", gloss: "to think" },
      { root: "sedia", result: "bersedia", gloss: "to prepare" },
    ],
    relatedRule: "ber- is the easiest prefix — almost never changes.",
  },
  "ber- + cakap": {
    explanation: "Standard ber- prefix application.",
    mnemonic: "ber- + consonant = no change.",
    examples: [
      { root: "cakap", result: "bercakap", gloss: "to speak" },
      { root: "sama", result: "bersama", gloss: "to be together" },
    ],
    relatedRule:
      "ber- is consistent — only 2 irregular forms (belajar, bekerja).",
  },
  "ber- + sedia": {
    explanation: "Standard ber- prefix application.",
    mnemonic: "ber- + consonant = no change.",
    examples: [{ root: "sedia", result: "bersedia", gloss: "to be ready" }],
    relatedRule: "ber- indicates a state: bersedia = to be ready.",
  },
  "ber- + sama": {
    explanation: "Standard ber- prefix application.",
    mnemonic: "ber- + consonant = no change.",
    examples: [{ root: "sama", result: "bersama", gloss: "together" }],
    relatedRule: "ber- can indicate togetherness: bersama = together.",
  },
  "ber- + fikir": {
    explanation: "Standard ber- prefix application.",
    mnemonic: "ber- + consonant = no change.",
    examples: [{ root: "fikir", result: "berfikir", gloss: "to think" }],
    relatedRule: "ber- indicates performing an action.",
  },
  "ber- + asa → berasa": {
    explanation:
      "Standard ber- prefix with vowel-initial root. Unlike belajar, this keeps the R.",
    mnemonic: 'Only "ajar" is irregular. Other vowel roots keep ber-.',
    examples: [{ root: "asa", result: "berasa", gloss: "to feel" }],
    relatedRule: "ber- + vowel = ber- stays (except belajar).",
  },

  // === peN- prefix rules ===
  "pen- + t → t drops (doer noun)": {
    explanation:
      "peN- follows the SAME rules as meN-. T drops with pen-, becoming a doer/agent noun.",
    mnemonic: "meN- and peN- are twins — same P, T, K, S drop rules.",
    examples: [
      { root: "tulis", result: "penulis", gloss: "writer" },
      { root: "tari", result: "penari", gloss: "dancer" },
    ],
    relatedRule:
      "meN- = verb (menulis = to write), peN- = noun (penulis = writer).",
  },
  "pen- + d (doer noun)": {
    explanation: "peN- + D = pen- + D (D stays, same as meN- rules).",
    mnemonic: "D is not in P, T, K, S — it stays with peN- too.",
    examples: [{ root: "dengar", result: "pendengar", gloss: "listener" }],
    relatedRule: "meN- = mendengar (to listen), peN- = pendengar (listener).",
  },
  "pe- + kerja (doer noun)": {
    explanation:
      "pe- is used for K-initial roots in peN- (K doesn't drop in this case for the doer meaning).",
    mnemonic: "pekerja (worker) uses simple pe-, not peng-.",
    examples: [{ root: "kerja", result: "pekerja", gloss: "worker" }],
    relatedRule:
      "Compare: some K-initial roots use peng- (pengarang), some use pe- (pekerja).",
  },
  "pem- + b (doer noun)": {
    explanation: "peN- + B = pem- + B (B stays, same as meN- rules).",
    mnemonic: "B stays with both meN- and peN-.",
    examples: [{ root: "baca", result: "pembaca", gloss: "reader" }],
    relatedRule: "meN- = membaca (to read), peN- = pembaca (reader).",
  },
  "peny- + s → s drops": {
    explanation: "peN- + S = peny- (S drops, same as meN- meny- rule).",
    mnemonic: "P, T, K, S drop with peN- too — S becomes peny-.",
    examples: [{ root: "sapu", result: "penyapu", gloss: "broom/sweeper" }],
    relatedRule: "meN- = menyapu (to sweep), peN- = penyapu (broom).",
  },

  // === Passive di- rules ===
  "Convert meN- to di-": {
    explanation:
      'To make a passive sentence: move the object to the front, replace meN- verb with di-verb, add "oleh" + subject.',
    mnemonic:
      "Active: Subject + meN-verb + Object → Passive: Object + di-verb + oleh + Subject",
    examples: [
      {
        root: "Ali membaca buku.",
        result: "Buku dibaca oleh Ali.",
        gloss: "The book is read by Ali.",
      },
      {
        root: "Ibu memasak nasi.",
        result: "Nasi dimasak oleh ibu.",
        gloss: "Rice is cooked by mother.",
      },
    ],
    relatedRule:
      "Remember: consonants that dropped with meN- come back with di-!",
  },
  "Object becomes subject": {
    explanation:
      'In passive voice, the object moves to subject position. The agent follows "oleh".',
    mnemonic: "Flip the sentence: Object first, then di-verb oleh Subject.",
    examples: [
      {
        root: "Ali membaca buku itu.",
        result: "Buku itu dibaca oleh Ali.",
        gloss: "That book is read by Ali.",
      },
    ],
    relatedRule: 'The "itu/ini" stays with the noun it describes.',
  },
  "T drops in meN- but returns in di-": {
    explanation:
      "When converting active (meN-) to passive (di-), the dropped consonant returns: menulis → ditulis.",
    mnemonic:
      "meN- drops P, T, K, S. But di- brings them back: menulis → ditulis (T returns).",
    examples: [
      {
        root: "Kakak menulis surat.",
        result: "Surat ditulis oleh kakak.",
        gloss: "The letter is written by elder sibling.",
      },
      {
        root: "Polis menangkap pencuri.",
        result: "Pencuri ditangkap oleh polis.",
        gloss: "The thief is caught by police.",
      },
    ],
    relatedRule:
      "This is a common exam trap — watch for consonants returning in passive!",
  },
  "S drops in meN- but returns in di-": {
    explanation: "Same as T returning: menyediakan → disediakan (S returns).",
    mnemonic: "di- always uses the original root: menyediakan → disediakan.",
    examples: [
      {
        root: "Emak menyediakan sarapan.",
        result: "Sarapan disediakan oleh emak.",
        gloss: "Breakfast is prepared by mother.",
      },
    ],
    relatedRule:
      "All four (P, T, K, S) return in passive: memotong → dipotong, etc.",
  },

  // === Tense marker rules ===
  sudah: {
    explanation:
      '"Sudah" marks completed action (past tense). It means "already" or "has/have done".',
    mnemonic: "sudah = already done ✓",
    examples: [
      {
        root: "Saya sudah makan.",
        result: "I have eaten.",
        gloss: "completed",
      },
      {
        root: "Mereka sudah pulang.",
        result: "They have gone home.",
        gloss: "completed",
      },
    ],
    relatedRule: "Time clues: semalam, tadi, minggu lepas → likely sudah.",
  },
  sedang: {
    explanation:
      '"Sedang" marks ongoing action (present continuous). It means "currently doing".',
    mnemonic: "sedang = doing it NOW ⏳",
    examples: [
      {
        root: "Ibu sedang memasak.",
        result: "Mother is cooking.",
        gloss: "ongoing",
      },
      {
        root: "Mereka sedang bermain.",
        result: "They are playing.",
        gloss: "ongoing",
      },
    ],
    relatedRule: "Time clues: sekarang, pada masa ini → likely sedang.",
  },
  akan: {
    explanation: '"Akan" marks future action. It means "will" or "going to".',
    mnemonic: "akan = will do it LATER →",
    examples: [
      { root: "Saya akan pergi.", result: "I will go.", gloss: "future" },
      {
        root: "Dia akan datang esok.",
        result: "He will come tomorrow.",
        gloss: "future",
      },
    ],
    relatedRule: "Time clues: esok, minggu depan, tahun depan → likely akan.",
  },
  belum: {
    explanation:
      '"Belum" means "not yet" — the action hasn\'t happened but is expected to.',
    mnemonic: "belum = NOT YET (but will) ⏸",
    examples: [
      {
        root: "Dia belum sampai.",
        result: "He has not arrived yet.",
        gloss: "not yet",
      },
      {
        root: "Saya belum makan.",
        result: "I have not eaten yet.",
        gloss: "not yet",
      },
    ],
    relatedRule:
      "Key difference: belum (not yet, expected) vs tidak (not, definite).",
  },
};

// Vocabulary feedback — shown when student rates Again on a card
export const VOCAB_TIPS = {
  // Generic tips by card state
  new: "New word! Try saying it aloud 3 times, then make a sentence with it.",
  learning:
    "This word is still forming in your memory. Picture a vivid scene using this word.",
  relearning:
    "You knew this before — reconnect! What context did you first learn it in?",
  review:
    "Forgetting a review word is normal. The re-learning will make it stronger (desirable difficulty).",
};

export default GRAMMAR_FEEDBACK;
```

- [ ] **Step 2: Verify file created**

Run: `ls -la src/data/feedbackRules.js`
Expected: File exists, ~400 lines

- [ ] **Step 3: Commit**

```bash
git add src/data/feedbackRules.js
git commit -m "feat(feedback): add elaborative feedback rules data"
```

---

### Task 1.2: Create Feedback Logic Module

**Files:**

- Create: `src/lib/feedback.js`

- [ ] **Step 1: Create `src/lib/feedback.js`**

```js
// src/lib/feedback.js
// Selects the correct feedback for a given drill or vocab error

import GRAMMAR_FEEDBACK, { VOCAB_TIPS } from "../data/feedbackRules";

/**
 * Build elaborative feedback for a grammar drill result.
 * @param {Object} drill - The drill object from grammar.js (has .rule, .id, .type)
 * @param {boolean} correct - Whether the student got it right
 * @returns {Object|null} { explanation, mnemonic, examples, relatedRule } or null
 */
export function buildDrillFeedback(drill, correct) {
  // Only show elaborative feedback on wrong answers
  if (correct) return null;

  const feedback = GRAMMAR_FEEDBACK[drill.rule];
  if (!feedback) {
    // Fallback for unmapped rules
    return {
      explanation: `Rule: ${drill.rule}`,
      mnemonic: null,
      examples: [],
      relatedRule: null,
    };
  }

  return feedback;
}

/**
 * Build feedback for a tense drill.
 * @param {Object} drill - Tense drill with .answer (sudah/sedang/akan/belum) and .tense
 * @param {string} chosen - The student's answer
 * @returns {Object|null} Feedback or null if correct
 */
export function buildTenseFeedback(drill, chosen) {
  if (chosen === drill.answer) return null;

  const correctFeedback = GRAMMAR_FEEDBACK[drill.answer];
  const chosenFeedback = GRAMMAR_FEEDBACK[chosen];

  return {
    explanation:
      correctFeedback?.explanation ||
      `The correct tense marker is "${drill.answer}".`,
    mnemonic: correctFeedback?.mnemonic || null,
    examples: correctFeedback?.examples || [],
    relatedRule: chosenFeedback
      ? `You chose "${chosen}" (${chosenFeedback.mnemonic}). The sentence needs "${drill.answer}" because: ${drill.tense}.`
      : null,
  };
}

/**
 * Build vocab feedback tip when student presses Again.
 * @param {Object} card - Card from store with FSRS fields
 * @returns {string} A learning tip
 */
export function buildVocabFeedback(card) {
  const state = card.state ?? 0;
  if (state === 0) return VOCAB_TIPS.new;
  if (state === 1) return VOCAB_TIPS.learning;
  if (state === 3) return VOCAB_TIPS.relearning;
  return VOCAB_TIPS.review;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/feedback.js
git commit -m "feat(feedback): add feedback selection logic"
```

---

### Task 1.3: Create ElaborativeFeedback Component

**Files:**

- Create: `src/components/ElaborativeFeedback.jsx`

- [ ] **Step 1: Create `src/components/ElaborativeFeedback.jsx`**

```jsx
// src/components/ElaborativeFeedback.jsx
// "Here's why" panel shown after wrong grammar drill answers

import { useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb, BookOpen } from "lucide-react";

/**
 * @param {Object} props
 * @param {Object} props.feedback - From buildDrillFeedback(): { explanation, mnemonic, examples, relatedRule }
 * @param {boolean} [props.defaultOpen=true] - Whether panel starts open
 */
export default function ElaborativeFeedback({ feedback, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  if (!feedback || !feedback.explanation) return null;

  return (
    <div
      className="mt-2 rounded-xl overflow-hidden"
      style={{
        background: "rgba(68,138,255,0.06)",
        border: "1px solid rgba(68,138,255,0.2)",
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold"
        style={{ color: "var(--color-blue)" }}
      >
        <span className="flex items-center gap-1.5">
          <Lightbulb size={13} />
          Here's why
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Content — collapsible */}
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {/* Explanation */}
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--color-text)" }}
          >
            {feedback.explanation}
          </p>

          {/* Mnemonic */}
          {feedback.mnemonic && (
            <div
              className="flex items-start gap-1.5 text-xs p-2 rounded-lg"
              style={{
                background: "rgba(255,145,0,0.08)",
                color: "var(--color-orange)",
              }}
            >
              <span className="font-bold shrink-0">Remember:</span>
              <span>{feedback.mnemonic}</span>
            </div>
          )}

          {/* Examples */}
          {feedback.examples && feedback.examples.length > 0 && (
            <div>
              <p
                className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1"
                style={{ color: "var(--color-dim)" }}
              >
                <BookOpen size={10} /> Related examples
              </p>
              <div className="space-y-1">
                {feedback.examples.map((ex, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span style={{ color: "var(--color-dim)" }}>{ex.root}</span>
                    <span style={{ color: "var(--color-dim)" }}>→</span>
                    <span
                      className="font-bold"
                      style={{ color: "var(--color-cyan)" }}
                    >
                      {ex.result}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--color-dim)" }}
                    >
                      ({ex.gloss})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related rule */}
          {feedback.relatedRule && (
            <p
              className="text-[10px] italic"
              style={{ color: "var(--color-dim)" }}
            >
              {feedback.relatedRule}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ElaborativeFeedback.jsx
git commit -m "feat(feedback): add ElaborativeFeedback UI component"
```

---

### Task 1.4: Integrate Feedback into Grammar.jsx

**Files:**

- Modify: `src/pages/Grammar.jsx`

This task modifies all 4 check functions and their feedback display blocks to use `buildDrillFeedback` and `ElaborativeFeedback`.

- [ ] **Step 1: Add imports to Grammar.jsx**

At the top of `src/pages/Grammar.jsx`, after the existing imports, add:

```js
import { buildDrillFeedback, buildTenseFeedback } from "../lib/feedback";
import ElaborativeFeedback from "../components/ElaborativeFeedback";
```

- [ ] **Step 2: Add feedback state variables**

After the existing state variables (around line 87), add:

```js
const [drillFeedback, setDrillFeedback] = useState(null);
const [tenseFeedback, setTenseFeedback] = useState(null);
const [errorFeedback, setErrorFeedback] = useState(null);
const [transFeedback, setTransFeedback] = useState(null);
```

- [ ] **Step 3: Modify `checkDrill` function**

Replace the `checkDrill` function (lines 105-116) with:

```js
const checkDrill = () => {
  if (fb || !input.trim()) return;
  const correct = input.trim().toLowerCase() === drill.answer.toLowerCase();
  setFb({ correct, answer: drill.answer, rule: drill.rule });
  setDrillFeedback(buildDrillFeedback(drill, correct));
  updateGrammarStats("imbuhan", correct);
  reviewGrammarDrill(drill.id, correct);
  setTimeout(
    () => {
      setFb(null);
      setDrillFeedback(null);
      setInput("");
      setDrillIdx((i) => i + 1);
    },
    correct ? 2200 : 5000,
  );
};
```

Key changes: calls `buildDrillFeedback`, clears `drillFeedback` on advance, extends timeout to 5s on wrong answer so student can read feedback.

- [ ] **Step 4: Modify `checkTense` function**

Replace the `checkTense` function (lines 118-127) with:

```js
const checkTense = (chosen) => {
  if (tenseFb) return;
  const correct = chosen === tense.answer;
  setTenseFb({ correct, chosen, answer: tense.answer });
  setTenseFeedback(buildTenseFeedback(tense, chosen));
  updateGrammarStats("tense", correct);
  reviewGrammarDrill(tense.id, correct);
  setTimeout(
    () => {
      setTenseFb(null);
      setTenseFeedback(null);
      setTenseIdx((i) => i + 1);
    },
    correct ? 2200 : 5000,
  );
};
```

- [ ] **Step 5: Modify `checkError` function**

Replace the `checkError` function (lines 129-140) with:

```js
const checkError = (chosen) => {
  if (errorFb) return;
  const correct = chosen === error.answer;
  setErrorFb({
    correct,
    chosen,
    answer: error.answer,
    explanation: error.explanation,
    correction: error.correction,
  });
  if (!correct) {
    setErrorFeedback({
      explanation: error.explanation,
      mnemonic: error.correction ? `Correct form: ${error.correction}` : null,
      examples: [],
      relatedRule: null,
    });
  }
  updateGrammarStats("error", correct);
  reviewGrammarDrill(error.id, correct);
  setTimeout(
    () => {
      setErrorFb(null);
      setErrorFeedback(null);
      setErrorIdx((i) => i + 1);
    },
    correct ? 3000 : 5000,
  );
};
```

- [ ] **Step 6: Modify `checkTransform` function**

Replace the `checkTransform` function (lines 142-155) with:

```js
const checkTransform = () => {
  if (transFb || !transInput.trim()) return;
  const userAns = transInput
    .trim()
    .toLowerCase()
    .replace(/\.\s*$/, "");
  const correctAns = transform.answer.toLowerCase().replace(/\.\s*$/, "");
  const correct = userAns === correctAns;
  setTransFb({ correct, answer: transform.answer });
  if (!correct) {
    // Look up the passive conversion feedback
    const passiveFeedback = GRAMMAR_FEEDBACK["Convert meN- to di-"];
    setTransFeedback(
      passiveFeedback || {
        explanation: `Expected: ${transform.answer}`,
        mnemonic: transform.hint,
        examples: [],
        relatedRule: null,
      },
    );
  }
  updateGrammarStats("transform", correct);
  reviewGrammarDrill(transform.id, correct);
  setTimeout(
    () => {
      setTransFb(null);
      setTransFeedback(null);
      setTransInput("");
      setTransIdx((i) => i + 1);
    },
    correct ? 2500 : 5000,
  );
};
```

Note: This requires importing `GRAMMAR_FEEDBACK` — add to the existing feedback import:

```js
import GRAMMAR_FEEDBACK from "../data/feedbackRules";
```

- [ ] **Step 7: Add ElaborativeFeedback panels to each drill tab's feedback block**

**Imbuhan tab** — after the existing `{fb && (...)}` block (around line 280), add inside the same conditional:

```jsx
{
  fb && !fb.correct && drillFeedback && (
    <ElaborativeFeedback feedback={drillFeedback} />
  );
}
```

**Tense tab** — after the existing `{tenseFb && (...)}` block (around line 328), replace with:

```jsx
{
  tenseFb && (
    <div>
      <p
        className="text-center text-xs mt-3 font-bold"
        style={{
          color: tenseFb.correct ? "var(--color-green)" : "var(--color-red)",
        }}
      >
        {tenseFb.correct ? "Betul!" : `Jawapan: ${tense.answer}`} — Tense:{" "}
        {tense.tense}
      </p>
      {!tenseFb.correct && tenseFeedback && (
        <ElaborativeFeedback feedback={tenseFeedback} />
      )}
    </div>
  );
}
```

**Error tab** — after the existing `{errorFb && (...)}` block, add inside:

```jsx
{
  errorFb && !errorFb.correct && errorFeedback && (
    <ElaborativeFeedback feedback={errorFeedback} />
  );
}
```

**Transform tab** — after the existing `{transFb && (...)}` block, add inside:

```jsx
{
  transFb && !transFb.correct && transFeedback && (
    <ElaborativeFeedback feedback={transFeedback} />
  );
}
```

- [ ] **Step 8: Build and verify**

Run: `npm run build`
Expected: Zero errors

- [ ] **Step 9: Test manually**

Run: `npm run dev`
Test: Go to Grammar → Imbuhan → get a drill wrong → "Here's why" panel should appear with explanation, mnemonic, and examples.

- [ ] **Step 10: Commit**

```bash
git add src/pages/Grammar.jsx
git commit -m "feat(feedback): integrate elaborative feedback into grammar drills"
```

---

### Task 1.5: Integrate Vocab Feedback into Study.jsx

**Files:**

- Modify: `src/pages/Study.jsx`

- [ ] **Step 1: Add imports to Study.jsx**

After existing imports, add:

```js
import { buildVocabFeedback } from "../lib/feedback";
```

- [ ] **Step 2: Add vocabTip state**

After the `speakResult` state declaration (around line 78), add:

```js
const [vocabTip, setVocabTip] = useState(null);
```

- [ ] **Step 3: Clear vocabTip in nextCard**

In the `nextCard` function, add `setVocabTip(null)` alongside the other state resets:

```js
const nextCard = () => {
  setFlipped(false);
  setQuizFb(null);
  setTypeFb(null);
  setListenFb(null);
  setClozeFb(null);
  setSpeakResult(null);
  setVocabTip(null);
  setTypeInput("");
  setListenInput("");
  setClozeInput("");
  setCardIdx((i) => i + 1);
};
```

- [ ] **Step 4: Set vocabTip on Again rating**

In the `rate` function, after updating session stats, add vocab tip for Again:

```js
const rate = (rating) => {
  if (!card) return;
  if (rating === Rating.Again) {
    setVocabTip(buildVocabFeedback(card));
  }
  reviewCardAction(card.m, rating);
  // ... rest of function unchanged
};
```

- [ ] **Step 5: Show vocab tip in flashcard mode**

After the FSRS rating buttons block (after the closing `</div>` of the rating buttons around line 345), add:

```jsx
{
  vocabTip && (
    <div
      className="mt-2 px-3 py-2 rounded-xl text-xs"
      style={{
        background: "rgba(68,138,255,0.06)",
        border: "1px solid rgba(68,138,255,0.2)",
        color: "var(--color-blue)",
      }}
    >
      <span className="font-bold">Tip: </span>
      {vocabTip}
    </div>
  );
}
```

- [ ] **Step 6: Build and verify**

Run: `npm run build`
Expected: Zero errors

- [ ] **Step 7: Commit**

```bash
git add src/pages/Study.jsx
git commit -m "feat(feedback): add vocab learning tips on Again rating"
```

---

## Phase 2: Interleaved Practice Sessions

**Learning principle:** Interleaving improves long-term retention by 43% vs blocked practice (Kornell & Bjork, 2008).

**Goal:** Mix vocab, grammar, and comprehension items in single sessions via a "Start Review" button on Dashboard.

---

### Task 2.1: Create Interleave Module

**Files:**

- Create: `src/lib/interleave.js`

- [ ] **Step 1: Create `src/lib/interleave.js`**

```js
// src/lib/interleave.js
// Builds interleaved practice sessions mixing vocab + grammar + comprehension

import { getDueCards, sortByPriority } from "./fsrs";
import {
  IMBUHAN_DRILLS,
  TENSE_DRILLS,
  ERROR_DRILLS,
  TRANSFORM_DRILLS,
} from "../data/grammar";

/**
 * Build a mixed session with items from multiple categories.
 * Items are interleaved: V, G, V, G, V, C, V, G, ... (never 3 of same type in a row)
 *
 * @param {Object} params
 * @param {Array} params.cards - All vocab cards from store
 * @param {Object} params.grammarCards - Grammar SRS state from store
 * @param {number} [params.targetSize=15] - Desired session length
 * @param {Object} [params.ratios] - { vocab, grammar, comprehension } ratios summing to 1
 * @returns {Array<{ type: 'vocab'|'grammar'|'comprehension', item: Object }>}
 */
export function buildMixedSession({
  cards,
  grammarCards,
  targetSize = 15,
  ratios = { vocab: 0.5, grammar: 0.3, comprehension: 0.2 },
}) {
  // 1. Gather due items
  const dueVocab = sortByPriority(getDueCards(cards));
  const allDrills = [
    ...IMBUHAN_DRILLS,
    ...TENSE_DRILLS,
    ...ERROR_DRILLS,
    ...TRANSFORM_DRILLS,
  ];
  const dueGrammar = allDrills.filter((d) => {
    const card = grammarCards[d.id];
    return !card || new Date(card.due) <= new Date();
  });

  // 2. Calculate per-type targets
  const vocabTarget = Math.round(targetSize * ratios.vocab);
  const grammarTarget = Math.round(targetSize * ratios.grammar);
  const compTarget = Math.max(1, targetSize - vocabTarget - grammarTarget);

  // 3. Select items
  const vocabItems = dueVocab
    .slice(0, vocabTarget)
    .map((c) => ({ type: "vocab", item: c }));
  const grammarItems = shuffleArray(dueGrammar)
    .slice(0, grammarTarget)
    .map((d) => ({ type: "grammar", item: d }));

  // Comprehension: pick vocab cards in sentence context (cloze-style)
  const compCandidates = dueVocab.filter((c) => c.ex && c.ex.length > 10);
  const compItems = compCandidates
    .slice(0, compTarget)
    .map((c) => ({ type: "comprehension", item: c }));

  // 4. Interleave — avoid 3 of same type in a row
  const all = [...vocabItems, ...grammarItems, ...compItems];
  return interleaveItems(all);
}

/**
 * Interleave items so no more than 2 of the same type appear consecutively.
 */
function interleaveItems(items) {
  if (items.length <= 2) return items;

  const byType = {};
  items.forEach((item) => {
    if (!byType[item.type]) byType[item.type] = [];
    byType[item.type].push(item);
  });

  const result = [];
  const types = Object.keys(byType);

  while (types.some((t) => byType[t].length > 0)) {
    for (const t of types) {
      if (byType[t].length > 0) {
        result.push(byType[t].shift());
      }
    }
  }

  return result;
}

/**
 * Get a summary of a completed mixed session.
 * @param {Array<{ type: string, correct: boolean }>} results
 * @returns {Object}
 */
export function getMixedSessionSummary(results) {
  const byType = {
    vocab: { correct: 0, total: 0 },
    grammar: { correct: 0, total: 0 },
    comprehension: { correct: 0, total: 0 },
  };

  results.forEach((r) => {
    if (!byType[r.type]) byType[r.type] = { correct: 0, total: 0 };
    byType[r.type].total++;
    if (r.correct) byType[r.type].correct++;
  });

  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Find weakest category
  let weakest = null;
  let lowestAcc = 101;
  Object.entries(byType).forEach(([type, stats]) => {
    if (stats.total > 0) {
      const acc = Math.round((stats.correct / stats.total) * 100);
      if (acc < lowestAcc) {
        lowestAcc = acc;
        weakest = type;
      }
    }
  });

  return { byType, total, correct, accuracy, weakest };
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/interleave.js
git commit -m "feat(interleave): add mixed session builder"
```

---

### Task 2.2: Create MixedSession Component

**Files:**

- Create: `src/components/MixedSession.jsx`

- [ ] **Step 1: Create `src/components/MixedSession.jsx`**

```jsx
// src/components/MixedSession.jsx
// Unified session UI for interleaved vocab + grammar + comprehension practice

import { useState, useMemo } from "react";
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  Trophy,
  BookOpen,
  Zap,
  PenLine,
  Volume2,
} from "lucide-react";
import useStore from "../store/useStore";
import { buildMixedSession, getMixedSessionSummary } from "../lib/interleave";
import {
  buildDrillFeedback,
  buildTenseFeedback,
  buildVocabFeedback,
} from "../lib/feedback";
import ElaborativeFeedback from "./ElaborativeFeedback";
import { Rating } from "../lib/fsrs";
import { speak } from "../lib/speech";

const TYPE_LABELS = {
  vocab: {
    label: "Vocabulary",
    icon: <BookOpen size={12} />,
    color: "var(--color-blue)",
  },
  grammar: {
    label: "Grammar",
    icon: <Zap size={12} />,
    color: "var(--color-purple)",
  },
  comprehension: {
    label: "Comprehension",
    icon: <PenLine size={12} />,
    color: "var(--color-cyan)",
  },
};

export default function MixedSession({ onClose }) {
  const cards = useStore((s) => s.cards);
  const grammarCards = useStore((s) => s.grammarCards);
  const reviewCardAction = useStore((s) => s.reviewCardAction);
  const reviewGrammarDrill = useStore((s) => s.reviewGrammarDrill);
  const updateStreak = useStore((s) => s.updateStreak);

  const session = useMemo(() => buildMixedSession({ cards, grammarCards }), []);

  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [elaborative, setElaborative] = useState(null);
  const [results, setResults] = useState([]);
  const [flipped, setFlipped] = useState(false);

  if (session.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">🎉</p>
        <p className="text-lg font-bold mb-2">Nothing due!</p>
        <p className="text-sm mb-4" style={{ color: "var(--color-dim)" }}>
          All caught up. Check back later.
        </p>
        <button
          onClick={onClose}
          className="px-6 py-3 rounded-xl font-bold text-sm text-white"
          style={{ background: "var(--color-accent)" }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Session complete
  if (idx >= session.length) {
    const summary = getMixedSessionSummary(results);
    return (
      <div className="space-y-4 animate-fadeUp">
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <Trophy
            size={48}
            className="mx-auto mb-3"
            style={{ color: "var(--color-green)" }}
          />
          <h2 className="text-xl font-bold mb-1">Mixed Session Complete!</h2>
          <p
            className="text-3xl font-bold mb-1"
            style={{
              color:
                summary.accuracy >= 80
                  ? "var(--color-green)"
                  : summary.accuracy >= 50
                    ? "var(--color-orange)"
                    : "var(--color-red)",
            }}
          >
            {summary.accuracy}%
          </p>
          <p className="text-sm" style={{ color: "var(--color-dim)" }}>
            {summary.correct}/{summary.total} correct
          </p>
        </div>

        {/* Per-category breakdown */}
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(summary.byType)
            .filter(([, s]) => s.total > 0)
            .map(([type, stats]) => {
              const info = TYPE_LABELS[type];
              const acc = Math.round((stats.correct / stats.total) * 100);
              return (
                <div
                  key={type}
                  className="rounded-xl p-3 text-center"
                  style={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    className="text-lg font-bold"
                    style={{ color: info.color }}
                  >
                    {acc}%
                  </div>
                  <div
                    className="text-[10px] flex items-center justify-center gap-1"
                    style={{ color: "var(--color-dim)" }}
                  >
                    {info.icon} {info.label}
                  </div>
                </div>
              );
            })}
        </div>

        {summary.weakest && (
          <div
            className="rounded-xl p-3 text-xs text-center"
            style={{
              background: "rgba(255,145,0,0.08)",
              border: "1px solid rgba(255,145,0,0.2)",
              color: "var(--color-orange)",
            }}
          >
            Focus area: <b>{summary.weakest}</b> — lowest accuracy this session
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full p-3 rounded-xl font-bold text-sm text-white"
          style={{ background: "var(--color-accent)" }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const current = session[idx];
  const typeInfo = TYPE_LABELS[current.type];
  const progress = Math.round((idx / session.length) * 100);

  const advance = (correct) => {
    setResults((prev) => [...prev, { type: current.type, correct }]);
    updateStreak();
    setTimeout(
      () => {
        setFeedback(null);
        setElaborative(null);
        setInput("");
        setFlipped(false);
        setIdx((i) => i + 1);
      },
      correct ? 1500 : 4000,
    );
  };

  const handleVocabRate = (rating) => {
    const correct = rating >= Rating.Good;
    reviewCardAction(current.item.m, rating);
    setFeedback({ correct });
    if (!correct) {
      setElaborative({
        explanation: buildVocabFeedback(current.item),
        mnemonic: null,
        examples: [],
        relatedRule: null,
      });
    }
    advance(correct);
  };

  const handleGrammarCheck = () => {
    if (feedback || !input.trim()) return;
    const drill = current.item;
    const correct = input.trim().toLowerCase() === drill.answer.toLowerCase();
    setFeedback({ correct, answer: drill.answer });
    setElaborative(buildDrillFeedback(drill, correct));
    reviewGrammarDrill(drill.id, correct);
    advance(correct);
  };

  const handleTenseCheck = (chosen) => {
    if (feedback) return;
    const drill = current.item;
    const correct = chosen === drill.answer;
    setFeedback({ correct, answer: drill.answer });
    setElaborative(buildTenseFeedback(drill, chosen));
    reviewGrammarDrill(drill.id, correct);
    advance(correct);
  };

  const handleCompCheck = () => {
    if (feedback || !input.trim()) return;
    const correct = input.trim().toLowerCase() === current.item.m.toLowerCase();
    setFeedback({ correct, answer: current.item.m });
    if (!correct) {
      reviewCardAction(current.item.m, Rating.Again);
    } else {
      reviewCardAction(current.item.m, Rating.Good);
    }
    advance(correct);
  };

  return (
    <div className="space-y-3 animate-fadeUp">
      {/* Progress bar */}
      <div className="flex items-center justify-between text-xs mb-1">
        <span
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}
        >
          {typeInfo.icon} {typeInfo.label}
        </span>
        <span style={{ color: "var(--color-dim)" }}>
          {idx + 1}/{session.length}
        </span>
      </div>
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: "var(--color-surface)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background:
              "linear-gradient(90deg, var(--color-accent), var(--color-green))",
          }}
        />
      </div>

      {/* VOCAB ITEM */}
      {current.type === "vocab" && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="text-center mb-4">
            <p className="text-2xl font-bold mb-1">{current.item.m}</p>
            <p className="text-xs" style={{ color: "var(--color-dim)" }}>
              {current.item.t}
            </p>
            <button
              onClick={() => speak(current.item.m)}
              className="mt-2 p-1.5 rounded-full"
              style={{
                color: "var(--color-cyan)",
                border: "1px solid var(--color-border)",
              }}
            >
              <Volume2 size={14} />
            </button>
          </div>

          {!flipped && !feedback && (
            <button
              onClick={() => setFlipped(true)}
              className="w-full p-3 rounded-xl font-bold text-sm"
              style={{
                background: "var(--color-card2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
            >
              Show Answer
            </button>
          )}

          {flipped && !feedback && (
            <>
              <p
                className="text-center text-lg font-bold mb-3"
                style={{ color: "var(--color-accent)" }}
              >
                {current.item.e}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleVocabRate(Rating.Again)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white"
                  style={{ background: "var(--color-red)" }}
                >
                  Again
                </button>
                <button
                  onClick={() => handleVocabRate(Rating.Good)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white"
                  style={{ background: "var(--color-blue)" }}
                >
                  Good
                </button>
                <button
                  onClick={() => handleVocabRate(Rating.Easy)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white"
                  style={{ background: "var(--color-green)" }}
                >
                  Easy
                </button>
              </div>
            </>
          )}

          {feedback && (
            <div
              className="flex items-center gap-2 justify-center text-sm font-bold"
              style={{
                color: feedback.correct
                  ? "var(--color-green)"
                  : "var(--color-red)",
              }}
            >
              {feedback.correct ? (
                <CheckCircle size={16} />
              ) : (
                <XCircle size={16} />
              )}
              {feedback.correct ? "Nice!" : `Review: ${current.item.e}`}
            </div>
          )}
          {elaborative && <ElaborativeFeedback feedback={elaborative} />}
        </div>
      )}

      {/* GRAMMAR ITEM (imbuhan/passive/suffix) */}
      {current.type === "grammar" &&
        current.item.type !== undefined &&
        !current.item.options && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p className="text-center text-2xl font-bold mb-1">
              {current.item.root ||
                current.item.active ||
                current.item.sentence}
            </p>
            <p
              className="text-center text-xs mb-4"
              style={{ color: "var(--color-dim)" }}
            >
              {current.item.hint}
            </p>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGrammarCheck()}
              className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
              style={{
                background: "var(--color-surface)",
                border: "1.5px solid var(--color-border)",
                color: "var(--color-text)",
              }}
              placeholder="Type your answer..."
              autoFocus
            />
            <button
              onClick={handleGrammarCheck}
              className="w-full p-3 rounded-xl font-bold text-sm text-black"
              style={{ background: "var(--color-green)" }}
            >
              Check
            </button>
            {feedback && (
              <div
                className="mt-3 flex items-center gap-2 justify-center text-sm font-bold"
                style={{
                  color: feedback.correct
                    ? "var(--color-green)"
                    : "var(--color-red)",
                }}
              >
                {feedback.correct ? (
                  <CheckCircle size={16} />
                ) : (
                  <XCircle size={16} />
                )}
                {feedback.correct ? "Betul!" : `Jawapan: ${feedback.answer}`}
              </div>
            )}
            {elaborative && <ElaborativeFeedback feedback={elaborative} />}
          </div>
        )}

      {/* GRAMMAR ITEM (tense — has options) */}
      {current.type === "grammar" && current.item.options && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p className="text-center text-lg font-bold mb-2">
            {current.item.sentence}
          </p>
          <p
            className="text-center text-xs mb-4"
            style={{ color: "var(--color-dim)" }}
          >
            {current.item.translation}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {current.item.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleTenseCheck(opt)}
                className="p-3 rounded-xl text-sm font-semibold"
                style={{
                  background: feedback
                    ? opt === current.item.answer
                      ? "rgba(0,230,118,0.15)"
                      : "var(--color-card2)"
                    : "var(--color-card2)",
                  border:
                    "2px solid " +
                    (feedback && opt === current.item.answer
                      ? "var(--color-green)"
                      : "var(--color-border)"),
                  color: "var(--color-text)",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          {feedback && (
            <p
              className="text-center text-xs mt-3 font-bold"
              style={{
                color: feedback.correct
                  ? "var(--color-green)"
                  : "var(--color-red)",
              }}
            >
              {feedback.correct ? "Betul!" : `Jawapan: ${feedback.answer}`}
            </p>
          )}
          {elaborative && <ElaborativeFeedback feedback={elaborative} />}
        </div>
      )}

      {/* COMPREHENSION ITEM (cloze) */}
      {current.type === "comprehension" && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p
            className="text-xs font-bold mb-3"
            style={{ color: "var(--color-cyan)" }}
          >
            Fill in the blank
          </p>
          <div
            className="p-3 rounded-xl mb-3 text-sm leading-relaxed"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            {(
              current.item.ex || `${current.item.m} means ${current.item.e}`
            ).replace(
              new RegExp(
                current.item.m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                "gi",
              ),
              "_____",
            )}
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--color-dim)" }}>
            Hint: {current.item.e}
          </p>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCompCheck()}
            className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
            style={{
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            placeholder="Fill in the blank..."
            autoFocus
          />
          <button
            onClick={handleCompCheck}
            className="w-full p-3 rounded-xl font-bold text-sm text-black"
            style={{ background: "var(--color-green)" }}
          >
            Check
          </button>
          {feedback && (
            <div
              className="mt-3 flex items-center gap-2 justify-center text-sm font-bold"
              style={{
                color: feedback.correct
                  ? "var(--color-green)"
                  : "var(--color-red)",
              }}
            >
              {feedback.correct ? (
                <CheckCircle size={16} />
              ) : (
                <XCircle size={16} />
              )}
              {feedback.correct ? "Correct!" : `Answer: ${feedback.answer}`}
            </div>
          )}
        </div>
      )}

      {/* Cancel */}
      <button
        onClick={onClose}
        className="w-full text-center text-xs py-2"
        style={{ color: "var(--color-dim)" }}
      >
        End Session
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: Zero errors

- [ ] **Step 3: Commit**

```bash
git add src/components/MixedSession.jsx
git commit -m "feat(interleave): add MixedSession UI component"
```

---

### Task 2.3: Integrate Mixed Session into Dashboard

**Files:**

- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1: Add import and state**

At the top of `src/pages/Dashboard.jsx`, add:

```js
import MixedSession from "../components/MixedSession";
```

Inside the component, after the existing state declarations:

```js
const [showMixed, setShowMixed] = useState(false);
```

- [ ] **Step 2: Add mixed session view**

At the start of the return block, before the first `<div>`, add:

```jsx
if (showMixed) {
  return <MixedSession onClose={() => setShowMixed(false)} />;
}
```

- [ ] **Step 3: Update "Start Review" button**

Replace the existing "Start Review" button (around line 412) with:

```jsx
<button
  onClick={() => setShowMixed(true)}
  className="rounded-xl p-4 font-bold text-sm text-white"
  style={{ background: "var(--color-accent)" }}
>
  Mixed Review ({due.length} due)
</button>
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: Zero errors

- [ ] **Step 5: Test manually**

Run: `npm run dev`
Test: Dashboard → "Mixed Review" → session should cycle through vocab, grammar, and comprehension items.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat(interleave): integrate mixed session into dashboard"
```

---

## Phase 3: Metacognitive Confidence Tracking

**Learning principle:** Metacognitive monitoring is one of the strongest predictors of exam performance (Dunlosky & Rawson, 2012).

**Goal:** "How confident are you?" prompt before answer reveal in mixed sessions, with calibration tracking over time.

---

### Task 3.1: Store Migration v5 → v6

**Files:**

- Modify: `src/store/useStore.js`

- [ ] **Step 1: Update STORE_VERSION**

Change line 10:

```js
const STORE_VERSION = 6; // v6 = Learning science features (confidence, interleave, userRole)
```

- [ ] **Step 2: Add new state fields**

After the `sync` state block (around line 72), add:

```js
      // Learning science features (v6)
      confidenceLog: [],  // Array<{ cardId, confidence, correct, timestamp }> — capped at 500
      interleaveSettings: { enabled: true, vocabRatio: 0.5, grammarRatio: 0.3, comprehensionRatio: 0.2 },
      userRole: 'static',  // 'static' | 'enhanced' | 'admin' | 'owner'
```

- [ ] **Step 3: Add confidence log action**

After the `clearCikguHistory` action (around line 322), add:

```js
      logConfidence: (cardId, confidence, correct) => set(state => {
        const entry = { cardId, confidence, correct, timestamp: Date.now() }
        const log = [...state.confidenceLog, entry].slice(-500)
        return { confidenceLog: log }
      }),

      getConfidenceCalibration: () => {
        const { confidenceLog } = get()
        if (confidenceLog.length < 5) return null

        const byLevel = { 1: { correct: 0, total: 0 }, 2: { correct: 0, total: 0 }, 3: { correct: 0, total: 0 } }
        confidenceLog.forEach(entry => {
          if (!byLevel[entry.confidence]) return
          byLevel[entry.confidence].total++
          if (entry.correct) byLevel[entry.confidence].correct++
        })

        const calibration = {}
        Object.entries(byLevel).forEach(([level, stats]) => {
          calibration[level] = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null
        })

        // Overall calibration score: how well does confidence predict correctness?
        const overconfident = confidenceLog.filter(e => e.confidence === 3 && !e.correct).length
        const underconfident = confidenceLog.filter(e => e.confidence === 1 && e.correct).length
        const total = confidenceLog.length

        return {
          byLevel: calibration,
          overconfidentPct: Math.round((overconfident / total) * 100),
          underconfidentPct: Math.round((underconfident / total) * 100),
          totalEntries: total,
        }
      },

      setUserRole: (role) => set({ userRole: role }),
```

- [ ] **Step 4: Add v5 → v6 migration**

In the `migrate` callback, after the `if (version < 5)` block (around line 775), add:

```js
// Migrate to v6 (learning science features)
if (version < 6) {
  state = {
    ...state,
    confidenceLog: state.confidenceLog || [],
    interleaveSettings: state.interleaveSettings || {
      enabled: true,
      vocabRatio: 0.5,
      grammarRatio: 0.3,
      comprehensionRatio: 0.2,
    },
    userRole: state.userRole || "static",
  };
}
```

- [ ] **Step 5: Build and verify**

Run: `npm run build`
Expected: Zero errors

- [ ] **Step 6: Commit**

```bash
git add src/store/useStore.js
git commit -m "feat(store): migrate v5→v6, add confidence log, interleave settings, userRole"
```

---

### Task 3.2: Create ConfidencePrompt Component

**Files:**

- Create: `src/components/ConfidencePrompt.jsx`

- [ ] **Step 1: Create `src/components/ConfidencePrompt.jsx`**

```jsx
// src/components/ConfidencePrompt.jsx
// "How sure are you?" pre-reveal prompt — 3-point scale

/**
 * @param {Object} props
 * @param {Function} props.onSelect - Called with confidence level (1=unsure, 2=think so, 3=certain)
 */
export default function ConfidencePrompt({ onSelect }) {
  const levels = [
    { value: 1, label: "Unsure", emoji: "🤔", color: "var(--color-red)" },
    { value: 2, label: "Think so", emoji: "🤷", color: "var(--color-orange)" },
    { value: 3, label: "Certain", emoji: "😎", color: "var(--color-green)" },
  ];

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "rgba(124,58,237,0.06)",
        border: "1px solid rgba(124,58,237,0.2)",
      }}
    >
      <p
        className="text-xs font-bold text-center mb-2"
        style={{ color: "var(--color-purple)" }}
      >
        How confident are you?
      </p>
      <div className="flex gap-2">
        {levels.map((l) => (
          <button
            key={l.value}
            onClick={() => onSelect(l.value)}
            className="flex-1 py-2 rounded-lg text-center transition-all hover:scale-105"
            style={{
              background: "var(--color-card2)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="text-lg">{l.emoji}</div>
            <div className="text-[10px] font-bold" style={{ color: l.color }}>
              {l.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ConfidencePrompt.jsx
git commit -m "feat(confidence): add ConfidencePrompt component"
```

---

### Task 3.3: Integrate Confidence into MixedSession

**Files:**

- Modify: `src/components/MixedSession.jsx`

- [ ] **Step 1: Add imports and state**

Add to imports:

```js
import ConfidencePrompt from "./ConfidencePrompt";
```

Add state variable after existing state:

```js
const [confidence, setConfidence] = useState(null);
const logConfidence = useStore((s) => s.logConfidence);
```

- [ ] **Step 2: Modify vocab section**

In the vocab section, replace the "Show Answer" button with a confidence prompt:

```jsx
{
  !flipped && !feedback && (
    <ConfidencePrompt
      onSelect={(level) => {
        setConfidence(level);
        setFlipped(true);
      }}
    />
  );
}
```

- [ ] **Step 3: Log confidence on rate**

In `handleVocabRate`, add confidence logging:

```js
const handleVocabRate = (rating) => {
  const correct = rating >= Rating.Good;
  reviewCardAction(current.item.m, rating);
  if (confidence) {
    logConfidence(current.item.m, confidence, correct);
  }
  setFeedback({ correct });
  if (!correct) {
    setElaborative({
      explanation: buildVocabFeedback(current.item),
      mnemonic: null,
      examples: [],
      relatedRule: null,
    });
  }
  advance(correct);
};
```

- [ ] **Step 4: Reset confidence in advance**

Add `setConfidence(null)` to the advance function's setTimeout:

```js
const advance = (correct) => {
  setResults((prev) => [...prev, { type: current.type, correct }]);
  updateStreak();
  setTimeout(
    () => {
      setFeedback(null);
      setElaborative(null);
      setInput("");
      setFlipped(false);
      setConfidence(null);
      setIdx((i) => i + 1);
    },
    correct ? 1500 : 4000,
  );
};
```

- [ ] **Step 5: Build and verify**

Run: `npm run build`
Expected: Zero errors

- [ ] **Step 6: Commit**

```bash
git add src/components/MixedSession.jsx
git commit -m "feat(confidence): integrate confidence prompts into mixed sessions"
```

---

### Task 3.4: Add Calibration Card to Dashboard

**Files:**

- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1: Add calibration data**

After the existing store selectors, add:

```js
const getConfidenceCalibration = useStore((s) => s.getConfidenceCalibration);
const calibration = getConfidenceCalibration();
```

- [ ] **Step 2: Add calibration card**

After the "Daily Challenge" block (around line 238), add:

```jsx
{
  /* Confidence Calibration */
}
{
  calibration && calibration.totalEntries >= 10 && (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        <Brain size={15} style={{ color: "var(--color-purple)" }} />
        Confidence Calibration
      </h3>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {[
          { label: "Unsure", level: 1, emoji: "🤔" },
          { label: "Think so", level: 2, emoji: "🤷" },
          { label: "Certain", level: 3, emoji: "😎" },
        ].map((l) => {
          const acc = calibration.byLevel[l.level];
          return (
            <div
              key={l.level}
              className="text-center p-2 rounded-lg"
              style={{ background: "var(--color-card2)" }}
            >
              <div className="text-sm">{l.emoji}</div>
              <div
                className="text-lg font-bold"
                style={{
                  color:
                    acc === null
                      ? "var(--color-dim)"
                      : acc >= 70
                        ? "var(--color-green)"
                        : acc >= 40
                          ? "var(--color-orange)"
                          : "var(--color-red)",
                }}
              >
                {acc !== null ? `${acc}%` : "—"}
              </div>
              <div
                className="text-[10px]"
                style={{ color: "var(--color-dim)" }}
              >
                {l.label}
              </div>
            </div>
          );
        })}
      </div>
      {calibration.overconfidentPct > 20 && (
        <p className="text-[10px]" style={{ color: "var(--color-orange)" }}>
          You said "Certain" but got {calibration.overconfidentPct}% wrong —
          slow down on confident answers!
        </p>
      )}
      {calibration.underconfidentPct > 30 && (
        <p className="text-[10px]" style={{ color: "var(--color-green)" }}>
          You know more than you think! {calibration.underconfidentPct}% of your
          "Unsure" answers were correct.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: Zero errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat(confidence): add calibration card to dashboard"
```

---

## Phase 4: Mistake Pattern Clustering

**Learning principle:** Pattern recognition builds structural knowledge (Chi et al., 1989).

**Goal:** Group mistakes by underlying grammar rule instead of flat list.

---

### Task 4.1: Create Patterns Module

**Files:**

- Create: `src/lib/patterns.js`

- [ ] **Step 1: Create `src/lib/patterns.js`**

```js
// src/lib/patterns.js
// Clusters mistakes by underlying grammar rule

/**
 * Cluster mistakes by underlying grammar pattern.
 * @param {Array} mistakes - From store.mistakes (type: 'grammar'|'vocab')
 * @returns {Array<{ pattern: string, description: string, count: number, drillIds: string[] }>}
 */
export function clusterMistakes(mistakes) {
  const grammarMistakes = mistakes.filter(
    (m) => m.type === "grammar" && !m.reviewed,
  );
  const clusters = {};

  grammarMistakes.forEach((m) => {
    const pattern = classifyPattern(m.word); // m.word is the drill ID
    if (!clusters[pattern]) {
      clusters[pattern] = {
        pattern,
        description: PATTERN_DESCRIPTIONS[pattern] || pattern,
        count: 0,
        drillIds: [],
      };
    }
    clusters[pattern].count++;
    if (!clusters[pattern].drillIds.includes(m.word)) {
      clusters[pattern].drillIds.push(m.word);
    }
  });

  return Object.values(clusters)
    .filter((c) => c.count >= 2) // Only show patterns with 2+ mistakes
    .sort((a, b) => b.count - a.count);
}

/**
 * Classify a drill ID into a grammar pattern.
 * Drill IDs follow format: {type}-{prefix/detail}-{root}
 * e.g., prefix-meN-tulis, passive-ibu-masak, suffix-kan-bersih, tense-ali-makan
 */
function classifyPattern(drillId) {
  if (drillId.startsWith("prefix-meN-")) {
    // Extract the sub-rule from the drill ID
    const root = drillId.replace("prefix-meN-", "");
    const firstChar = root.charAt(0).toLowerCase();
    if ("ptks".includes(firstChar)) return `meN-PTKS-drop`;
    return `meN-standard`;
  }
  if (drillId.startsWith("prefix-ber-")) return "ber-prefix";
  if (drillId.startsWith("prefix-peN-")) return "peN-prefix";
  if (drillId.startsWith("passive-")) return "passive-voice";
  if (drillId.startsWith("suffix-kan-")) return "suffix-kan";
  if (drillId.startsWith("suffix-kean-")) return "suffix-ke-an";
  if (drillId.startsWith("suffix-an-")) return "suffix-an";
  if (drillId.startsWith("suffix-peNan-")) return "suffix-peN-an";
  if (drillId.startsWith("tense-")) return "tense-markers";
  if (drillId.startsWith("error-")) return "error-identification";
  if (drillId.startsWith("transform-")) return "sentence-transform";
  return "other";
}

const PATTERN_DESCRIPTIONS = {
  "meN-PTKS-drop":
    "meN- with P, T, K, S roots — these consonants DROP when the prefix is added",
  "meN-standard": "meN- with non-PTKS roots — the consonant stays",
  "ber-prefix":
    "ber- prefix — usually straightforward, watch for belajar/bekerja exceptions",
  "peN-prefix": "peN- prefix (doer nouns) — follows same PTKS rules as meN-",
  "passive-voice":
    "Active to passive conversion — meN- → di-, dropped consonants return",
  "suffix-kan": "-kan suffix — indicates action on an object",
  "suffix-ke-an": "ke-...-an circumfix — creates abstract nouns",
  "suffix-an": "-an suffix — creates result nouns",
  "suffix-peN-an": "peN-...-an circumfix — creates process nouns",
  "tense-markers": "Tense markers — sudah/sedang/akan/belum",
  "error-identification": "Identifying imbuhan errors in sentences",
  "sentence-transform": "Sentence transformation exercises",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/patterns.js
git commit -m "feat(patterns): add mistake clustering by grammar rule"
```

---

### Task 4.2: Upgrade MistakeJournal with Clustering

**Files:**

- Modify: `src/pages/MistakeJournal.jsx`

- [ ] **Step 1: Add import**

Add at the top of `MistakeJournal.jsx`:

```js
import { clusterMistakes } from "../lib/patterns";
```

- [ ] **Step 2: Replace pattern detection**

Replace the entire pattern detection block (lines 29-58, from `const grammarMistakes` through the end of the `if (menPenMistakes >= 2)` block) with:

```js
// Pattern clustering — groups mistakes by underlying grammar rule
const clusters = clusterMistakes(mistakes);
```

- [ ] **Step 3: Replace patterns display**

Replace the existing `{patterns.length > 0 && (...)}` block (lines 135-144) with:

```jsx
{
  clusters.length > 0 && (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(255,145,0,0.08)",
        border: "1px solid rgba(255,145,0,0.2)",
      }}
    >
      <h3
        className="text-sm font-bold mb-3 flex items-center gap-2"
        style={{ color: "var(--color-orange)" }}
      >
        <AlertTriangle size={14} /> Weak Patterns
      </h3>
      <div className="space-y-2">
        {clusters.map((c) => (
          <div key={c.pattern} className="flex items-start gap-2">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{
                background: "rgba(255,82,82,0.15)",
                color: "var(--color-red)",
              }}
            >
              {c.count}x
            </span>
            <div>
              <p
                className="text-xs font-bold"
                style={{ color: "var(--color-text)" }}
              >
                {c.pattern}
              </p>
              <p className="text-[10px]" style={{ color: "var(--color-dim)" }}>
                {c.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: Zero errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/MistakeJournal.jsx
git commit -m "feat(patterns): upgrade mistake journal with rule-based clustering"
```

---

## Phase 5: Access Control & Telemetry

**Goal:** 4-tier system (static/enhanced/admin/owner) + anonymous telemetry to Supabase.

**Prerequisites:** Kheshav must create a Supabase project and provide URL + anon key in `.env.local` before testing this phase.

---

### Task 5.1: Rewrite supabase.js

**Files:**

- Modify: `src/config/supabase.js`

- [ ] **Step 1: Rewrite `src/config/supabase.js`**

Replace the entire file contents with:

```js
// src/config/supabase.js
// 2-table Supabase schema: allowed_users + telemetry_events
// Static users never touch this. Enhanced+ users send anonymous telemetry.

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || "",
  key: import.meta.env.VITE_SUPABASE_KEY || "",
  enabled: !!(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_KEY
  ),
};

const OWNER_EMAIL = "kheshav0@gmail.com";

let supabaseClient = null;

/**
 * Initialize Supabase client (lazy-loaded).
 * Returns null if credentials not configured — static users are never affected.
 */
export async function initSupabase() {
  if (!SUPABASE_CONFIG.enabled) return null;
  if (supabaseClient) return supabaseClient;

  try {
    const { createClient } = await import("@supabase/supabase-js");
    supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
    return supabaseClient;
  } catch {
    return null;
  }
}

export function getSupabase() {
  return supabaseClient;
}

/**
 * Send magic link OTP to email.
 * @returns {{ error: string|null }}
 */
export async function sendMagicLink(email) {
  const client = await initSupabase();
  if (!client) return { error: "Supabase not configured" };

  const { error } = await client.auth.signInWithOtp({ email });
  return { error: error?.message || null };
}

/**
 * Check if authenticated user is in the allowed_users table.
 * Owner email bypasses the check.
 * @returns {{ role: 'owner'|'admin'|'enhanced'|null, error: string|null }}
 */
export async function checkUserRole(email) {
  if (email === OWNER_EMAIL) return { role: "owner", error: null };

  const client = getSupabase();
  if (!client) return { role: null, error: "Not connected" };

  try {
    const { data, error } = await client
      .from("allowed_users")
      .select("role")
      .eq("email", email)
      .single();

    if (error || !data)
      return { role: null, error: "Email not on the allowlist" };
    return { role: data.role, error: null };
  } catch {
    return { role: null, error: "Failed to check allowlist" };
  }
}

/**
 * Send anonymous telemetry event (fire-and-forget).
 * Only called for enhanced+ users. Failures are silently dropped.
 */
export async function sendTelemetryEvent(eventType, payload = {}) {
  const client = getSupabase();
  if (!client) return;

  try {
    await client.from("telemetry_events").insert({
      event_type: eventType,
      payload,
    });
  } catch {
    // Fire-and-forget — never break app flow
  }
}

/**
 * Read telemetry events (admin/owner only).
 * @param {number} [limit=100]
 * @returns {Array}
 */
export async function readTelemetryEvents(limit = 100) {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data } = await client
      .from("telemetry_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Manage allowed_users (owner only).
 */
export async function addAllowedUser(email, role = "enhanced") {
  const client = getSupabase();
  if (!client) return { error: "Not connected" };

  try {
    const { error } = await client.from("allowed_users").upsert({
      email,
      role,
      invited_by: OWNER_EMAIL,
    });
    return { error: error?.message || null };
  } catch (e) {
    return { error: e.message };
  }
}

export async function removeAllowedUser(email) {
  const client = getSupabase();
  if (!client) return { error: "Not connected" };

  try {
    const { error } = await client
      .from("allowed_users")
      .delete()
      .eq("email", email);
    return { error: error?.message || null };
  } catch (e) {
    return { error: e.message };
  }
}

export async function listAllowedUsers() {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data } = await client
      .from("allowed_users")
      .select("*")
      .order("invited_at", { ascending: false });
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Sign out current user.
 */
export async function signOut() {
  const client = getSupabase();
  if (!client) return;
  await client.auth.signOut();
}

/**
 * Get current authenticated user session.
 */
export async function getCurrentUser() {
  const client = await initSupabase();
  if (!client) return null;

  try {
    const {
      data: { user },
    } = await client.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Listen for auth state changes.
 */
export function onAuthStateChange(callback) {
  const client = getSupabase();
  if (!client) return { data: { subscription: { unsubscribe: () => {} } } };
  return client.auth.onAuthStateChange(callback);
}

/**
 * Call a Supabase Edge Function with optional streaming support.
 * Used by the AI service layer (src/lib/ai.js).
 */
export async function callEdgeFunction(functionName, body, options = {}) {
  const url = `${SUPABASE_CONFIG.url}/functions/v1/${functionName}`;
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_CONFIG.key}`,
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });
}

// SQL for Supabase SQL editor — run this once to set up tables
export const SCHEMA_SQL = `
CREATE TABLE allowed_users (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('enhanced', 'admin')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by TEXT NOT NULL
);

CREATE TABLE telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert telemetry" ON telemetry_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Only authenticated can read telemetry" ON telemetry_events FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read allowlist" ON allowed_users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owner can manage allowlist" ON allowed_users FOR ALL USING (auth.jwt() ->> 'email' = 'kheshav0@gmail.com');
`;
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: Zero errors

- [ ] **Step 3: Commit**

```bash
git add src/config/supabase.js
git commit -m "feat(supabase): rewrite for 2-table schema (allowed_users + telemetry)"
```

---

### Task 5.2: Wire Telemetry for Enhanced Users

**Files:**

- Modify: `src/lib/telemetry.js`

- [ ] **Step 1: Rewrite `src/lib/telemetry.js`**

Replace the entire file with:

```js
// src/lib/telemetry.js
// Dual write: localStorage always, Supabase for enhanced+ users (fire-and-forget)

import { sendTelemetryEvent } from "../config/supabase";

const TELEMETRY_KEY = "igcse-malay-telemetry";
const MAX_EVENTS = 500;

let cloudEnabled = false;

/**
 * Enable cloud telemetry (called when user authenticates as enhanced/admin/owner).
 */
export function enableCloudTelemetry() {
  cloudEnabled = true;
}

/**
 * Disable cloud telemetry (called on sign out or if user is static).
 */
export function disableCloudTelemetry() {
  cloudEnabled = false;
}

export function trackEvent(event, payload = {}) {
  const entry = {
    event,
    payload,
    ts: new Date().toISOString(),
  };

  // Always write to localStorage
  try {
    const prev = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || "[]");
    const next = [...prev, entry].slice(-MAX_EVENTS);
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next));
  } catch {
    // Telemetry must never break app flow.
  }

  // Fire-and-forget to Supabase for enhanced+ users
  if (cloudEnabled) {
    try {
      sendTelemetryEvent(event, payload);
    } catch {}
  }
}

export function getTelemetryEvents() {
  try {
    return JSON.parse(localStorage.getItem(TELEMETRY_KEY) || "[]");
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/telemetry.js
git commit -m "feat(telemetry): add dual write with cloud toggle for enhanced users"
```

---

### Task 5.3: Create AuthUnlock Component

**Files:**

- Create: `src/components/AuthUnlock.jsx`

- [ ] **Step 1: Create `src/components/AuthUnlock.jsx`**

```jsx
// src/components/AuthUnlock.jsx
// Magic link auth flow — appears in Settings for users wanting Enhanced mode

import { useState, useEffect } from "react";
import { Mail, CheckCircle, XCircle, LogOut, Shield } from "lucide-react";
import {
  sendMagicLink,
  checkUserRole,
  getCurrentUser,
  signOut,
  onAuthStateChange,
  initSupabase,
  SUPABASE_CONFIG,
} from "../config/supabase";
import { enableCloudTelemetry, disableCloudTelemetry } from "../lib/telemetry";
import useStore from "../store/useStore";

export default function AuthUnlock() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | checking | done | error
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const userRole = useStore((s) => s.userRole);
  const setUserRole = useStore((s) => s.setUserRole);

  // Check for existing session on mount
  useEffect(() => {
    if (!SUPABASE_CONFIG.enabled) return;

    initSupabase().then(async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const { role } = await checkUserRole(currentUser.email);
        if (role) {
          setUserRole(role);
          enableCloudTelemetry();
          setStatus("done");
        }
      }
    });

    // Listen for auth state changes (magic link callback)
    const {
      data: { subscription },
    } = onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        setStatus("checking");
        const { role, error: roleError } = await checkUserRole(
          session.user.email,
        );
        if (role) {
          setUserRole(role);
          enableCloudTelemetry();
          setStatus("done");
        } else {
          setError(
            roleError || "Your email is not on the allowlist. Contact Kheshav.",
          );
          setStatus("error");
        }
      }
    });

    return () => subscription?.unsubscribe();
  }, [setUserRole]);

  const handleSendLink = async () => {
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);
    const { error: sendError } = await sendMagicLink(email.trim());
    if (sendError) {
      setError(sendError);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUserRole("static");
    disableCloudTelemetry();
    setUser(null);
    setStatus("idle");
    setEmail("");
  };

  if (!SUPABASE_CONFIG.enabled) {
    return (
      <div
        className="rounded-xl p-3 text-xs"
        style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          color: "var(--color-dim)",
        }}
      >
        Enhanced mode not available (Supabase not configured).
      </div>
    );
  }

  // Signed in and authorized
  if (status === "done" && user) {
    const roleColors = {
      enhanced: "var(--color-blue)",
      admin: "var(--color-purple)",
      owner: "var(--color-accent)",
    };
    return (
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield
              size={14}
              style={{ color: roleColors[userRole] || "var(--color-dim)" }}
            />
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: `${roleColors[userRole] || "var(--color-dim)"}15`,
                color: roleColors[userRole] || "var(--color-dim)",
              }}
            >
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs flex items-center gap-1"
            style={{ color: "var(--color-dim)" }}
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
        <p className="text-xs" style={{ color: "var(--color-dim)" }}>
          {user.email}
        </p>
        <p className="text-[10px] mt-1" style={{ color: "var(--color-green)" }}>
          Telemetry active. Your anonymous usage data helps improve the app for
          everyone.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
        <Shield size={14} style={{ color: "var(--color-accent)" }} />
        Unlock Enhanced Mode
      </h4>
      <p className="text-xs mb-3" style={{ color: "var(--color-dim)" }}>
        Enhanced mode enables XP tracking, streak freezes, and helps improve the
        app through anonymous telemetry. Requires an invitation from the app
        owner.
      </p>

      {status === "idle" || status === "error" ? (
        <>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendLink()}
              className="flex-1 p-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "var(--color-surface)",
                border: "1.5px solid var(--color-border)",
                color: "var(--color-text)",
              }}
              placeholder="Your email..."
            />
            <button
              onClick={handleSendLink}
              className="px-4 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-1"
              style={{ background: "var(--color-accent)" }}
            >
              <Mail size={14} /> Send Link
            </button>
          </div>
          {error && (
            <p
              className="text-xs mt-2 flex items-center gap-1"
              style={{ color: "var(--color-red)" }}
            >
              <XCircle size={12} /> {error}
            </p>
          )}
        </>
      ) : status === "sending" ? (
        <p className="text-xs" style={{ color: "var(--color-dim)" }}>
          Sending magic link...
        </p>
      ) : status === "sent" ? (
        <div
          className="flex items-center gap-2 text-xs"
          style={{ color: "var(--color-green)" }}
        >
          <CheckCircle size={14} />
          <span>Magic link sent! Check your email (and spam folder).</span>
        </div>
      ) : status === "checking" ? (
        <p className="text-xs" style={{ color: "var(--color-dim)" }}>
          Verifying access...
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AuthUnlock.jsx
git commit -m "feat(auth): add AuthUnlock magic link component"
```

---

### Task 5.4: Create AdminPanel Component

**Files:**

- Create: `src/components/AdminPanel.jsx`

- [ ] **Step 1: Create `src/components/AdminPanel.jsx`**

```jsx
// src/components/AdminPanel.jsx
// Owner: invite/remove users. Admin: view telemetry aggregates.

import { useState, useEffect } from "react";
import { UserPlus, Trash2, BarChart3, Users, Shield } from "lucide-react";
import {
  addAllowedUser,
  removeAllowedUser,
  listAllowedUsers,
  readTelemetryEvents,
} from "../config/supabase";
import useStore from "../store/useStore";

export default function AdminPanel() {
  const userRole = useStore((s) => s.userRole);
  const [users, setUsers] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("enhanced");
  const [msg, setMsg] = useState("");
  const [telemetry, setTelemetry] = useState([]);
  const [tab, setTab] = useState("users");

  const isOwner = userRole === "owner";
  const isAdmin = userRole === "admin" || isOwner;

  useEffect(() => {
    if (isAdmin) {
      listAllowedUsers().then(setUsers);
      readTelemetryEvents(200).then(setTelemetry);
    }
  }, [isAdmin]);

  const handleInvite = async () => {
    if (!newEmail.trim()) return;
    const { error } = await addAllowedUser(newEmail.trim(), newRole);
    if (error) {
      setMsg(`Error: ${error}`);
    } else {
      setMsg(`Invited ${newEmail.trim()} as ${newRole}`);
      setNewEmail("");
      listAllowedUsers().then(setUsers);
    }
    setTimeout(() => setMsg(""), 3000);
  };

  const handleRemove = async (email) => {
    const { error } = await removeAllowedUser(email);
    if (!error) {
      setUsers((prev) => prev.filter((u) => u.email !== email));
    }
  };

  if (!isAdmin) return null;

  // Telemetry aggregates
  const eventCounts = {};
  telemetry.forEach((e) => {
    eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
  });
  const sortedEvents = Object.entries(eventCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <h3 className="text-sm font-bold flex items-center gap-2">
        <Shield size={14} style={{ color: "var(--color-purple)" }} />
        Admin Panel
      </h3>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: "users", label: "Users", icon: <Users size={12} /> },
          {
            id: "telemetry",
            label: "Telemetry",
            icon: <BarChart3 size={12} />,
          },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background:
                tab === t.id ? "var(--color-accent2)" : "var(--color-card2)",
              color: tab === t.id ? "#fff" : "var(--color-dim)",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === "users" && (
        <div className="space-y-2">
          {isOwner && (
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1 p-2 rounded-lg text-xs outline-none"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
                placeholder="Email to invite..."
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="p-2 rounded-lg text-xs outline-none"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
              >
                <option value="enhanced">Enhanced</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={handleInvite}
                className="px-3 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-1"
                style={{ background: "var(--color-accent)" }}
              >
                <UserPlus size={12} /> Invite
              </button>
            </div>
          )}
          {msg && (
            <p className="text-xs" style={{ color: "var(--color-green)" }}>
              {msg}
            </p>
          )}

          {users.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-dim)" }}>
              No invited users yet.
            </p>
          ) : (
            <div className="space-y-1">
              {users.map((u) => (
                <div
                  key={u.email}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs"
                  style={{ background: "var(--color-card2)" }}
                >
                  <div>
                    <span style={{ color: "var(--color-text)" }}>
                      {u.email}
                    </span>
                    <span
                      className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background:
                          u.role === "admin"
                            ? "rgba(124,58,237,0.15)"
                            : "rgba(68,138,255,0.15)",
                        color:
                          u.role === "admin"
                            ? "var(--color-purple)"
                            : "var(--color-blue)",
                      }}
                    >
                      {u.role}
                    </span>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleRemove(u.email)}
                      style={{ color: "var(--color-red)" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Telemetry tab */}
      {tab === "telemetry" && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: "var(--color-dim)" }}>
            {telemetry.length} events recorded
          </p>
          {sortedEvents.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-dim)" }}>
              No telemetry data yet.
            </p>
          ) : (
            <div className="space-y-1">
              {sortedEvents.slice(0, 15).map(([event, count]) => (
                <div
                  key={event}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <span
                    className="font-mono"
                    style={{ color: "var(--color-text)" }}
                  >
                    {event}
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: "var(--color-cyan)" }}
                  >
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AdminPanel.jsx
git commit -m "feat(admin): add AdminPanel with invite system and telemetry dashboard"
```

---

### Task 5.5: Integrate Auth into Settings.jsx

**Files:**

- Modify: `src/pages/Settings.jsx`

- [ ] **Step 1: Add imports**

At the top of `Settings.jsx`, add:

```js
import AuthUnlock from "../components/AuthUnlock";
import AdminPanel from "../components/AdminPanel";
```

- [ ] **Step 2: Add auth and admin sections**

At the end of the Settings page's return block (before the closing `</div>` of the main container), add:

```jsx
{
  /* Enhanced Mode */
}
<div className="mt-6">
  <h3 className="text-sm font-bold mb-3">Account</h3>
  <AuthUnlock />
</div>;

{
  /* Admin Panel (only visible to admin/owner) */
}
<div className="mt-4">
  <AdminPanel />
</div>;
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: Zero errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/Settings.jsx
git commit -m "feat(settings): integrate AuthUnlock and AdminPanel"
```

---

### Task 5.6: Gate Gamification Features by Role

**Files:**

- Modify: `src/pages/Dashboard.jsx`

This task conditionally shows gamification features (XP, streak freezes, full challenges, install prompt) only for enhanced+ users.

- [ ] **Step 1: Add userRole selector**

In Dashboard.jsx, add:

```js
const userRole = useStore((s) => s.userRole);
const isEnhanced = userRole !== "static";
```

- [ ] **Step 2: Wrap gamification elements**

Wrap the following blocks with `{isEnhanced && (...)}`:

- The Daily Challenge block
- The XP stat card (change to only show when isEnhanced)
- The Freezes stat card
- The install prompt block

For the stats grid, conditionally include XP and Freezes:

```jsx
<div className="grid grid-cols-2 gap-3">
  {[
    { icon: <Brain size={18} />, label: 'Due Now', value: due.length, color: 'var(--color-red)', action: () => navigate('/study') },
    { icon: <Flame size={18} />, label: 'Streak', value: `${streak} days`, color: 'var(--color-orange)' },
    ...(isEnhanced ? [
      { icon: <BookOpen size={18} />, label: 'XP', value: engagementXP, color: 'var(--color-blue)' },
      { icon: <Target size={18} />, label: 'Freezes', value: streakFreezes, color: 'var(--color-green)' },
    ] : []),
  ].map((s, i) => (
    // ... existing button code
  ))}
</div>
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: Zero errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat(tiers): gate gamification features by user role"
```

---

## Phase 6: Desirable Difficulty & Adaptive Variants (Outline)

**Goal:** Mature cards get harder presentation; weak cards get more scaffolding.

### Task 6.1: Create Drill Variants Data

- Create: `src/data/drillVariants.js`
- Map FSRS stability ranges to presentation modes: standard, sentence-context, reverse, audio-only

### Task 6.2: Integrate Variants into Study.jsx

- Modify: `src/pages/Study.jsx`
- Cards with stability > 21 days → sentence cloze or English → Malay (reverse)
- Cards with stability > 90 days → audio-only or produce-in-context

### Task 6.3: Integrate Variants into MixedSession

- Modify: `src/components/MixedSession.jsx`
- Apply same stability-based variant selection

---

## Phase 7: Enhanced Roleplay Feedback (Outline)

**Goal:** Per-turn vocabulary + grammar highlighting in roleplay sessions.

### Task 7.1: Add Per-Turn Feedback to RoleplaySession

- Modify: `src/components/RoleplaySession.jsx` (or equivalent roleplay page)
- After each turn, highlight: correct vocabulary used, grammar patterns applied, missing key phrases

### Task 7.2: Upgrade Roleplay Scorecard

- Modify: `src/components/RoleplayScorecard.jsx` (or roleplay completion view)
- Side-by-side: student response vs model answer with grammar annotations

---

## Phase 8: Content Expansion & Polish (Outline)

**Goal:** More content driven by telemetry data, plus UI polish.

### Task 8.1: Expand Dictionary

- Modify: `src/data/dictionary.js`
- Target: 800+ entries (currently ~495)

### Task 8.2: Add Roleplay Scenarios

- Modify: `src/data/scenarios.js`
- Target: 15 scenarios (currently 9)

### Task 8.3: PWA Manifest + Service Worker

- Create: `public/manifest.json`, `public/sw.js`
- Basic offline shell caching

### Task 8.4: UI Polish

- Page transitions, mobile touch target improvements, consistent spacing

---

## Verification Checklist

After all phases are complete:

- [ ] `npm run build` — zero errors
- [ ] All 12 routes render without console errors
- [ ] Dark and light themes both work on all new components
- [ ] Zustand persistence survives page reload (v5→v6 migration works)
- [ ] No infinite re-render loops
- [ ] Grammar drill wrong answer → "Here's why" panel with explanation + examples
- [ ] Vocab card Again → learning tip shown
- [ ] Mixed session interleaves vocab + grammar + comprehension
- [ ] Confidence prompt appears before card reveal in mixed session
- [ ] Dashboard shows confidence calibration after 10+ entries
- [ ] Mistake Journal groups errors by grammar pattern
- [ ] Static users see no login prompt, no gamification extras
- [ ] Enhanced users see XP, streak freezes, daily challenges
- [ ] Owner can invite/remove users in admin panel
- [ ] Telemetry events appear in admin dashboard for enhanced+ users
- [ ] Export/import still works alongside new features

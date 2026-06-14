/**
 * Cikgu Maya Expert System Knowledge Base
 * Comprehensive rule-based Malay grammar + IGCSE knowledge.
 * No AI required — provides rich, structured answers for all common student questions.
 */

// ── Topic Categories ─────────────────────────────────────────

export const TOPICS = {
  IMBUHAN: 'imbuhan',
  TATABAHASA: 'tatabahasa',
  KOSA_KATA: 'kosa_kata',
  PENULISAN: 'penulisan',
  LISAN: 'lisan',
  PERIBAHASA: 'peribahasa',
  EXAM_TIPS: 'exam_tips',
}

// ── Knowledge Entries ────────────────────────────────────────
// Each entry has: id, topic, keywords (for matching), question patterns,
// answer (rich text), examples, and related entries.

const KNOWLEDGE_BASE = [
  // ═══════════════════════════════════════════════
  // IMBUHAN (Affixes) — THE most tested IGCSE topic
  // ═══════════════════════════════════════════════
  {
    id: 'imbuhan-men',
    topic: TOPICS.IMBUHAN,
    title: 'Awalan meN- (Active Verb Prefix)',
    keywords: ['men-', 'mem-', 'meny-', 'meng-', 'menge-', 'me-', 'men', 'mem', 'meny', 'meng', 'active', 'prefix', 'awalan', 'nasal'],
    patterns: ['men-', 'how.*men', 'explain.*men', 'nasal', 'active verb', 'awalan me'],
    answer: `**meN-** is the most important active verb prefix in Malay. It changes based on the first letter of the root word (nasal assimilation rules):

**Rules:**
- **me-** before l, r, w, y, m, n, ng, ny → melawan, merawat, mewarnai
- **mem-** before b, f, v → membaca, memfoto, memveto
- **mem- (p drops)** before p → **memukul** (NOT ❌ mempukul; p→m: pukul→memukul)
- **men-** before d, c, j, z → mendapat, mencari, menjadi
- **men- (t drops)** before t → menulis (tulis→menulis)
- **meny- (s drops)** before s → menyapu (sapu→menyapu)
- **meng-** before vowels, g, h, k → mengambil, menggali, menghitung
- **meng- (k drops)** before k → mengira (kira→mengira)
- **menge-** for single-syllable roots → mengecat, mengelap

**Quick Memory Trick:** "**P T S K** drop their letters" → memukul, menulis, menyapu, mengira`,
    examples: [
      { root: 'tulis', derived: 'menulis', meaning: 'to write' },
      { root: 'baca', derived: 'membaca', meaning: 'to read' },
      { root: 'sapu', derived: 'menyapu', meaning: 'to sweep' },
      { root: 'kira', derived: 'mengira', meaning: 'to count' },
      { root: 'ambil', derived: 'mengambil', meaning: 'to take' },
      { root: 'cari', derived: 'mencari', meaning: 'to search' },
      { root: 'pukul', derived: 'memukul', meaning: 'to hit' },
      { root: 'dapat', derived: 'mendapat', meaning: 'to get' },
    ],
    related: ['imbuhan-pen', 'imbuhan-di', 'imbuhan-passive'],
  },

  {
    id: 'imbuhan-ber',
    topic: TOPICS.IMBUHAN,
    title: 'Awalan ber- (Intransitive/State Prefix)',
    keywords: ['ber-', 'ber', 'bel-', 'be-', 'intransitive', 'state prefix'],
    patterns: ['ber-', 'how.*ber', 'explain.*ber', 'what.*ber'],
    answer: `**ber-** indicates a state, possession, or intransitive action (no direct object needed):

**Meanings:**
1. **Having/possessing:** berkereta (having a car), beranak (having children)
2. **Doing an activity:** bermain (playing), berjalan (walking)
3. **Wearing:** berbaju (wearing a shirt), bertopi (wearing a hat)
4. **Producing sound/result:** berbunyi (making sound), bercahaya (shining)
5. **Reciprocal:** berjumpa (meeting each other), berkenalan (getting to know each other)

**Variations:**
- **ber-** → standard: bermain, berjalan
- **bel-** → before "ajar": belajar (NOT berajar)
- **be-** → when the root starts with **r** (renang → berenang), or its first syllable ends in **-er** (kerja → bekerja, NOT berkerja)

**Common mistakes:**
- ❌ "berkerja" → ✅ "bekerja"
- ❌ "berajar" → ✅ "belajar"
- ❌ "bermain main" → ✅ "bermain-main" (use hyphen for repetition)`,
    examples: [
      { root: 'main', derived: 'bermain', meaning: 'to play' },
      { root: 'jalan', derived: 'berjalan', meaning: 'to walk' },
      { root: 'kerja', derived: 'bekerja', meaning: 'to work' },
      { root: 'ajar', derived: 'belajar', meaning: 'to study/learn' },
      { root: 'cakap', derived: 'bercakap', meaning: 'to speak/chat' },
    ],
    related: ['imbuhan-men', 'imbuhan-ter'],
  },

  {
    id: 'imbuhan-di',
    topic: TOPICS.IMBUHAN,
    title: 'Awalan di- (Passive Voice Prefix)',
    keywords: ['di-', 'passive', 'pasif', 'ayat pasif', 'passive voice'],
    patterns: ['di-', 'passive', 'pasif', 'how.*passive', 'ayat pasif'],
    answer: `**di-** creates passive voice (the subject receives the action):

**Active → Passive:**
- Ali **menulis** surat → Surat **ditulis** oleh Ali
- (Ali writes a letter → The letter is written by Ali)

**Rules:**
- Simply replace meN- with di-: menulis → ditulis, membaca → dibaca
- The root word stays the same: tulis → ditulis (NOT ditulisi)
- Use **oleh** to indicate who does the action: ditulis **oleh** Ali

**When to use passive:**
- When the object is more important than the subject
- In formal writing and reports
- When the doer is unknown: "Pintu itu **dikunci**" (The door was locked)

**IGCSE tip:** Using both active and passive voice in essays shows grammatical range and gets higher marks!

**Common patterns:**
- ditulis (written), dibaca (read), dimakan (eaten)
- dipukul (hit), dicari (searched), dijual (sold)
- dimasak (cooked), dibeli (bought), dihantar (sent)`,
    examples: [
      { root: 'tulis', derived: 'ditulis', meaning: 'written (by someone)' },
      { root: 'baca', derived: 'dibaca', meaning: 'read (by someone)' },
      { root: 'makan', derived: 'dimakan', meaning: 'eaten (by someone)' },
      { root: 'beli', derived: 'dibeli', meaning: 'bought (by someone)' },
    ],
    related: ['imbuhan-men', 'imbuhan-passive'],
  },

  {
    id: 'imbuhan-ter',
    topic: TOPICS.IMBUHAN,
    title: 'Awalan ter- (Superlative/Accidental Prefix)',
    keywords: ['ter-', 'ter', 'superlative', 'accidental', 'most', 'paling'],
    patterns: ['ter-', 'how.*ter', 'superlative', 'most.*malay', 'accidental'],
    answer: `**ter-** has multiple important meanings:

**1. Superlative (most/the -est):**
- terbesar = the biggest (besar = big)
- tercantik = the most beautiful
- terpandai = the smartest

**2. Accidental/unintentional action:**
- terjatuh = fell (accidentally)
- tertidur = fell asleep (unintentionally)
- terlupa = forgot (accidentally)

**3. Ability (can be done):**
- termakan = edible / able to be eaten
- terlihat = visible / can be seen

**4. Already in a state:**
- terbuka = (already) open
- tertutup = (already) closed
- terkunci = (already) locked

**IGCSE tip:** Using "ter-" for superlative is more formal than "paling". Both are correct:
- **terbesar** = **paling besar** (both mean "the biggest")
- For essays, mixing both shows vocabulary range!`,
    examples: [
      { root: 'besar', derived: 'terbesar', meaning: 'the biggest' },
      { root: 'jatuh', derived: 'terjatuh', meaning: 'fell accidentally' },
      { root: 'tidur', derived: 'tertidur', meaning: 'fell asleep (unintentional)' },
      { root: 'buka', derived: 'terbuka', meaning: 'open (state)' },
    ],
    related: ['imbuhan-ber', 'imbuhan-di'],
  },

  {
    id: 'imbuhan-pen',
    topic: TOPICS.IMBUHAN,
    title: 'Awalan peN- (Noun/Agent Prefix)',
    keywords: ['pen-', 'pem-', 'peny-', 'peng-', 'penge-', 'pe-', 'noun prefix', 'agent', 'doer'],
    patterns: ['pen-', 'pe-', 'pem-', 'peng-', 'noun.*prefix', 'doer', 'agent prefix'],
    answer: `**peN-** creates nouns from verbs — usually meaning "the person who does" or "the tool for doing":

**Same nasal rules as meN-:**
- pe- before l, r, w, y, m, n → pelawan, perawat
- pem- before b, f → pembaca (reader), pemfoto
- pem- (p drops) before p → pemukul (hitter/bat)
- pen- before d, c, j → pendapat, pencari, penjual (seller, from jual)
- pen- (t drops) before t → penulis (writer, from tulis)
- peny- (s drops) before s → penyapu (sweeper, from sapu)
- peng- before vowels, g, h → pengambil, penggali
- peng- (k drops) before k → pengira (counter, from kira)
- penge- for single syllables → pengecat (painter)

**meN- vs peN-:**
| meN- (verb) | peN- (noun) |
|---|---|
| menulis (to write) | penulis (writer) |
| membaca (to read) | pembaca (reader) |
| mengajar (to teach) | pengajar (teacher) |
| menyapu (to sweep) | penyapu (sweeper/broom) |

**Memory trick:** meN- = the ACTION, peN- = the PERSON/THING doing it`,
    examples: [
      { root: 'tulis', derived: 'penulis', meaning: 'writer' },
      { root: 'baca', derived: 'pembaca', meaning: 'reader' },
      { root: 'ajar', derived: 'pengajar', meaning: 'teacher' },
      { root: 'sapu', derived: 'penyapu', meaning: 'sweeper/broom' },
    ],
    related: ['imbuhan-men', 'imbuhan-an'],
  },

  {
    id: 'imbuhan-kan',
    topic: TOPICS.IMBUHAN,
    title: 'Akhiran -kan (Causative/Benefactive Suffix)',
    keywords: ['-kan', 'kan', 'suffix', 'akhiran', 'causative', 'benefactive'],
    patterns: ['-kan', 'suffix.*kan', 'akhiran.*kan', 'when.*-kan', 'how.*-kan'],
    answer: `**-kan** is a suffix that usually means "to cause/make something happen" or "to do something for someone":

**Meanings:**
1. **Causative (make it happen):**
   - besar → membesarkan (to enlarge/raise)
   - tinggi → meninggikan (to raise/heighten)
   - jatuh → menjatuhkan (to drop something)

2. **Benefactive (do for someone):**
   - beli → membelikan (to buy for someone)
   - masak → memasakkan (to cook for someone)
   - ambil → mengambilkan (to take for someone)

3. **Directional:**
   - masuk → memasukkan (to put IN)
   - keluar → mengeluarkan (to take OUT)
   - naik → menaikkan (to raise UP)

**-kan vs -i:**
- **-kan** = action directed AT/FOR something/someone → membersihkan rumah
- **-i** = action directed ON/UPON a surface → membersih**i** lantai

**IGCSE tip:** Using -kan correctly in essays shows advanced grammar!`,
    examples: [
      { root: 'besar', derived: 'membesarkan', meaning: 'to enlarge/raise' },
      { root: 'masuk', derived: 'memasukkan', meaning: 'to insert/put in' },
      { root: 'beli', derived: 'membelikan', meaning: 'to buy for someone' },
      { root: 'bersih', derived: 'membersihkan', meaning: 'to clean (something)' },
    ],
    related: ['imbuhan-i', 'imbuhan-an'],
  },

  {
    id: 'imbuhan-i',
    topic: TOPICS.IMBUHAN,
    title: 'Akhiran -i (Locative/Repetitive Suffix)',
    keywords: ['-i', 'suffix i', 'akhiran i', 'locative'],
    patterns: ['-i$', 'suffix.*-i', 'akhiran.*-i', 'difference.*-kan.*-i', '-i vs -kan'],
    answer: `**-i** is a suffix meaning "to do something repeatedly/on a surface/location":

**Meanings:**
1. **Locative (on a surface/location):**
   - duduk → menduduki (to sit ON/occupy)
   - naik → menaiki (to ride/climb ON)
   - tinggal → meninggali → mendiami (to inhabit)

2. **Repetitive/intensive:**
   - pukul → memukuli (to hit repeatedly)
   - cium → menciumi (to kiss repeatedly)

3. **Emotional/feeling:**
   - kasih → mengasihi (to love)
   - sayang → menyayangi (to cherish)
   - harga → menghargai (to appreciate)

**-kan vs -i comparison:**
| -kan (for/at) | -i (on/upon) |
|---|---|
| membersih**kan** bilik (clean the room) | membersih**i** lantai (clean the floor surface) |
| menghantar**kan** surat (send a letter) | menghadiri (attend) |
| menjatuh**kan** bola (drop the ball) | menaiki bas (ride the bus) |`,
    examples: [
      { root: 'naik', derived: 'menaiki', meaning: 'to ride/board' },
      { root: 'kasih', derived: 'mengasihi', meaning: 'to love' },
      { root: 'harga', derived: 'menghargai', meaning: 'to appreciate' },
      { root: 'duduk', derived: 'menduduki', meaning: 'to occupy/sit on' },
    ],
    related: ['imbuhan-kan', 'imbuhan-men'],
  },

  {
    id: 'imbuhan-an',
    topic: TOPICS.IMBUHAN,
    title: 'Akhiran -an (Noun Suffix)',
    keywords: ['-an', 'suffix an', 'akhiran an', 'noun suffix'],
    patterns: ['-an', 'suffix.*an', 'akhiran.*an', 'noun.*suffix'],
    answer: `**-an** turns verbs/adjectives into nouns:

**Patterns:**
1. **Result of action:** tulis → tulisan (writing/composition)
2. **Place:** kubur → kuburan (cemetery/burial place)
3. **Collection/abstract:** makan → makanan (food), minum → minuman (drink)
4. **Instrument:** timbang → timbangan (weighing scale)

**Combined with peN- (peN-...-an):**
- peN- + root + -an = abstract noun
- pendidikan (education), penerbangan (flight), pembelajaran (learning)

**Combined with peR- (per-...-an):**
- per- + root + -an = the noun of a ber- verb (don't confuse with peN-)
- perjalanan (journey, from berjalan), permainan (game, from bermain), pertandingan (competition, from bertanding)

**Common IGCSE vocabulary with -an:**
- makanan (food), minuman (drink), pakaian (clothing)
- bacaan (reading material), tulisan (writing)
- pelajaran (lesson), perjalanan (journey)
- keputusan (decision), kesihatan (health)

**With ke-...-an (abstract nouns):**
- ke + besar + an = kebesaran (greatness)
- ke + indah + an = keindahan (beauty)
- ke + selamat + an = keselamatan (safety)`,
    examples: [
      { root: 'tulis', derived: 'tulisan', meaning: 'writing/composition' },
      { root: 'makan', derived: 'makanan', meaning: 'food' },
      { root: 'didik', derived: 'pendidikan', meaning: 'education' },
      { root: 'selamat', derived: 'keselamatan', meaning: 'safety' },
    ],
    related: ['imbuhan-pen', 'imbuhan-ke-an'],
  },

  {
    id: 'imbuhan-ke-an',
    topic: TOPICS.IMBUHAN,
    title: 'Apitan ke-...-an (Abstract Noun Circumfix)',
    keywords: ['ke-an', 'ke...an', 'ke-…-an', 'circumfix', 'circumfix ke', 'apitan', 'abstract noun'],
    patterns: ['ke.*an', 'abstract.*noun', 'circumfix', 'circumfix.*word', 'circumfix.*example', 'apitan'],
    answer: `**ke-...-an** wraps around a root word to create abstract nouns:

**From adjectives → abstract qualities:**
- cantik → kecantikan (beauty)
- baik → kebaikan (goodness/kindness)
- susah → kesusahan (difficulty/hardship)
- gembira → kegembiraan (happiness)

**From nouns → states/conditions:**
- raja → kerajaan (kingdom/government)
- tuhan → ketuhanan (divinity)
- budaya → kebudayaan (culture)

**From verbs → events/conditions:**
- mati → kematian (death)
- datang → kedatangan (arrival)
- hilang → kehilangan (loss)

**Common IGCSE ke-...-an words:**
- keselamatan (safety), kesihatan (health)
- keindahan (beauty), kebersihan (cleanliness)
- kemajuan (progress), kemudahan (convenience)
- kerajaan (government), kejayaan (success)
- kehidupan (life), kegembiraan (joy)`,
    examples: [
      { root: 'cantik', derived: 'kecantikan', meaning: 'beauty' },
      { root: 'sihat', derived: 'kesihatan', meaning: 'health' },
      { root: 'raja', derived: 'kerajaan', meaning: 'kingdom/government' },
      { root: 'hidup', derived: 'kehidupan', meaning: 'life' },
    ],
    related: ['imbuhan-an', 'imbuhan-pen'],
  },

  {
    id: 'imbuhan-se',
    topic: TOPICS.IMBUHAN,
    title: 'Awalan se- (One/Same/As...as Prefix)',
    keywords: ['se-', 'se', 'one', 'same', 'as...as', 'comparison'],
    patterns: ['se-', 'same.*prefix', 'comparison.*malay', 'as.*as'],
    answer: `**se-** means "one", "the same", or "as...as":

**Meanings:**
1. **One/a single:** sehari (one day), seorang (one person), sebuah (one unit)
2. **The same:** sekeluarga (one family/same family), sekampung (one/same village)
3. **As...as (comparison):** secantik (as beautiful as), setinggi (as tall as)
4. **The whole/entire:** sedunia (the whole world), seluruh (the whole/entire)
5. **After/upon:** selepas (after), sesudah (after), setiba (upon arriving)

**Common se- words for IGCSE:**
- **Time:** sehari (a day), seminggu (a week), setahun (a year)
- **Quantity:** sedikit (a little), sebanyak (as many as)
- **Comparison:** secantik (as beautiful as), sepandai (as smart as)
- **Totality:** semua (all), seluruh (entire), setiap (every)
- **Temporal:** sebelum (before), selepas (after), semasa (during)`,
    examples: [
      { root: 'hari', derived: 'sehari', meaning: 'one day' },
      { root: 'cantik', derived: 'secantik', meaning: 'as beautiful as' },
      { root: 'lepas', derived: 'selepas', meaning: 'after' },
      { root: 'orang', derived: 'seorang', meaning: 'one person' },
    ],
    related: ['imbuhan-ber', 'imbuhan-ke-an'],
  },

  // ═══════════════════════════════════════════════
  // TATABAHASA (Grammar)
  // ═══════════════════════════════════════════════
  {
    id: 'tense-markers',
    topic: TOPICS.TATABAHASA,
    title: 'Tense Markers (Penanda Masa)',
    keywords: ['tense', 'telah', 'sudah', 'sedang', 'akan', 'belum', 'masih', 'past', 'present', 'future', 'penanda masa'],
    patterns: ['tense', 'telah', 'sudah', 'sedang', 'akan', 'belum', 'past.*tense', 'future.*tense', 'time.*marker'],
    answer: `Malay doesn't change verb forms for tense — instead, **time markers** are placed before the verb:

**Past (sudah/telah):**
- **sudah** (informal/spoken): Saya **sudah** makan. (I have eaten.)
- **telah** (formal/written): Dia **telah** menulis surat itu. (She has written the letter.)
- For IGCSE essays, use **telah** — it's more formal and scores higher.

**Present continuous (sedang/tengah):**
- **sedang** (formal): Mereka **sedang** bermain. (They are playing.)
- **tengah** (informal): Dia **tengah** makan. (He is eating.)

**Future (akan):**
- Saya **akan** pergi esok. (I will go tomorrow.)

**Not yet (belum):**
- Dia **belum** tiba. (He hasn't arrived yet.)

**Still (masih):**
- Adik **masih** tidur. (Little brother is still sleeping.)

**IGCSE essay tip:** Varying tense markers shows grammatical range:
"Tahun lalu, saya **telah** melawat Melaka. Sekarang, saya **sedang** merancang perjalanan ke Langkawi. Tahun depan, saya **akan** pergi ke Sabah."`,
    examples: [
      { root: 'Saya sudah makan', derived: '', meaning: 'I have eaten (informal)' },
      { root: 'Dia telah menulis', derived: '', meaning: 'She has written (formal)' },
      { root: 'Mereka sedang bermain', derived: '', meaning: 'They are playing' },
      { root: 'Saya akan pergi', derived: '', meaning: 'I will go' },
      { root: 'Dia belum tiba', derived: '', meaning: 'He has not arrived yet' },
    ],
    related: ['kata-hubung', 'penulisan-essay'],
  },

  {
    id: 'kata-hubung',
    topic: TOPICS.TATABAHASA,
    title: 'Kata Hubung (Connectors/Conjunctions)',
    keywords: ['kata hubung', 'connector', 'conjunction', 'kerana', 'tetapi', 'walaupun', 'supaya', 'malah', 'linking words'],
    patterns: ['kata hubung', 'connector', 'conjunction', 'linking.*word', 'kerana', 'tetapi', 'walaupun'],
    answer: `**Kata hubung** (connectors) join ideas and are ESSENTIAL for high IGCSE marks:

**Cause/Reason:**
- **kerana / sebab** = because: Dia tidak datang **kerana** sakit.
- **oleh sebab** = because of: **Oleh sebab** hujan, kami tidak pergi.

**Contrast:**
- **tetapi** = but: Saya suka teh **tetapi** tidak suka kopi.
- **walaupun / meskipun** = although: **Walaupun** penat, dia terus belajar.
- **namun / walau bagaimanapun** = however/nevertheless

**Addition:**
- **dan** = and, **serta** = as well as, **malah** = moreover/in fact
- **selain itu** = besides that, **tambahan pula** = furthermore

**Purpose:**
- **supaya / agar** = so that: Dia belajar keras **supaya** lulus.
- **untuk** = in order to

**Sequence:**
- **kemudian** = then, **selepas itu** = after that
- **seterusnya** = next, **akhirnya** = finally

**IGCSE must-use list (aim for 5+ different kata hubung per essay):**
kerana, tetapi, walaupun, selain itu, oleh itu, supaya, namun, sementara itu`,
    examples: [
      { root: 'kerana', derived: 'Dia menangis kerana sedih.', meaning: 'She cried because she was sad.' },
      { root: 'tetapi', derived: 'Dia pandai tetapi malas.', meaning: 'He is smart but lazy.' },
      { root: 'walaupun', derived: 'Walaupun hujan, saya pergi.', meaning: 'Although it rained, I went.' },
      { root: 'supaya', derived: 'Belajar supaya berjaya.', meaning: 'Study so that you succeed.' },
    ],
    related: ['tense-markers', 'penulisan-essay', 'ayat-majmuk'],
  },

  {
    id: 'ayat-aktif-pasif',
    topic: TOPICS.TATABAHASA,
    title: 'Ayat Aktif & Pasif (Active & Passive Voice)',
    keywords: ['aktif', 'pasif', 'active voice', 'passive voice', 'ayat aktif', 'ayat pasif', 'oleh'],
    patterns: ['active.*passive', 'passive.*voice', 'ayat aktif', 'ayat pasif', 'transform.*passive'],
    answer: `**Converting between active and passive voice:**

**Active (Ayat Aktif):** Subject does the action → uses **meN-**
**Passive (Ayat Pasif):** Subject receives the action → uses **di-** or pronoun

**Type 1 — di- passive (3rd person/named doer):**
- Active: **Ali membaca** buku itu.
- Passive: Buku itu **dibaca oleh Ali**.
- Formula: Object + di-verb + oleh + Subject

**Type 2 — Pronoun passive (1st/2nd person):**
- Active: **Saya menulis** surat itu.
- Passive: Surat itu **saya tulis**. (NO meN-, NO di-)
- Active: **Awak memotong** kek itu.
- Passive: Kek itu **awak potong**.
- Formula: Object + pronoun + root verb

**Pronouns for Type 2:** saya, aku, kami, kita, awak, kamu, engkau

**IGCSE tip:** Examiners look for BOTH active and passive in essays. Practice converting sentences both ways!`,
    examples: [
      { root: 'Ali menulis surat.', derived: 'Surat ditulis oleh Ali.', meaning: 'The letter is written by Ali.' },
      { root: 'Saya membaca buku.', derived: 'Buku itu saya baca.', meaning: 'The book was read by me.' },
      { root: 'Ibu memasak nasi.', derived: 'Nasi dimasak oleh ibu.', meaning: 'Rice is cooked by mother.' },
    ],
    related: ['imbuhan-di', 'imbuhan-men', 'ayat-majmuk'],
  },

  {
    id: 'ayat-majmuk',
    topic: TOPICS.TATABAHASA,
    title: 'Ayat Majmuk (Compound/Complex Sentences)',
    keywords: ['ayat majmuk', 'compound sentence', 'complex sentence', 'ayat tunggal', 'simple sentence'],
    patterns: ['ayat majmuk', 'compound', 'complex.*sentence', 'ayat tunggal', 'sentence structure'],
    answer: `**Ayat Tunggal** = Simple sentence (1 subject + 1 predicate):
- Ali bermain bola.

**Ayat Majmuk Gabungan** = Compound sentence (joined by coordinating conjunctions):
- Ali bermain bola **dan** Ahmad membaca buku.
- Connectors: dan, atau, tetapi, serta, malah

**Ayat Majmuk Pancangan** = Complex sentence (with subordinate clause):
- Ali bermain bola **kerana** dia suka sukan.
- Connectors: kerana, walaupun, supaya, apabila, jika, semasa, sebelum, selepas

**Ayat Majmuk Campuran** = Mixed (combination):
- Ali bermain bola **dan** Ahmad membaca buku **kerana** mereka suka aktiviti itu.

**IGCSE Writing tip:**
- Band 1-2: Mostly ayat tunggal
- Band 3-4: Mix of tunggal and majmuk gabungan
- Band 5-6: Varied ayat majmuk pancangan and campuran

**Formula for high marks:** Start with a complex opener:
"**Walaupun** cuaca panas, kami tetap pergi ke pantai **kerana** sudah lama merancang percutian itu."`,
    examples: [
      { root: 'Ayat tunggal', derived: 'Ali bermain bola.', meaning: 'Simple sentence' },
      { root: 'Ayat majmuk gabungan', derived: 'Ali bermain dan Ahmad membaca.', meaning: 'Compound sentence' },
      { root: 'Ayat majmuk pancangan', derived: 'Ali bermain kerana dia suka sukan.', meaning: 'Complex sentence' },
    ],
    related: ['kata-hubung', 'penulisan-essay'],
  },

  {
    id: 'kata-sendi',
    topic: TOPICS.TATABAHASA,
    title: 'Kata Sendi (Prepositions)',
    keywords: ['kata sendi', 'preposition', 'prepositions', 'di', 'ke', 'dari', 'daripada', 'pada', 'untuk', 'dengan', 'oleh'],
    patterns: ['kata sendi', 'preposition', 'di vs ke', 'dari vs daripada', 'dari.*daripada', 'difference.*daripada', 'when.*(dari|daripada)'],
    answer: `**Kata Sendi** (prepositions) show location, direction, time, and purpose:

**Location (where):**
- **di** = at/in (static): Dia **di** rumah. (He is at home.)
- **di atas** = on top of, **di bawah** = below, **di antara** = between

**Direction (where to/from):**
- **ke** = to: Saya pergi **ke** sekolah.
- **dari** = from (places): Dia datang **dari** Johor.
- **daripada** = from (people/comparisons): Hadiah **daripada** ibu.

**IMPORTANT: dari vs daripada:**
- **dari** = from a PLACE: dari Kuala Lumpur, dari sekolah
- **daripada** = from a PERSON or for COMPARISON: daripada Ali, lebih besar daripada

**Other important ones:**
- **pada** = at/on (time): **Pada** hari Isnin
- **untuk** = for: Ini **untuk** awak.
- **dengan** = with: Pergi **dengan** kawan.
- **oleh** = by: Ditulis **oleh** Ali.
- **tentang** = about: Buku **tentang** sains.
- **sejak** = since: **Sejak** tahun lalu.`,
    examples: [
      { root: 'di', derived: 'Dia di sekolah.', meaning: 'He is at school.' },
      { root: 'ke', derived: 'Saya pergi ke pasar.', meaning: 'I go to the market.' },
      { root: 'dari', derived: 'Dia dari Melaka.', meaning: 'She is from Malacca.' },
      { root: 'daripada', derived: 'Hadiah daripada ibu.', meaning: 'A gift from mother.' },
    ],
    related: ['kata-hubung', 'tense-markers'],
  },

  {
    id: 'penjodoh-bilangan',
    topic: TOPICS.TATABAHASA,
    title: 'Penjodoh Bilangan (Classifiers/Counters)',
    keywords: ['penjodoh bilangan', 'penjodoh', 'bilangan', 'classifier', 'classifiers', 'counter', 'counting', 'measure word', 'orang', 'ekor', 'buah', 'batang', 'helai', 'biji'],
    patterns: ['penjodoh', 'penjodoh.*bilangan', 'classifier', 'counter', 'how.*count.*malay', 'count.*(people|animal|object)', 'which.*(orang|ekor|helai|buah)', 'orang.*ekor.*buah'],
    answer: `Malay uses **classifiers** (penjodoh bilangan) when counting — you can't just say "two cat":

**For people:**
- **orang**: seorang guru (a teacher), dua orang pelajar (two students)

**For animals:**
- **ekor**: seekor kucing (a cat), tiga ekor ikan (three fish)

**For large objects/buildings/countries:**
- **buah**: sebuah rumah (a house), dua buah negara (two countries)

**For long/thin objects:**
- **batang**: sebatang pen (a pen), dua batang sungai (two rivers)

**For flat/thin objects:**
- **helai**: sehelai kertas (a piece of paper), tiga helai baju (three shirts)

**For small/round objects:**
- **biji**: sebiji telur (an egg), dua biji bola (two balls)

**For books/volumes:**
- **buah/naskhah**: sebuah buku, senaskhah surat

**Others:**
- **keping** (flat pieces): sekeping roti
- **bilah** (bladed objects): sebilah pisau
- **pucuk** (letters): sepucuk surat
- **biji** (small round): sebiji epal

**IGCSE tip:** Using correct classifiers shows advanced Malay!`,
    examples: [
      { root: 'orang', derived: 'seorang doktor', meaning: 'a doctor (person)' },
      { root: 'ekor', derived: 'seekor kucing', meaning: 'a cat (animal)' },
      { root: 'buah', derived: 'sebuah kereta', meaning: 'a car (large object)' },
      { root: 'helai', derived: 'sehelai kertas', meaning: 'a piece of paper' },
    ],
    related: ['kata-sendi'],
  },

  {
    id: 'kata-ganda',
    topic: TOPICS.TATABAHASA,
    title: 'Kata Ganda (Reduplication / Word Doubling)',
    keywords: ['kata ganda', 'reduplication', 'reduplicated', 'penggandaan', 'penggandaan penuh', 'penggandaan separa', 'penggandaan berentak', 'kata ganda penuh', 'double word', 'warna-warni', 'lauk-pauk', 'word doubling'],
    patterns: ['kata ganda', 'reduplicat', 'penggandaan', 'double.*word', 'repeat.*word.*malay', 'word.*doubling'],
    answer: `**Kata ganda** = words formed by repeating a root, fully or partly. Malay has **three types**, and you must use a **hyphen** (write "buku-buku", NEVER "buku2").

**1. Penggandaan penuh (full reduplication)** — the whole word is repeated:
- buku → **buku-buku** (books), murid → **murid-murid** (students), kanak-kanak (children).

**2. Penggandaan separa (partial reduplication)** — only PART of the word repeats:
- laki → **lelaki** (man), daun → **dedaun** (leaves), jari → **jejari** (radius/fingers), tamu → **tetamu** (guests), pohon → **pepohon** (trees).

**3. Penggandaan berentak (rhythmic reduplication)** — repeated with a SOUND change:
- **warna-warni** (colourful), **lauk-pauk** (dishes), **gunung-ganang** (mountains), **kuih-muih** (kuih/cakes), **saudara-mara** (relatives), **gotong-royong** (communal work).

**What kata ganda DO (meanings):**
- **Plurality / many:** buku-buku, pelajar-pelajar.
- **Variety:** warna-warni, kuih-muih.
- **Resemblance / "-ish":** kemerah-merahan (reddish), kebudak-budakan (childish).
- **Repeated / continuous action:** berjalan-jalan (strolling), ketawa-ketawa.
- **Reciprocal (each other):** tolong-menolong (help one another), bantu-membantu, kejar-mengejar.

**IGCSE tip:** never use the number "2" shortcut in formal writing — always the full hyphenated form.`,
    examples: [
      { root: 'buku', derived: 'buku-buku', meaning: 'books (penggandaan penuh)' },
      { root: 'laki', derived: 'lelaki', meaning: 'man (penggandaan separa)' },
      { root: 'warna', derived: 'warna-warni', meaning: 'colourful (penggandaan berentak)' },
      { root: 'tolong', derived: 'tolong-menolong', meaning: 'help one another (reciprocal)' },
    ],
    related: ['imbuhan-an', 'common-mistakes'],
  },

  {
    id: 'golongan-kata',
    topic: TOPICS.TATABAHASA,
    title: 'Golongan Kata (Word Classes / Parts of Speech)',
    keywords: ['golongan kata', 'word class', 'word classes', 'parts of speech', 'jenis kata', 'kata nama', 'kata nama am', 'kata nama khas', 'common noun', 'proper noun', 'kata kerja', 'verb', 'kata adjektif', 'kata sifat', 'adjective', 'kata tugas', 'kata ganti nama', 'pronoun'],
    patterns: ['golongan kata', 'word class', 'part.*of speech', 'jenis kata', 'kata nama am', 'kata nama khas', 'kata nama.*khas', 'difference.*kata nama', 'common.*proper noun', 'kata kerja', 'kata adjektif'],
    answer: `Malay words fall into **four main golongan kata (word classes):**

**1. Kata Nama (nouns) — naming words:**
- **Kata nama am** = a common/general noun (things in general): budak, bandar, sungai, buku, sekolah.
- **Kata nama khas** = a proper noun (a specific name) — **always capitalised**: Ali, Kuala Lumpur, Sungai Pahang, Malaysia.
- **Kata ganti nama** = pronouns (stand in for a noun): saya, awak, dia, mereka, ini, itu.
- Quick contrast: **budak** (am) → **Ali** (khas); **bandar** (am) → **Kuala Lumpur** (khas).

**2. Kata Kerja (verbs) — action/state words:**
- **Transitif** = needs an object: membaca *buku*, makan *nasi*, menulis *surat*.
- **Tak transitif** = no object needed: berlari, tidur, menangis, berjalan.

**3. Kata Adjektif / Kata Sifat (adjectives) — describing words:**
- cantik, besar, pandai, merah, rajin. (e.g. "rumah yang **besar**")

**4. Kata Tugas (function words) — they do a grammatical "job":**
- **Kata hubung** (dan, tetapi, kerana), **kata sendi nama** (di, ke, dari), **kata bantu** (sudah, sedang, akan), **penjodoh bilangan** (orang, ekor, buah), **kata seru** (wah!, aduh!).

**IGCSE tip:** the most-tested split is **kata nama am vs khas** — remember khas = a specific NAME and is capitalised.`,
    examples: [
      { root: 'budak (am)', derived: 'Ali (khas)', meaning: 'common noun vs proper noun (capitalised)' },
      { root: 'kata kerja transitif', derived: 'membaca buku', meaning: 'verb that needs an object' },
      { root: 'kata kerja tak transitif', derived: 'berlari', meaning: 'verb with no object' },
      { root: 'kata adjektif', derived: 'cantik / besar', meaning: 'describing word' },
    ],
    related: ['kata-sendi', 'kata-hubung', 'penjodoh-bilangan'],
  },

  // ═══════════════════════════════════════════════
  // PENULISAN (Writing)
  // ═══════════════════════════════════════════════
  {
    id: 'penulisan-essay',
    topic: TOPICS.PENULISAN,
    title: 'IGCSE Essay Writing Tips (Paper 2)',
    keywords: ['essay', 'writing', 'paper 2', 'karangan', 'penulisan', 'composition'],
    patterns: ['essay', 'writing.*tip', 'paper 2', 'karangan', 'how.*write.*essay', 'composition'],
    answer: `**IGCSE Paper 2 Writing Tips:**

**Structure (5-paragraph format):**
1. **Pendahuluan** (Introduction) — Set the scene, state your main point
2. **Isi 1** (Point 1) — First main idea with examples
3. **Isi 2** (Point 2) — Second main idea with examples
4. **Isi 3** (Point 3) — Third main idea with examples
5. **Penutup** (Conclusion) — Summarize and give final thought

**High-scoring techniques:**
- Use **5+ different kata hubung**: kerana, tetapi, walaupun, selain itu, oleh itu
- Mix **active and passive** voice: menulis (active) + ditulis (passive)
- Include **ayat majmuk** (complex sentences)
- Use **peribahasa** (proverbs) — 1 or 2 per essay
- Vary sentence length: short + long
- Use **formal** language: telah (not sudah), kerana (not sebab)

**Opening templates:**
- "Pada pendapat saya, ... adalah perkara yang sangat penting kerana..."
- "Tidak dapat dinafikan bahawa ... memainkan peranan yang penting dalam..."
- "Dewasa ini, isu ... semakin mendapat perhatian masyarakat."

**Closing templates:**
- "Kesimpulannya, ... haruslah diberi perhatian yang sewajarnya."
- "Sebagai penutup, marilah kita sama-sama ..."
- "Oleh yang demikian, adalah penting bagi kita untuk ..."

**Word count:** Aim for 200-300 words (IGCSE standard).`,
    examples: [],
    related: ['kata-hubung', 'ayat-majmuk', 'peribahasa'],
  },

  {
    id: 'formal-vs-informal',
    topic: TOPICS.PENULISAN,
    title: 'Formal vs Informal Malay',
    keywords: ['formal', 'informal', 'bahasa baku', 'slang', 'colloquial', 'spoken', 'written'],
    patterns: ['formal.*informal', 'bahasa baku', 'spoken.*written', 'slang', 'colloquial'],
    answer: `**For IGCSE, always use FORMAL Malay (Bahasa Baku) in writing:**

| Informal (spoken) | Formal (written/IGCSE) |
|---|---|
| tak / x | tidak |
| nak | hendak / ingin |
| dah | sudah / telah |
| kat | di / pada |
| sebab | kerana |
| macam mana | bagaimana |
| kenapa | mengapa |
| cakap | berkata / bercakap |
| kena | perlu / mesti |
| best / bagus | sangat baik |
| awak / ko | anda / kamu (in essay) |
| lah, kan, eh | (remove particles) |

**Speaking (Paper 3) allows slightly less formal language**, but still avoid:
- Text speak: x, nk, dh, kt
- English words when Malay equivalent exists
- Excessive particles: lah, kan, eh

**IGCSE golden rule:** When in doubt, choose the longer, more Malay word. "hendak" over "nak", "kerana" over "sebab".`,
    examples: [
      { root: 'tak boleh', derived: 'tidak boleh', meaning: 'cannot (formal)' },
      { root: 'nak pergi', derived: 'hendak/ingin pergi', meaning: 'want to go (formal)' },
      { root: 'dah siap', derived: 'sudah/telah siap', meaning: 'already done (formal)' },
    ],
    related: ['penulisan-essay', 'lisan-paper3'],
  },

  {
    id: 'penulisan-rencana',
    topic: TOPICS.PENULISAN,
    title: 'Rencana / Article Structure (Paper 2)',
    keywords: ['rencana', 'article', 'artikel', 'rencana structure', 'article structure', 'structure rencana', 'format rencana', 'paragraph by paragraph', 'tulis rencana'],
    patterns: ['rencana', 'article', 'artikel', 'structure.*article', 'how.*structure.*rencana', 'format.*rencana', 'write.*article'],
    answer: `A **rencana** (article / expository essay) argues a point or explains an issue to readers. Build it paragraph by paragraph:

**1. Tajuk (Title)** — short, clear, states the issue. e.g. "Kepentingan Membaca dalam Kalangan Remaja".

**2. Pendahuluan (Introduction) — 1 paragraph:**
- Open with a hook: a statistic, a question, a peribahasa, or a current-issue statement ("Dewasa ini, …").
- State the topic and your stand/angle clearly.

**3. Isi (Body) — 3 to 4 paragraphs, ONE main idea each:**
- **Ayat topik** — state the main idea of the paragraph.
- **Huraian** — explain/develop it (why, how).
- **Contoh / bukti** — give a real example or evidence.
- Link with **penanda wacana**: "Selain itu,…", "Di samping itu,…", "Tambahan pula,…", "Oleh itu,…".
- Order ideas from strongest to weakest (or by theme).

**4. Kesimpulan / Penutup (Conclusion) — 1 paragraph:**
- Summarise the main points (do NOT add a new idea).
- End with a stand, a hope, or a call to action ("Kesimpulannya,…", "Oleh yang demikian,…").

**High-band tips:** vary sentence types (ayat majmuk), mix active + passive voice, use 5+ different penanda wacana, and slot in 1 peribahasa. Aim 200–300 words.`,
    examples: [
      { root: 'Pendahuluan', derived: '', meaning: 'introduce the issue + your stand' },
      { root: 'Isi (ayat topik + huraian + contoh)', derived: '', meaning: 'one main idea per body paragraph' },
      { root: 'Penanda wacana', derived: '', meaning: 'connectors that link ideas: selain itu, oleh itu' },
      { root: 'Kesimpulan', derived: '', meaning: 'summarise + stand / hope' },
    ],
    related: ['penulisan-essay', 'kata-hubung', 'peribahasa'],
  },

  {
    id: 'penulisan-laporan',
    topic: TOPICS.PENULISAN,
    title: 'Laporan / Report Structure (Paper 2)',
    keywords: ['laporan', 'report', 'write a report', 'laporan structure', 'report format', 'menulis laporan', 'tulis laporan'],
    patterns: ['laporan', 'report', 'how.*write.*report', 'structure.*report', 'format.*laporan'],
    answer: `A **laporan** (report) records what happened at an event or activity factually and in order. Structure it like this:

**1. Tajuk laporan (Title)** — name the activity + often the writer's role/club. e.g. "Laporan Hari Kantin Sekolah" or "Laporan Lawatan ke Zoo Negara".

**2. Pengenalan (Introduction):**
- State WHAT the activity was, WHEN (tarikh), WHERE (tempat), and WHO took part / organised it.
- Give the purpose (tujuan) of the activity.

**3. Isi / Kandungan (Body) — in chronological order:**
- Describe what happened step by step (acara/aktiviti) — use **past tense markers** (telah) and connectors of sequence ("Pada mulanya,…", "Seterusnya,…", "Selepas itu,…", "Akhirnya,…").
- Include facts: numbers attending, activities run, outcomes.

**4. Cadangan / Penambahbaikan (optional)** — suggest improvements for next time.

**5. Penutup (Conclusion):**
- State the overall outcome / success of the activity.
- **Sign off:** "Laporan disediakan oleh," then your **name** and **role/jawatan** (e.g. Setiausaha Kelab) on the next lines.

**Style:** formal, factual, mostly **past tense**, often uses **passive voice** ("Acara itu telah dirasmikan oleh…"). Keep opinions minimal — a report states facts.`,
    examples: [
      { root: 'Pengenalan', derived: '', meaning: 'what / when / where / who / purpose' },
      { root: 'Isi (kronologi)', derived: '', meaning: 'events in order, with facts' },
      { root: 'Penutup + tandatangan', derived: '', meaning: 'outcome + "Disediakan oleh" + name + role' },
    ],
    related: ['penulisan-essay', 'penulisan-rencana', 'kata-hubung'],
  },

  {
    id: 'penulisan-syarahan',
    topic: TOPICS.PENULISAN,
    title: 'Syarahan / Pidato (Speech) Structure (Paper 2)',
    keywords: ['syarahan', 'speech', 'pidato', 'ceramah', 'give a speech', 'syarahan structure', 'speech format', 'tulis syarahan'],
    patterns: ['syarahan', 'speech', 'pidato', 'ceramah', 'how.*write.*speech', 'structure.*speech', 'format.*syarahan'],
    answer: `A **syarahan** (speech / pidato) is written to be spoken aloud to an audience, so it must sound persuasive and address listeners directly.

**1. Kata aluan / Salam pembuka (Greeting & salutation):**
- Greet with "Assalamualaikum / Salam sejahtera," then acknowledge the audience in order of rank: "Yang dihormati Tuan Pengerusi Majlis, barisan hakim yang arif lagi bijaksana, guru-guru, serta rakan-rakan yang dikasihi sekalian."

**2. Pendahuluan (Introduction):**
- Announce the title/topic of your speech.
- Hook the audience: a question, a peribahasa, or a striking fact.

**3. Isi (Body) — 3 to 4 main points:**
- Each point = a clear argument + **huraian** + **contoh**.
- Use **rhetorical devices**: rhetorical questions ("Tepuk dada, tanya selera"), direct address ("Hadirin sekalian,…"), repetition for emphasis.
- Link with penanda wacana ("Selain itu,…", "Yang lebih penting,…").

**4. Penutup (Conclusion):**
- Summarise the key points.
- End with a strong **seruan / call to action** ("Marilah kita sama-sama…") + a hope.

**5. Salam penutup:** "Sekian, terima kasih. Wassalamualaikum / Salam sejahtera."

**Style:** energetic, persuasive, second-person address (audience), formal Malay throughout.`,
    examples: [
      { root: 'Kata aluan', derived: '', meaning: 'greet + address the audience by rank' },
      { root: 'Isi + retorik', derived: '', meaning: 'arguments with rhetorical questions / direct address' },
      { root: 'Penutup (seruan)', derived: '', meaning: 'call to action + closing salam' },
    ],
    related: ['penulisan-essay', 'lisan-paper3', 'kata-hubung'],
  },

  // ═══════════════════════════════════════════════
  // LISAN (Speaking / Paper 3)
  // ═══════════════════════════════════════════════
  {
    id: 'lisan-paper3',
    topic: TOPICS.LISAN,
    title: 'Paper 3 Speaking Tips',
    keywords: ['paper 3', 'speaking', 'lisan', 'oral', 'exam', 'pertuturan'],
    patterns: ['paper 3', 'speaking', 'lisan', 'oral.*exam', 'oral.*tips', 'prepare.*speaking'],
    answer: `**IGCSE Paper 3 Speaking — How to Score Well:**

**The exam format (about 10 minutes, plus 10 minutes' preparation; 40 marks):**
- **One role play** (about 2 minutes) — respond to FIVE transactional questions to complete a task (e.g. buy something, ask for help)
- **Two topic conversations** (about 4 minutes each) — share your views, opinions and experiences on each given topic

**Key strategies:**

**1. Always greet the examiner politely:**
- "Selamat pagi/petang, Cikgu."

**2. Use imbuhan correctly — this is the #1 scoring criteria:**
- meN- for active verbs: saya **menulis**, dia **membeli**
- ber- for states: saya **bermain**, kami **berjumpa**

**3. Ask questions back:**
- "Cikgu, pada pendapat cikgu, bagaimana?"
- "Bolehkah saya bertanya satu soalan?"

**4. Use kata hubung to connect ideas:**
- "kerana...", "walaupun...", "selain itu..."

**5. Show range of vocabulary:**
- Don't repeat the same word — use synonyms
- Instead of "baik" always, use: "bagus", "elok", "cemerlang"

**6. If you don't understand, say:**
- "Maaf, bolehkah cikgu ulang soalan itu?"
- "Saya kurang faham. Boleh jelaskan?"

**7. Speak clearly and at a moderate pace.** Speed ≠ fluency.`,
    examples: [],
    related: ['formal-vs-informal', 'penulisan-essay'],
  },

  {
    id: 'lisan-roleplay-tips',
    topic: TOPICS.LISAN,
    title: 'Roleplay Scenario Strategies',
    keywords: ['roleplay', 'scenario', 'main peranan', 'conversation', 'situasi'],
    patterns: ['roleplay', 'scenario', 'main peranan', 'roleplay.*tip', 'how.*roleplay'],
    answer: `**Roleplay Scenario Strategies for Paper 3:**

**Common scenarios and key phrases:**

**1. Shopping / Buying:**
- "Berapa harganya?" (How much is it?)
- "Boleh kurangkan sedikit?" (Can you reduce the price?)
- "Saya nak beli..." (I want to buy...)
- "Ada diskaun?" (Is there a discount?)

**2. At a restaurant:**
- "Boleh saya lihat menu?" (May I see the menu?)
- "Saya nak order..." (I want to order...)
- "Berapa jumlah semuanya?" (How much is the total?)

**3. Asking for directions:**
- "Di mana ...?" (Where is ...?)
- "Bagaimana nak pergi ke ...?" (How do I get to ...?)
- "Berapa jauh dari sini?" (How far from here?)

**4. At the doctor/hospital:**
- "Saya berasa tidak sihat." (I feel unwell.)
- "Kepala saya sakit." (I have a headache.)
- "Sudah berapa lama?" (How long has it been?)

**5. Making a complaint:**
- "Saya ingin membuat aduan." (I want to make a complaint.)
- "Ini tidak memuaskan." (This is not satisfactory.)
- "Boleh tolong selesaikan?" (Can you help resolve this?)

**General tips:** Always be polite, use "terima kasih" and "tolong", show you understand by paraphrasing the examiner's words.`,
    examples: [],
    related: ['lisan-paper3', 'formal-vs-informal'],
  },

  // ═══════════════════════════════════════════════
  // PERIBAHASA (Proverbs)
  // ═══════════════════════════════════════════════
  {
    id: 'peribahasa',
    topic: TOPICS.PERIBAHASA,
    title: 'Peribahasa Bank — Meanings & Essay Themes',
    keywords: [
      'peribahasa', 'proverb', 'simpulan bahasa', 'idiom', 'saying', 'maksud peribahasa',
      'meaning of', 'apa maksud', 'bahasa kiasan',
      // distinctive anchor phrases of the proverbs in this bank (multi-word so they
      // only match when a student actually quotes the proverb — low false-positive risk)
      'aur dengan tebing', 'bagai aur', 'berat sama dipikul', 'ringan sama dijinjing',
      'bulat air kerana pembetung', 'sediakan payung sebelum hujan', 'sediakan payung',
      'melentur buluh', 'biarlah dari rebungnya', 'sikit-sikit lama-lama jadi bukit',
      'ada kemahuan', 'ada jalan', 'genggam bara api', 'hujan emas di negeri orang',
      'rajin pangkal pandai', 'usaha tangga kejayaan', 'bersatu teguh bercerai roboh',
      'bagai isi dengan kuku', 'tak kenal maka tak cinta', 'alah bisa tegal biasa',
      'mencurah air ke daun keladi',
    ],
    patterns: ['peribahasa', 'proverb', 'simpulan bahasa', 'idiom', 'malay.*saying', 'maksud.*peribahasa', 'meaning.*proverb'],
    answer: `**Peribahasa (Malay Proverbs) — meaning + literal image + which essay theme it fits.** Slip 1–2 into an essay (with quotation marks) to lift your band.

**Cooperation / unity (perpaduan, kerjasama, semangat masyarakat):**
- **"Bagai aur dengan tebing"** — literally the bamboo and the riverbank holding each other up → **mutual help and interdependence** (two parties supporting each other). *Theme:* unity, teamwork, community spirit, family.
- **"Berat sama dipikul, ringan sama dijinjing"** — the heavy is carried together, the light is held together → **sharing the load / teamwork**. *Theme:* cooperation, gotong-royong.
- **"Bulat air kerana pembetung, bulat manusia kerana muafakat"** — water rounds because of the channel, people unite because of consensus → **unity is reached through agreement**. *Theme:* perpaduan, muafakat.
- **"Bersatu teguh, bercerai roboh"** — united we are firm, divided we collapse → **strength in unity**. *Theme:* national unity, teamwork.

**Effort, perseverance & education (usaha, ketekunan, ilmu):**
- **"Genggam bara api biar sampai jadi arang"** — grip the ember until it turns to charcoal → **persevere through hardship until you succeed**. *Theme:* determination, resilience.
- **"Sikit-sikit, lama-lama jadi bukit"** — little by little eventually becomes a hill → **small consistent effort accumulates**. *Theme:* saving, hard work, study habits.
- **"Rajin pangkal pandai"** — diligence is the root of cleverness → **hard work leads to success**. *Theme:* education, effort.
- **"Usaha tangga kejayaan"** — effort is the ladder to success → **success requires effort**. *Theme:* ambition, achievement.
- **"Di mana ada kemahuan, di situ ada jalan"** — where there is a will, there is a way → **determination finds a way**. *Theme:* motivation, overcoming obstacles.
- **"Melentur buluh biarlah dari rebungnya"** — bend the bamboo while it is still a shoot → **shape good character / educate children from a young age**. *Theme:* upbringing, education, discipline.

**Caution & wisdom (sikap berhati-hati, kebijaksanaan):**
- **"Sediakan payung sebelum hujan"** — prepare the umbrella before the rain → **be ready before trouble comes** (better safe than sorry). *Theme:* planning, prevention, preparedness.
- **"Mencurah air ke daun keladi"** — pouring water onto a taro leaf (it rolls off) → **wasted, futile effort**. *Theme:* advice ignored, effort with no result.
- **"Alah bisa tegal biasa"** — difficulty is overcome by familiarity → **practice makes perfect**. *Theme:* skill, habit, perseverance.

**Relationships & belonging (kekeluargaan, kasih sayang, jati diri):**
- **"Bagai isi dengan kuku"** — like flesh and nail → **an extremely close, inseparable relationship**. *Theme:* friendship, family closeness.
- **"Tak kenal maka tak cinta"** — you cannot love what you do not know → **familiarity builds appreciation**. *Theme:* culture, heritage, getting to know something.
- **"Hujan emas di negeri orang, hujan batu di negeri sendiri, lebih baik di negeri sendiri"** — gold rain abroad, stone rain at home — home is still better → **there is no place like home / love of homeland**. *Theme:* patriotism, belonging.

**How to use one in an essay:**
"Seperti kata peribahasa Melayu, '*sediakan payung sebelum hujan*', kita haruslah bersedia untuk menghadapi sebarang cabaran."
(As the Malay proverb says, 'prepare the umbrella before the rain', we must be ready to face any challenge.)`,
    examples: [
      { root: 'Bagai aur dengan tebing', derived: '', meaning: 'mutual help / interdependence — unity & cooperation' },
      { root: 'Sediakan payung sebelum hujan', derived: '', meaning: 'be prepared before trouble — planning & prevention' },
      { root: 'Melentur buluh biarlah dari rebungnya', derived: '', meaning: 'educate from a young age — upbringing & education' },
      { root: 'Genggam bara api biar sampai jadi arang', derived: '', meaning: 'persevere through hardship — determination' },
      { root: 'Berat sama dipikul, ringan sama dijinjing', derived: '', meaning: 'share the load — teamwork' },
    ],
    related: ['penulisan-essay', 'penulisan-rencana'],
  },

  // ═══════════════════════════════════════════════
  // EXAM TIPS
  // ═══════════════════════════════════════════════
  {
    id: 'exam-paper1',
    topic: TOPICS.EXAM_TIPS,
    title: 'Paper 1 (Reading Comprehension) Tips',
    keywords: ['paper 1', 'reading', 'comprehension', 'kefahaman', 'reading comprehension'],
    patterns: ['paper 1', 'reading.*tip', 'comprehension.*tip', 'kefahaman'],
    answer: `**IGCSE Paper 1 — Reading Comprehension Tips:**

**Format:** 2-3 passages + questions (vocabulary, factual, inference, summary)

**Strategy:**
1. **Skim the passage first** (1 min) — get the gist
2. **Read questions** — know what to look for
3. **Re-read carefully** — find specific answers

**Question types and how to answer:**

**Vocabulary questions:** "Apakah maksud X dalam konteks petikan?"
- Look at the sentence around the word
- Don't give the dictionary meaning — give the CONTEXT meaning
- Answer in your own words

**Factual questions:** "Siapa/Apa/Di mana/Bila?"
- Answer is DIRECTLY in the text
- Quote relevant phrases
- Don't add your own interpretation

**Inference questions:** "Mengapa/Bagaimana/Pada pendapat anda?"
- Read between the lines
- Use evidence from text to support your answer
- Start with: "Pada pendapat saya..." or "Berdasarkan petikan..."

**Summary questions:**
- Identify the KEY points (usually 5-6)
- Write in YOUR OWN words — don't copy the passage
- Keep it concise — one sentence per point
- Use kata hubung to link points

**Common mistake:** Writing too much! Be precise and answer what's asked.`,
    examples: [],
    related: ['exam-paper2', 'exam-paper3'],
  },

  {
    id: 'exam-paper2',
    topic: TOPICS.EXAM_TIPS,
    title: 'Paper 2 (Writing) Exam Strategy',
    keywords: ['paper 2', 'writing exam', 'exam strategy', 'peperiksaan'],
    patterns: ['paper 2', 'writing.*exam', 'exam.*strategy.*writing', 'paper 2.*tip'],
    answer: `**IGCSE Paper 2 — Writing Exam Strategy:**

**Format:** Choose 1 topic from several options, write 200-300 words

**Time management (1 hour):**
- 5 min: Read all topics, choose the best one
- 10 min: Plan your essay (outline 5 paragraphs)
- 35 min: Write the essay
- 10 min: Proofread and correct

**Choosing a topic:**
- Pick the one where you know the most **vocabulary**
- Avoid topics where you'd need to use words you're unsure about
- Narrative (cerita) is often easiest if your grammar is weaker
- Argumentative (perbincangan) scores higher if your grammar is strong

**Proofreading checklist:**
- [ ] Every verb has correct imbuhan (meN-, ber-, di-)
- [ ] Used at least 5 different kata hubung
- [ ] Mixed active and passive voice
- [ ] Included 1-2 peribahasa
- [ ] Correct spelling (especially: perlu, bahawa, kecuali)
- [ ] Proper kata sendi (di vs ke vs dari vs daripada)
- [ ] Word count: 200-300

**Band 5-6 secret:** Read your essay aloud in your head. If it sounds choppy, add kata hubung. If it sounds repetitive, vary your vocabulary.`,
    examples: [],
    related: ['penulisan-essay', 'exam-paper1'],
  },

  {
    id: 'exam-paper3',
    topic: TOPICS.EXAM_TIPS,
    title: 'Paper 3 (Speaking) Exam Strategy',
    keywords: ['paper 3', 'speaking exam', 'oral exam', 'exam strategy speaking'],
    patterns: ['paper 3', 'speaking.*exam', 'oral.*exam.*strategy'],
    answer: `**IGCSE Paper 3 — Speaking Exam Strategy:**

**Format (about 10 minutes total + 10 minutes' preparation, 40 marks):**
- One role play: about 2 min — respond to FIVE transactional questions to complete a task
- Two topic conversations: about 4 min each — share views, opinions and experiences on each topic

**Before the exam:**
- Practice ALL scenario types (shopping, restaurant, travel, complaint, etc.)
- Prepare 3 topics you can talk about for 4 minutes each
- Record yourself speaking and listen back

**During role play:**
- Listen carefully to each prompt
- Respond with 2-3 sentences minimum per turn
- Always use polite language
- If stuck, ask for clarification: "Maaf, boleh ulang?"

**During each topic conversation:**
- Structure each answer: state your view → give 2-3 reasons → an example
- Use transition words: "Pertama...", "Kedua...", "Akhir sekali..."
- Make eye contact with the examiner
- Speak naturally — it's a conversation with the examiner, not a memorised speech

**Going deeper in the conversations:**
- Give EXTENDED answers, not just "ya" or "tidak"
- Always explain WHY: "Saya suka kerana..."
- Ask questions back to the examiner
- If you don't know a word, describe it: "benda untuk menulis" (thing for writing = pen)

**Scoring criteria (in order of importance):**
1. Imbuhan accuracy
2. Vocabulary range
3. Sentence structure
4. Fluency and pronunciation
5. Task completion`,
    examples: [],
    related: ['lisan-paper3', 'lisan-roleplay-tips'],
  },

  // ═══════════════════════════════════════════════
  // KOSA KATA (Vocabulary)
  // ═══════════════════════════════════════════════
  {
    id: 'vocab-keluarga',
    topic: TOPICS.KOSA_KATA,
    title: 'Family Vocabulary (Keluarga)',
    keywords: ['keluarga', 'family', 'ibu', 'bapa', 'adik', 'abang', 'kakak', 'datuk', 'nenek'],
    patterns: ['family', 'keluarga', 'family.*vocab', 'family.*member'],
    answer: `**Keluarga (Family) — Common IGCSE Vocabulary:**

**Immediate family:**
- ibu / emak = mother
- bapa / ayah = father
- ibu bapa = parents
- adik = younger sibling
- abang = older brother
- kakak = older sister
- adik lelaki = younger brother
- adik perempuan = younger sister
- anak = child (son/daughter)
- anak sulung = eldest child
- anak bongsu = youngest child

**Extended family:**
- datuk = grandfather
- nenek = grandmother
- bapa saudara / pak cik = uncle
- ibu saudara / mak cik = aunt
- sepupu = cousin
- anak saudara = nephew/niece
- cucu = grandchild

**In-laws:**
- mertua = parent-in-law
- menantu = son/daughter-in-law
- ipar = sibling-in-law

**IGCSE essay sentence examples:**
- "Keluarga saya terdiri daripada enam orang ahli."
- "Saya tinggal bersama ibu bapa dan dua orang adik."
- "Datuk dan nenek saya tinggal di kampung."`,
    examples: [],
    related: ['vocab-sekolah'],
  },

  {
    id: 'vocab-sekolah',
    topic: TOPICS.KOSA_KATA,
    title: 'School Vocabulary (Sekolah)',
    keywords: ['sekolah', 'school', 'pelajar', 'guru', 'kelas', 'mata pelajaran', 'education'],
    patterns: ['school', 'sekolah', 'school.*vocab', 'education.*vocab', 'mata pelajaran'],
    answer: `**Sekolah (School) — IGCSE Vocabulary:**

**People:**
- pelajar / murid = student
- guru / cikgu = teacher
- pengetua = principal
- rakan = friend/classmate

**Subjects (mata pelajaran):**
- Bahasa Melayu, Bahasa Inggeris, Matematik
- Sains, Sejarah, Geografi
- Pendidikan Jasmani = Physical Education
- Seni = Art

**Places:**
- bilik darjah / kelas = classroom
- perpustakaan = library
- makmal = laboratory
- padang = field
- kantin = canteen
- pejabat = office

**Activities:**
- belajar = to study, mengajar = to teach
- membaca = to read, menulis = to write
- peperiksaan = exam, kerja rumah = homework
- aktiviti kokurikulum = co-curricular activities
- sukan = sports, kelab = club

**Useful phrases:**
- "Sekolah saya terletak di..." (My school is located at...)
- "Mata pelajaran kegemaran saya ialah..." (My favourite subject is...)
- "Saya menyertai kelab..." (I joined the ... club)`,
    examples: [],
    related: ['vocab-keluarga'],
  },

  {
    id: 'vocab-formal-upgrade',
    topic: TOPICS.KOSA_KATA,
    title: 'Formal Word Upgrades (Sinonim Formal)',
    keywords: [
      'formal alternative', 'formal alternatives', 'formal synonym', 'synonym', 'sinonim',
      'formal word', 'better word', 'more formal', 'upgrade word', 'upgrade vocab',
      'formal vocabulary', 'register', 'higher-level word', 'banyak', 'baik', 'besar',
      'bagus', 'cantik', 'pandai',
    ],
    patterns: [
      'formal.*alternative', 'formal.*synonym', 'more formal.*word', 'better.*word',
      'synonym.*formal', 'upgrade.*(word|vocab)', 'formal.*version', 'replace.*banyak',
      'alternative.*(banyak|baik|besar)',
    ],
    answer: `Swapping basic, over-used words for **register-correct formal alternatives** is one of the fastest ways to lift an IGCSE band. Common upgrades:

**banyak (a lot / many):**
- **pelbagai** = various → "Sekolah menawarkan **pelbagai** aktiviti kokurikulum."
- **berbagai-bagai** = all sorts of → "Pasar itu menjual **berbagai-bagai** barangan."
- **sebilangan besar** = a large number of → "**Sebilangan besar** pelajar menyertai pertandingan itu."
- **segala** = all/every → "**Segala** usaha mereka membuahkan hasil."

**baik / bagus (good):**
- **cemerlang** = excellent → "Keputusannya **cemerlang**."
- **terpuji** = praiseworthy → "Sikapnya amat **terpuji**."
- **murni / mulia** = noble → "nilai **murni**".

**besar (big):**
- **luas** = vast/extensive → "kawasan yang **luas**".
- **agung** = grand → "majlis **agung**".
- **pesat** (for growth) → "pembangunan yang **pesat**".

**cantik (pretty) → indah / jelita / permai** (for scenery: "pemandangan yang **indah**").
**pandai (clever) → cerdik / bijak / cerdas** ("pelajar yang **bijak**").
**sebab (because, informal) → kerana / oleh sebab.**
**tengok (look) → melihat / memerhati.**

**Tip:** match the word to the noun — "**indah**" suits scenery, "**jelita**" suits a person; "**luas**" suits area, "**agung**" suits an event. Variety of vocabulary is a marked criterion in Paper 2.`,
    examples: [
      { root: 'banyak', derived: 'pelbagai / sebilangan besar', meaning: 'various / a large number of' },
      { root: 'baik', derived: 'cemerlang / terpuji', meaning: 'excellent / praiseworthy' },
      { root: 'besar', derived: 'luas / agung', meaning: 'vast / grand' },
      { root: 'cantik', derived: 'indah / jelita', meaning: 'beautiful (scenery / person)' },
    ],
    related: ['formal-vs-informal', 'penulisan-essay'],
  },

  {
    id: 'common-mistakes',
    topic: TOPICS.TATABAHASA,
    title: 'Common Malay Mistakes (Kesilapan Lazim)',
    keywords: ['common mistakes', 'kesilapan', 'error', 'wrong', 'mistake', 'correction'],
    patterns: ['common.*mistake', 'kesilapan', 'error', 'what.*wrong', 'mistake.*malay'],
    answer: `**Most Common Malay Mistakes in IGCSE:**

**1. Wrong imbuhan:**
- ❌ "Dia menbantu saya" → ✅ "Dia **membantu** saya" (p,b,f → mem-)
- ❌ "Saya mengambil gambar" → Actually ✅ this is correct!
- ❌ "Dia mempunyai" → Actually ✅ this is correct! (exception to p→m rule)

**2. di- (prefix) vs di (preposition):**
- ❌ "Buku itu dimeja" → ✅ "Buku itu **di** meja" (on the table — separate)
- ❌ "Surat di tulis" → ✅ "Surat **ditulis**" (written — joined, it's a passive verb)
- **Rule:** di- joined = VERB (ditulis), di spaced = PLACE (di rumah)

**3. dari vs daripada:**
- ❌ "Hadiah dari Ali" → ✅ "Hadiah **daripada** Ali" (from a person)
- ❌ "Saya daripada Melaka" → ✅ "Saya **dari** Melaka" (from a place)

**4. Missing imbuhan in formal writing:**
- ❌ "Dia tulis surat" → ✅ "Dia **menulis** surat" (active verb needs meN-)

**5. Wrong classifier:**
- ❌ "Satu kucing" → ✅ "**Seekor** kucing"
- ❌ "Satu rumah" → ✅ "**Sebuah** rumah"

**6. Spelling:**
- ❌ "pelajar2" → ✅ "pelajar-pelajar" (full reduplication)
- ❌ "perluh" → ✅ "perlu"
- ❌ "bahwa" → ✅ "bahawa"`,
    examples: [],
    related: ['imbuhan-men', 'kata-sendi', 'penjodoh-bilangan'],
  },
]

// ── Search & Match Engine ────────────────────────────────────

/**
 * Score how well a query matches a knowledge entry.
 * Higher score = better match.
 */
function scoreMatch(query, entry) {
  const q = query.toLowerCase().trim()
  const words = q.split(/\s+/).filter(w => w.length > 1)
  let score = 0

  // Exact keyword match (strongest signal)
  for (const kw of entry.keywords) {
    if (q.includes(kw.toLowerCase())) score += 10
  }

  // Pattern match (regex-like)
  for (const pat of entry.patterns) {
    try {
      if (new RegExp(pat, 'i').test(q)) score += 8
    } catch {
      if (q.includes(pat.toLowerCase())) score += 5
    }
  }

  // Title word overlap
  const titleWords = entry.title.toLowerCase().split(/\s+/)
  for (const w of words) {
    if (titleWords.some(tw => tw.includes(w) || w.includes(tw))) score += 3
  }

  // Topic match
  if (words.some(w => entry.topic.includes(w))) score += 2

  // Word overlap with answer (weakest signal)
  const answerLower = entry.answer.toLowerCase()
  for (const w of words) {
    if (w.length > 3 && answerLower.includes(w)) score += 1
  }

  return score
}

/**
 * Find the best matching knowledge entries for a user query.
 * Returns an array of { entry, score } sorted by relevance.
 */
export function searchKnowledge(query, maxResults = 3) {
  if (!query || query.trim().length < 2) return []

  const scored = KNOWLEDGE_BASE
    .map(entry => ({ entry, score: scoreMatch(query, entry) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)

  return scored
}

/**
 * Minimum top-match score for the free expert system to answer with confidence.
 *
 * CALIBRATED (keyless) from scripts/ai-tier-eval/goldCikgu.mjs: running
 * searchKnowledge over the 12 gold questions, every genuinely-strong match scores
 * ≥49 while the whole ambiguous floor scores ≤31 — an empty gap from 32–48. Below
 * that line the keyword scorer literally cannot tell a correct match from a
 * topic-only scrape (the in-coverage "penjodoh bilangan" Q and the out-of-coverage
 * "bagai aur dengan tebing" Q BOTH score exactly 28). 40 sits mid-gap, robust to
 * small KB edits. Below it we ADMIT UNCERTAINTY instead of bluffing — a confident
 * WRONG grammar answer is the worst failure mode for a learning tool.
 */
export const MIN_CONFIDENCE = 40

/**
 * Is the top search result confident enough to present as an authoritative answer?
 */
export function isConfidentMatch(results) {
  return results.length > 0 && results[0].score >= MIN_CONFIDENCE
}

// The areas the free expert system reliably covers — shown in the uncertainty
// hedge so a low-confidence reply is still a helpful signpost, not a dead end.
const COVERAGE_MENU =
  '- **Imbuhan** (meN-, ber-, di-, ter-, peN-, -kan, -an, ke-...-an, se-)\n' +
  '- **Tatabahasa** (tense markers, kata hubung, passive voice, sentence types)\n' +
  '- **Writing tips** (essay structure, formal language, proverbs)\n' +
  '- **Speaking tips** (Paper 3 strategies, roleplay tips)\n' +
  '- **Exam strategies** (Paper 1, 2, 3 tips)\n' +
  '- **Vocabulary** (family, school, common mistakes)'

// Honest "I'm not sure" reply. Names the closest topic it DID find (when any) and
// points to the free AI tutor for a precise answer — a suggestion, never a gate.
function buildUncertaintyResponse(closest) {
  const lead = closest
    ? `I'm not sure I have a precise answer for that. The closest topic I found is **${closest.title}**, but I'm not confident it fully answers your question.`
    : "I don't have a specific answer for that yet."
  return (
    `${lead}\n\n` +
    "For a precise answer, switch to **✨ AI** mode (toggle at the top) and ask again — it's free.\n\n" +
    'Or ask me about something I cover well:\n\n' +
    COVERAGE_MENU +
    '\n\nTry asking something like: "Explain meN- prefix" or "Paper 3 tips"'
  )
}

/**
 * Build the free expert-system reply for a query. Pure: composes searchKnowledge +
 * formatKnowledgeResponse. Returns { text, related, confident }.
 *
 * When the top match is weak (score < MIN_CONFIDENCE) — or there is no match at
 * all — it admits uncertainty rather than presenting a low-confidence scrape as
 * authoritative, names the closest topic it found, and points to the free AI tutor.
 */
export function getExpertResponse(query) {
  const results = searchKnowledge(query, 2)

  if (!isConfidentMatch(results)) {
    return { text: buildUncertaintyResponse(results[0]?.entry || null), related: [], confident: false }
  }

  const primary = results[0].entry
  let text = formatKnowledgeResponse(primary)
  const related = getRelatedEntries(primary.id)
  if (results.length > 1 && results[1].score > 5) {
    text += `\n\n---\n**Related:** ${results[1].entry.title}`
  }
  return { text, related, confident: true }
}

/**
 * Get a single best-match answer, formatted for display.
 */
export function getExpertAnswer(query) {
  const results = searchKnowledge(query, 1)
  if (results.length === 0) return null
  return results[0].entry
}

/**
 * Format a knowledge entry into a chat-friendly response.
 */
export function formatKnowledgeResponse(entry) {
  let response = entry.answer

  if (entry.examples && entry.examples.length > 0) {
    response += '\n\n**Examples:**'
    for (const ex of entry.examples.slice(0, 5)) {
      if (ex.derived) {
        response += `\n- ${ex.root} → **${ex.derived}** (${ex.meaning})`
      } else {
        response += `\n- **${ex.root}** — ${ex.meaning}`
      }
    }
  }

  return response
}

/**
 * Get all topics for browsing.
 */
export function getAllTopics() {
  const grouped = {}
  for (const entry of KNOWLEDGE_BASE) {
    if (!grouped[entry.topic]) grouped[entry.topic] = []
    grouped[entry.topic].push({ id: entry.id, title: entry.title })
  }
  return grouped
}

/**
 * Get a knowledge entry by ID.
 */
export function getEntryById(id) {
  return KNOWLEDGE_BASE.find(e => e.id === id) || null
}

/**
 * Get related entries for a given entry.
 */
export function getRelatedEntries(entryId) {
  const entry = getEntryById(entryId)
  if (!entry || !entry.related) return []
  return entry.related.map(id => getEntryById(id)).filter(Boolean)
}

/**
 * Get suggested prompts based on weak areas.
 */
export function getSuggestedPrompts(mistakes = []) {
  const prompts = [
    { text: 'Explain meN- prefix nasal rules', topic: 'imbuhan' },
    { text: 'How do I use ber- prefix?', topic: 'imbuhan' },
    { text: 'Active vs passive voice in Malay', topic: 'tatabahasa' },
    { text: 'Tense markers: telah, sudah, sedang, akan', topic: 'tatabahasa' },
    { text: 'What kata hubung should I use in essays?', topic: 'tatabahasa' },
    { text: 'Paper 3 speaking tips', topic: 'lisan' },
    { text: 'How to write a good IGCSE essay?', topic: 'penulisan' },
    { text: 'Common peribahasa for essays', topic: 'peribahasa' },
    { text: 'Common mistakes in Malay', topic: 'tatabahasa' },
    { text: 'What are penjodoh bilangan?', topic: 'tatabahasa' },
    { text: 'di- prefix vs di preposition', topic: 'imbuhan' },
    { text: 'Paper 1 reading comprehension tips', topic: 'exam_tips' },
  ]

  // Prioritize prompts related to mistakes
  if (mistakes.length > 0) {
    const mistakeTopics = new Set(mistakes.map(m => m.source || m.type))
    return prompts.sort((a, b) => {
      const aRelevant = mistakeTopics.has(a.topic) ? 1 : 0
      const bRelevant = mistakeTopics.has(b.topic) ? 1 : 0
      return bRelevant - aRelevant
    })
  }

  return prompts
}

export default KNOWLEDGE_BASE

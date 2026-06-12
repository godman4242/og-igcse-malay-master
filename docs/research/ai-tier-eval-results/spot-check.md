# AI-tier eval — spot-check sheet

Audit the JUDGE: read both outputs and the judge's verdict. If you disagree with the judge, the eval numbers are suspect.

## Writing

### w-internet (level weak, intended band 2, 5 planted errors)
**Planted errors:** guna→menggunakan [imbuhan]; Tapi→Namun / Akan tetapi [register]; dari pada→daripada [preposition]; mempakai→memakai / menggunakan [imbuhan]; kena kawal→perlu mengawal [register]

**FREE output:**
```
Band: 2/6
Flagged issues (3):
- [grammar] "dari pada": "daripada" is one word in standard Malay. → suggested: "daripada"
- [grammar] "mempakai": "mempakai" — base "pakai" loses p. Use "memakai". → suggested: "memakai"
- [style] "kena": Often colloquial. In formal contexts prefer "perlu" / "harus" / "dipaksa". → suggested: "perlu"
Tips:
- Betulkan 2 kesalahan tatabahasa/ejaan yang ditandakan di bawah.
- Tambah penanda format: Pertamanya, Selain itu, Tambahan pula
- Gunakan lebih banyak penanda wacana (selain itu, walau bagaimanapun, sebagai contoh, kesimpulannya, oleh itu).
- Tingkatkan kosa kata — gunakan istilah formal (sememangnya, sewajarnya, menitikberatkan) dan elakkan kata umum.
- Pelbagaikan struktur ayat — selang-selikan ayat pendek dengan ayat majmuk yang menggunakan "kerana", "walaupun", "supaya", "manakala".
- Kembangkan kepada 250+ perkataan untuk huraian yang lebih lengkap.
```
**FREE judge:** caught 0/5; false positives: 0

**BYOK output:**
```
[no feedback — model returned unparseable output]
```
**BYOK judge:** caught 0/5; false positives: 0

### w-socmed (level weak, intended band 4, 3 planted errors)
**Planted errors:** Oleh kerana itu→Oleh itu / Oleh sebab itu [cohesion]; kena ingat→perlu ingat / mesti ingat [register]; dari hiburan→daripada hiburan [preposition]

**FREE output:**
```
Band: 2/6
Flagged issues (1):
- [style] "kena": Often colloquial. In formal contexts prefer "perlu" / "harus" / "dipaksa". → suggested: "perlu"
Tips:
- Tambah penanda format: Pertamanya, Selain itu, Tambahan pula
- Gunakan lebih banyak penanda wacana (selain itu, walau bagaimanapun, sebagai contoh, kesimpulannya, oleh itu).
- Tingkatkan kosa kata — gunakan istilah formal (sememangnya, sewajarnya, menitikberatkan) dan elakkan kata umum.
- Pelbagaikan struktur ayat — selang-selikan ayat pendek dengan ayat majmuk yang menggunakan "kerana", "walaupun", "supaya", "manakala".
- Kembangkan kepada 250+ perkataan untuk huraian yang lebih lengkap.
```
**FREE judge:** caught 1/3; false positives: 0

**BYOK output:**
```
[no feedback — model returned unparseable output]
```
**BYOK judge:** caught 0/3; false positives: 0

### m-technology (level mid, intended band 5, 2 planted errors)
**Planted errors:** secara mendadak→secara drastik / secara menyeluruh [word-choice]; menjejas kesihatan→menjejaskan kesihatan [imbuhan]

**FREE output:**
```
Band: 2/6
Flagged issues: none.
Tips:
- Tambah penanda format: Pertamanya, Selain itu, Tambahan pula
- Gunakan lebih banyak penanda wacana (selain itu, walau bagaimanapun, sebagai contoh, kesimpulannya, oleh itu).
- Tingkatkan kosa kata — gunakan istilah formal (sememangnya, sewajarnya, menitikberatkan) dan elakkan kata umum.
- Pelbagaikan struktur ayat — selang-selikan ayat pendek dengan ayat majmuk yang menggunakan "kerana", "walaupun", "supaya", "manakala".
- Kembangkan kepada 250+ perkataan untuk huraian yang lebih lengkap.
```
**FREE judge:** caught (no key)

**BYOK output:**
```
[no feedback — model returned unparseable output]
```
**BYOK judge:** caught (no key)

### s-discipline (level strong, intended band 5, 2 planted errors)
**Planted errors:** di pupuk→dipupuk [imbuhan]; berguna dari masyarakat→berguna kepada masyarakat [preposition]

**FREE output:**
```
Band: 2/6
Flagged issues: none.
Tips:
- Tambah penanda format: Pertamanya, Selain itu, Tambahan pula
- Gunakan lebih banyak penanda wacana (selain itu, walau bagaimanapun, sebagai contoh, kesimpulannya, oleh itu).
- Tingkatkan kosa kata — gunakan istilah formal (sememangnya, sewajarnya, menitikberatkan) dan elakkan kata umum.
- Pelbagaikan struktur ayat — selang-selikan ayat pendek dengan ayat majmuk yang menggunakan "kerana", "walaupun", "supaya", "manakala".
- Kembangkan kepada 250+ perkataan untuk huraian yang lebih lengkap.
```
**FREE judge:** caught (no key)

**BYOK output:**
```
[no feedback — model returned unparseable output]
```
**BYOK judge:** caught (no key)

### s-perfect (level strong, intended band 6, 0 planted errors)
**Planted errors:** (none)

**FREE output:**
```
Band: 2/6
Flagged issues: none.
Tips:
- Tambah penanda format: Pertamanya, Selain itu, Tambahan pula
- Gunakan lebih banyak penanda wacana (selain itu, walau bagaimanapun, sebagai contoh, kesimpulannya, oleh itu).
- Tingkatkan kosa kata — gunakan istilah formal (sememangnya, sewajarnya, menitikberatkan) dan elakkan kata umum.
- Pelbagaikan struktur ayat — selang-selikan ayat pendek dengan ayat majmuk yang menggunakan "kerana", "walaupun", "supaya", "manakala".
- Kembangkan kepada 250+ perkataan untuk huraian yang lebih lengkap.
```
**FREE judge:** caught (no key)

**BYOK output:**
```
[no feedback — model returned unparseable output]
```
**BYOK judge:** caught (no key)

## Cikgu

### men-p (coverage hint: in, free top-match score 66)
**Q:** How does the meN- prefix change a verb whose root starts with the letter "p"? Give an example.

**FREE answer:**
```
**meN-** is the most important active verb prefix in Malay. It changes based on the first letter of the root word (nasal assimilation rules):

**Rules:**
- **me-** before l, r, w, y, m, n, ng, ny → melawan, merawat, mewarnai
- **mem-** before b, f, v → membaca, memfoto, memveto
- **mem- (p drops)** before p → menulis ❌ mempulis → **memukul** (p→m: pukul→memukul)
- **men-** before d, c, j, z → mendapat, mencari, menjadi
- **men- (t drops)** before t → menulis (tulis→menulis)
- **meny- (s drops)** before s → menyapu (sapu→menyapu)
- **meng-** before vowels, g, h, k → mengambil, menggali, menghitung
- **meng- (k drops)** before k → mengira (kira→mengira)
- **menge-** for single-syllable roots → mengecat, mengelap

**Quick Memory Trick:** "**P T S K** drop their letters" → memukul, menulis, menyapu, mengira

**Examples:**
- tulis → **menulis** (to write)
- baca → **membaca** (to read)
- sapu → **menyapu** (to sweep)
- kira → **mengira** (to count)
- ambil → **mengambil** (to take)

---
Related: Awalan ter- (Superlative/Accidental Prefix)
```
**FREE judge:** (no key)

**BYOK answer:**
```
Selamat sejahtera! Let's master the mechanics of the **meN-** prefix.
```
**BYOK judge:** (no key)

### tense-markers (coverage hint: in, free top-match score 57)
**Q:** What is the difference between "sudah", "sedang", and "akan"? Use each in a short example.

**FREE answer:**
```
Malay doesn't change verb forms for tense — instead, **time markers** are placed before the verb:

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
"Tahun lalu, saya **telah** melawat Melaka. Sekarang, saya **sedang** merancang perjalanan ke Langkawi. Tahun depan, saya **akan** pergi ke Sabah."

**Examples:**
- **Saya sudah makan** — I have eaten (informal)
- **Dia telah menulis** — She has written (formal)
- **Mereka sedang bermain** — They are playing
- **Saya akan pergi** — I will go
- **Dia belum tiba** — He has not arrived yet

---
Related: Paper 3 Speaking Tips
```
**FREE judge:** (no key)

**BYOK answer:**
```
Selamat datang! I am Cikgu Maya. Let’s master this concept using a simple mental
```
**BYOK judge:** (no key)

### penjodoh-bilangan (coverage hint: in, free top-match score 28)
**Q:** What are penjodoh bilangan, and which one do I use for people, for animals, and for flat/sheet objects?

**FREE answer:**
```
Malay uses **classifiers** (penjodoh bilangan) when counting — you can't just say "two cat":

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

**IGCSE tip:** Using correct classifiers shows advanced Malay!

**Examples:**
- orang → **seorang doktor** (a doctor (person))
- ekor → **seekor kucing** (a cat (animal))
- buah → **sebuah kereta** (a car (large object))
- helai → **sehelai kertas** (a piece of paper)

---
Related: Awalan se- (One/Same/As...as Prefix)
```
**FREE judge:** (no key)

**BYOK answer:**
```
Selamat datang! I am Cikgu Maya. Let’s master this concept using **systemic
```
**BYOK judge:** (no key)

### paper3-tips (coverage hint: partial, free top-match score 49)
**Q:** In the IGCSE Paper 3 (speaking) roleplay, give two concrete techniques to score a higher band.

**FREE answer:**
```
**IGCSE Paper 3 Speaking — How to Score Well:**

**The exam format:**
- Part 1: Role play (2-3 minutes) — you act out a scenario
- Part 2: Topic presentation (3-4 minutes) — present on a given topic
- Part 3: General conversation (5-6 minutes) — discuss topics with examiner

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

**7. Speak clearly and at a moderate pace.** Speed ≠ fluency.

---
Related: Paper 3 (Speaking) Exam Strategy
```
**FREE judge:** (no key)

**BYOK answer:**
```
(no key)
```
**BYOK judge:** (no key)

### vocab-upgrade (coverage hint: out, free top-match score 31)
**Q:** Give me three more formal alternatives to the common word "banyak" for an IGCSE essay, each with an example.

**FREE answer:**
```
**IGCSE Paper 2 Writing Tips:**

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

**Word count:** Aim for 200-300 words (IGCSE standard).

---
Related: Awalan se- (One/Same/As...as Prefix)
```
**FREE judge:** (no key)

**BYOK answer:**
```
(no key)
```
**BYOK judge:** (no key)

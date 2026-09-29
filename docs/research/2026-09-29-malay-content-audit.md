# Malay content audit — 2026-09-29

> **Status:** all 29 verified flags APPLIED 2026-09-29 (pinned by `src/data/__tests__/contentAudit20260929.test.js`), plus `ketahui`'s gloss from the unverified list. `temuduga-kelab` (a roleplay scenario id) keeps its old spelling on purpose: saved progress is keyed by it. Still open: the other 4 unverified suspicions (mengetahui/diketahui labels, sekerja, lawatan, lemak).


**Read-only audit. No repo file was edited.**

**Verdict:** 29 verified flags (16 in the dictionary, 13 in the word families, 0 in the starter deck) and 5 unverified suspicions. Among the 1,020 headwords there are **no Indonesian-register words** and no other misspellings.

## Method
1. **Eye pass.** I read every entry in all three files.
2. **Existence gate.** I looked up all 938 single-word headwords and derived forms on PRPM (DBP's Kamus Dewan Edisi Keempat plus Kamus Pelajar Edisi Kedua).
   - 875 have their own entry.
   - The other 62 are regular inflections (di- passives, -nya/-kah, plurals, se- classifier forms). Three exceptions are real problems: `termasak`, `temuduga`, `t-shirt`.
3. **Register gate.** Kamus Dewan labels Indonesian words `Id`, colloquial words `bp` and archaic words `ark`. I scanned the first Kamus Dewan definition of every headword for those labels.
   - No Indonesian headwords were found.
   - `kenapa` is marked `bp` (colloquial). That is fine in speech; `mengapa` is the essay form.
4. **Gloss pass.** I placed every dictionary gloss beside the start of its Kamus Dewan definition (745 rows) and read all of them.
5. **Flag verification.** Each flag was confirmed against the full PRPM entry. Wiktionary or a grammar source was used where PRPM was silent.

The cached PRPM HTML for every word is in `scratchpad/prpm/`, so each claim can be re-checked offline.

Confidence: **high** = the source states it directly. **medium** = the source supports it, but it is partly a judgement about how misleading the gap is.

---

## 1. `src/data/dictionary.js` (825 entries): 16 flags

Ordered by how much harm each one can do to a learner.

| word | current value | problem | proposed fix | source URL | confidence |
|---|---|---|---|---|---|
| `hadapan` | `'future'` | Kamus Dewan sense 1 is **front** ("bahagian sebelah muka, depan (lwn belakang)"). "Future" is sense 2 and only works inside *masa hadapan*. A learner reading *di hadapan rumah* gets "in the future of the house". The example sentence ("pada masa hadapan") hides the problem. | `'front; (masa hadapan) future'` | https://prpm.dbp.gov.my/cari1?keyword=hadapan | high |
| `alam` | `'environment'` | Kamus Dewan: 1. world, earth; 2. the universe / nature; 3. realm or sphere (*alam remaja*). "Environment" is **alam sekitar** ("keadaan alam sekeliling"). The example sentence uses *alam sekitar*, so the card teaches that the bare word means environment. | `'world; nature (alam sekitar = environment)'` | https://prpm.dbp.gov.my/cari1?keyword=alam · https://prpm.dbp.gov.my/cari1?keyword=alam%20sekitar | high |
| `tidak dapat lupakan` | `'cannot forget'` | Not standard written Malay. A transitive verb after *dapat* needs meN- (active) or di- (passive). Kamus Dewan's own example under *lupa → melupakan* is "budi baiknya tidak dapat **dilupakan**". The bare form *lupakan* has no PRPM entry. IGCSE writing is marked on exactly this. dictionaryEn.js also maps "cannot forget" → this phrase. | `'tidak dapat melupakan': 'cannot forget'`, and optionally `'tidak dapat dilupakan': 'unforgettable'` | https://prpm.dbp.gov.my/cari1?keyword=lupa · https://prpm.dbp.gov.my/cari1?keyword=lupakan | high |
| `daripada` | `'from/of'` | Leaves out **than**, one of this word's most frequent uses. Kamus Dewan sense 4 covers comparison: "lebih menarik ~ yg disediakan dahulu". *Lebih besar daripada* = "bigger than". | `'from (a person/source); than; of (part of)'` | https://prpm.dbp.gov.my/cari1?keyword=daripada | high |
| `lama` | `'old (thing)'` | Leaves out the main sense. Kamus Dewan sense 1 is "panjang masanya … lwn sekejap": **long (time)**, as in *sudah lama*, *berapa lama*. "Old" comes second. | `'long (time); old (thing)'` | https://prpm.dbp.gov.my/cari1?keyword=lama | high |
| `temuduga` | `'interview'` | **Misspelled.** The DBP headword is **temu duga** (two words). `temuduga` returns "Carian kata tiada di dalam kamus terkini". Kamus Dewan's verb forms are *menemu duga* and *penemu duga*. | Rename the key to `'temu duga'`. The same spelling also appears in dictionaryExamples.js (×2), dictionaryEn.js ("interview"), topics.js and scenarios.js (id + text). | https://prpm.dbp.gov.my/cari1?keyword=temu%20duga · https://prpm.dbp.gov.my/cari1?keyword=temuduga | high |
| `satay` | `'satay'` | **English spelling.** The Kamus Dewan headword is **sate** (Kamus Pelajar: "/saté/ hirisan daging yg dicucuk…"). `satay` appears on PRPM only as the *English* headword in Kamus Inggeris-Melayu ("satay n … sate"). The repo contradicts itself: wikidataMalayEn.js already has `{ m: 'sate', e: 'satay' }`. scenarios.js keyVocab also uses `satay`. | `'sate': 'satay'` | https://prpm.dbp.gov.my/cari1?keyword=sate · https://prpm.dbp.gov.my/cari1?keyword=satay | high |
| `jam` | `'hour'` | Leaves out Kamus Dewan sense 1, **clock/watch** ("sj alat utk menunjukkan waktu"). Sense 3 is also "o'clock / time". The dictionary itself has `jam tangan pintar` = smart watch. | `'clock/watch; hour'` | https://prpm.dbp.gov.my/cari1?keyword=jam | high |
| `berhubung` | `'to stay in contact'` | Too narrow. Kamus Dewan: 1. joined/connected; 2. **regarding** (*berhubung dengan*, the standard formal-letter opener); 3. owing to; 4. to communicate. Learners will meet sense 2 most often in exam texts. | `'connected; regarding (berhubung dengan); to communicate'` | https://prpm.dbp.gov.my/cari1?keyword=berhubung | high |
| `t-shirt` | `'t-shirt'` | This is the English word, not a Malay headword (no PRPM entry). The Kamus Inggeris-Melayu Dewan equivalent is **kemeja-T** (its examples also use *baju-T*). | `'kemeja-T': 'T-shirt'` | https://prpm.dbp.gov.my/Cari1.aspx?keyword=t-shirt&d=72508 | high |
| `baru` | `'new'` | Leaves out the adverb **just / recently** (*baru sampai*, *baru-baru ini*), which is extremely common. Kamus Pelajar: "belum lama lagi". Wiktionary lists the adverb "just, recently". `baharu` = 'new' already covers the adjective (Kamus Dewan: "baharu: baru"). | `'new; just/recently'` | https://prpm.dbp.gov.my/cari1?keyword=baru · https://en.wiktionary.org/wiki/baru#Malay | medium |
| `percuma` | `'free'` | Kamus Dewan and Kamus Pelajar both list sense 1 as **in vain / useless** ("sia-sia"), with "free of charge" as senses 2–3. In a literary text, *percuma sahaja menasihatinya* would be read as "free". | `'free (of charge); in vain'` | https://prpm.dbp.gov.my/cari1?keyword=percuma | medium |
| `rusuk` | `'rib'` | Kamus Dewan sense 1 is **side/flank** ("samping, sisi (sebelah badan)"). Rib is sense 3 and equals *tulang rusuk*. | `'side (of body); rib (tulang rusuk)'` | https://prpm.dbp.gov.my/cari1?keyword=rusuk | medium |
| `kelmarin` | `'the day before yesterday'` | Ambiguous. Kamus Dewan sense 1 is **yesterday** (= semalam), sense 2 the day before yesterday, sense 3 a few days ago. Kamus Pelajar puts the day-before sense first. As written, the card reads as the only meaning. | `'the day before yesterday; (also) yesterday / recently'` | https://prpm.dbp.gov.my/cari1?keyword=kelmarin | medium |
| `bulatan` | `'roundabout'` | The primary Kamus Dewan and Kamus Pelajar sense is **circle** ("sesuatu yg bulat, lingkaran"). "Roundabout" is its road-sign use. The narrow gloss misleads in maths or description texts. | `'circle; roundabout (road)'` | https://prpm.dbp.gov.my/cari1?keyword=bulatan | medium |
| `tablet` | `'tablet (device)'` | Kamus Dewan's only sense is **pill** ("ubat yg berbiji-biji, pil"). The "(device)" qualifier rules out the dictionary sense (e.g. *makan dua biji tablet*). | `'tablet (pill; device)'` | https://prpm.dbp.gov.my/cari1?keyword=tablet | medium |

## 2. `src/data/wordFamilies.js` (41 roots, 209 forms): 13 flags

The detail modal renders `{type} · from {root}` (`src/components/WordFamilyTree.jsx:397-401`). So a wrong label is shown to the learner as a false derivation.

| word (family) | current value | problem | proposed fix | source URL | confidence |
|---|---|---|---|---|---|
| `membangun` (bangun) | `meN-`, `'to build/develop'` | **Wrong: it does not mean "to build".** Kamus Dewan: membangun = 1. to rise / stand up (clouds etc.); 2. to develop and progress, **intransitive** (*negara-negara yg sedang ~* = developing countries). The transitive "build" is **membangunkan** or **membina**. A learner would write *Kerajaan membangun sekolah*, which is wrong. | `'to rise; to develop (intransitive: negara membangun)'` | https://prpm.dbp.gov.my/cari1?keyword=membangun · https://prpm.dbp.gov.my/cari1?keyword=bangun | high |
| `membangunkan` (bangun) | `'to wake someone up'` | Too narrow. Combined with the row above, the family effectively swaps the "build" sense onto the wrong word. Kamus Dewan senses: 1–2 wake someone; **3. to build / erect (membina, mendirikan); 4. to develop (~ negara, ~ bangsa)**. *Membangunkan negara* is a stock IGCSE essay phrase. | `'to wake (someone) up; to build; to develop (a country)'` | https://prpm.dbp.gov.my/cari1?keyword=membangunkan | high |
| `dibangunkan` (bangun) | `'woken up (passive)'` | Same gap. Kamus Dewan's own example is "bandar itu **dibangunkan** di atas kawasan…" (built/developed). | `'woken up; built/developed (passive)'` | https://prpm.dbp.gov.my/cari1?keyword=membangunkan | high |
| `bangun` (root meaning) | `'build/wake up'` | The root has no "build" sense. Kamus Dewan: rise (from sitting or sleep), wake, be awake, come round, become aware. "Build" only arrives through *membangunkan* and *bangunan*. | `'rise/get up; wake up'` | https://prpm.dbp.gov.my/cari1?keyword=bangun | high |
| `termasak` (masak) | `ter-`, `'accidentally cooked'` | **Not a DBP word.** PRPM has no entry and only suggests "termasuk…". The masak entry's Kata Terbitan (DBP's official list of derived words) is *memasak, masakan, pemasak*. This is the same failure class the repo already removed for `penjadi`, `berdidik` and `penyihat`. | Remove the form | https://prpm.dbp.gov.my/cari1?keyword=termasak · https://prpm.dbp.gov.my/cari1?keyword=pemasak | high |
| `pelatih` (latih) | `'trainer/coach'` | Leaves out the everyday Malaysian sense. Kamus Dewan: 1. one who trains; **2. one who is being trained (trainee)**, e.g. *doktor ~* = house officer. Kamus Pelajar: *jururawat ~* = trainee nurse. The *guru* entry lists *guru pelatih* (trainee teacher). The usual Malaysian word for coach is *jurulatih*. | `'trainee; trainer'` | https://prpm.dbp.gov.my/cari1?keyword=pelatih · https://prpm.dbp.gov.my/cari1?keyword=guru | high |
| `kerjaya` (kerja) | `type: 'root+ya'`, `'career'` | **False derivation.** Malay has no "-ya" affix. *Kerjaya* is its own Kamus Dewan headword and is **absent** from DBP's derived-word list for *kerja* (sekerja, bekerja, mengerjakan, terkerjakan, pekerjaan, sepekerjaan, berpekerjaan, pengerjaan, pekerja, pengerja). The modal tells learners "root+ya · from kerja". | Remove it from the family, or relabel it as a "related word (not an affix)" in a way the modal won't render as "from kerja" | https://prpm.dbp.gov.my/cari1?keyword=kerjaya · https://prpm.dbp.gov.my/cari1?keyword=pekerja | high |
| `soal` (tanya) | `type: 'synonym'`, `'question (formal)'` | **False derivation in the UI.** The modal shows "synonym · from tanya", but *soal* is a separate root. DBP's thesaurus lists it only as a *synonym* of *tanya*, and it is not in *tanya*'s derived-word list (bertanya, menanya, menanyakan, tertanya-tanya, pertanyaan, penanya). Also, *soal* means question / matter / issue; "formal" is not a register label DBP gives it. | Remove it from `forms` (or move it to a separate "see also" field) | https://prpm.dbp.gov.my/cari1?keyword=menanya · https://prpm.dbp.gov.my/cari1?keyword=soal | high |
| `mencarikan` (cari) | `'to search for (someone)'` | The wording reads as "to search for a person", which is plain *mencari*. Kamus Dewan: "mencari sesuatu **utk**" = to look for something *on someone's behalf*. The sibling `membelikan` is glossed correctly ("to buy for (someone)"). | `'to look for (something) for someone'` | https://prpm.dbp.gov.my/cari1?keyword=mencarikan | high |
| `bersiar-siar` (siar) | `ber-R`, under root `siar` (broadcast) | **Two unrelated words merged.** Kamus Dewan files *bersiar, bersiar-siar* (stroll) under a **separate homonym** *siar*, distinct from the *siar* that gives *menyiarkan / siaran / penyiar*. The tree implies that strolling derives from broadcasting. | Move it to its own family (siar II = stroll), or mark it "(different word siar: to stroll)" | https://prpm.dbp.gov.my/cari1?keyword=siar | high |
| `pekerja` (kerja) | `type: 'peN-'` | Wrong affix label. The regular peN- form of *kerja* is **pengerja** (Kamus Dewan: "orang yg mengerjakan … sesuatu"). *Pekerja* uses the separate prefix **pe-**, paired with the ber- verb *bekerja*. Malaysian school grammar treats pe- as distinct from peN-. | `type: 'pe-'` | https://prpm.dbp.gov.my/cari1?keyword=pengerja · https://hzurain.blogspot.com/2011/08/nota-imbuhan-tips-untuk-semua-jenis_2545.html | medium |
| `pekerjaan` (kerja) | `type: 'peN-...-an'` | Same issue. peN-…-an + kerja gives **pengerjaan** (Kamus Dewan: "perihal … mengerjakan, cara (proses) melakukan sesuatu"). *Pekerjaan* is pe-…-an. | `type: 'pe-...-an'` | https://prpm.dbp.gov.my/cari1?keyword=pengerjaan · https://prpm.dbp.gov.my/cari1?keyword=pekerjaan | medium |
| `pejalan` (jalan) | `type: 'peN-'`, `'walker/pedestrian'` | Wrong label, and the gloss is not attested on its own. Kamus Dewan lists *pejalan* only inside **pejalan kaki** (pedestrian). The peN- form is *penjalan* (archaic: operator / one who likes walking). *Pejalan* is pe- (paired with *berjalan*). | `word: 'pejalan kaki'`, `type: 'pe-'`, `'pedestrian'` | https://prpm.dbp.gov.my/cari1?keyword=pejalan · https://prpm.dbp.gov.my/cari1?keyword=penjalan | medium |

## 3. `src/data/malayStarter.js` (45 entries): 0 flags

- All 45 glosses match Kamus Dewan senses, including `selamat petang` "good afternoon / evening": Kamus Dewan puts *petang* at roughly 2–6/7 pm.
- The example sentences follow standard classifier and word-order rules.
- The file's own earlier corrections (`di mana`, the classifier fixes) hold up.

---

## Unverified suspicions (need a grammar source I could not reach, or it's a judgement call)

| word | current value | suspicion | why unverified |
|---|---|---|---|
| `ketahui` (tahu) | `ke-...-i`, `'to know (imperative)'` | Not in DBP's derived-word list for *tahu* (tahu-tahu, mengetahui, ketahuan, berketahuan, pengetahuan, berpengetahuan). Its commonest use is the pronoun-passive *(seperti yang) kita ketahui*, "as we know", not an imperative (that is *ketahuilah*). | I couldn't reach the Tatabahasa Dewan text (anyflip returned 403) to confirm how DBP analyses the fossilised *ke-* here. PRPM: https://prpm.dbp.gov.my/cari1?keyword=tahu |
| `mengetahui` / `diketahui` (tahu) | `meN-...-i` / `di-...-i` | The labels hide the *ke-* element (meN- + ke- + tahu + -i). A learner applying "meN-...-i" to *tahu* would produce *\*menahui*. | Same missing grammar source. |
| `sekerja` (kerja) | `se-`, `'co-worker'` (noun) | Kamus Dewan: "sama pekerjaannya, sejawat", which reads as adjectival ("of the same work"). "Co-worker" is *rakan sekerja*. | Kamus Dewan also gives *sejawat* (colleague), so the noun reading is defensible. |
| `lawatan` | `'trip'` | Kamus Dewan: "perihal melawat, kunjungan", i.e. **visit**. "Trip" fits *lawatan sambil belajar* but not *lawatan Perdana Menteri*. | Borderline between an acceptable synonym and a misleading one. |
| `lemak` | `'fatty/rich'` | Kamus Dewan sense 1 is the noun **fat** (animal fat); "rich (coconut milk)" is the culinary use. | Only a noun-sense gap; low harm. |

## Checked and cleared (so they don't get re-flagged)

- **`pelajar` / `pelajaran` labelled peN- / peN-…-an.** Defensible: Malaysian school grammar treats *pel-* as an exceptional peN- allomorph used only with *ajar*. The `ajar|peN-` allow-list in wordFamilies.test.js matches this. (Indonesian grammar files *pel-* under *per-*, but that isn't the local convention.)
- **`justeru` = 'therefore'.** Kamus Dewan senses are "precisely" and "moreover", but **DBP's own thesaurus lists *oleh itu* as a synonym**, so the gloss stands.
- **Real Kamus Dewan headwords with correct glosses:** `uniform`, `platform`, `tren`, `pengatur cara` (programmer), `berkolar`, `bersemuka`, `teruja`, `penggoreng`, `gorengan`, `pengubah`, `menanya`, `penanya`, `sapuan`, `terbaca`, `belian`, `terbangun`, `pemasak`, `pengaman`, `penyihatan`, `mengamankan`, `keamanan`.
- **Register.** Malaysian forms are used throughout: wang, pejabat, basikal, kereta, tandas, peti sejuk, kasut. No *uang*, *kantor*, *mobil* or *sepeda*. `kenapa` is marked `bp` (colloquial), which is fine for speech. `meskipun` is standard (Kamus Dewan = walaupun).
- **Checked earlier by the repo, re-confirmed:** `ijazah`, `mi`, `masak`, `pensel`, `mengehadkan`, `meninggal`/`ketinggalan`, `terdidik`.

## Ripple notes for whoever fixes these (not edits, just pointers)

- **Dictionary changes:** regenerate `dictionaryEn.js` (`npm run build:en-dict`) and pin each gloss fix with a content-truth test in `dictionary.test.js`, following the existing `ijazah`/`mi` pattern.
- **`temuduga` → `temu duga`:** also touches `dictionaryExamples.js:240` and `:274`, `dictionaryEn.js:299`, `topics.js:11`, `scenarios.js:307-324`, and `malayValidityList.js:22778`.
- **`satay` → `sate`:** also touches `scenarios.js:238` and `:243`, and `dictionaryEn.js:456`.
- **`tidak dapat lupakan`:** also `dictionaryEn.js:81`.
- **Relabelling pekerja / pekerjaan / pejalan:** adds new `pe-` and `pe-...-an` types. Check that `WordFamilyTree.jsx` has a colour style for unknown types, and keep the one-form-per-affix test green.

## Counts

- **Entries read:** 1,120
  - dictionary.js: 825
  - wordFamilies.js: 41 roots + 209 forms = 250
  - malayStarter.js: 45
  - 1,020 of these are unique headwords.
- **PRPM existence sweep:** 938 single-word headwords, 875 with their own entry. The remaining 62 are inflections, except 3 real problems (all flagged).
- **Register sweep:** 0 Indonesian-labelled headwords.
- **Flags:** 29 in total (16 dictionary + 13 word families + 0 starter deck).
  - Confidence: 20 high, 9 medium.
    - Dictionary: 10 high, 6 medium.
    - Word families: 10 high, 3 medium.
- **Verified against a cited source:** 29 of 29. PRPM for all 29, plus Wiktionary as a second source for `baru`, plus a Malaysian grammar note for the pe-/peN- labels.
- **Unverified suspicions:** 5.

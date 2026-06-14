// Academic English vocab seed — AWL Sublist 3 (the next 60 highest-frequency word
// families of Averil Coxhead's Academic Word List, 2000, after Sublists 1 & 2). A
// FREE, on-device, no-key "level up" deck for IGCSE English learners (0510 higher
// bands / 0500). Mirrors academicEn.js / academicEn2.js exactly — same entry
// shape, same study-loop contract (m = target word, e = L1 Malay gloss), studied
// as lang:'en' cards.
//
// Each entry: { m: English headword, e: verified Malay gloss, ex: an IGCSE-level
// example sentence that contains the BASE headword as a whole word (so cloze/
// produce blanking works), p: part of speech 'v'|'n'|'adj' }.
//
// Word list source: Coxhead AWL Sublist 3 (public word list; words aren't
// copyrightable) — see public/CREDITS.txt. Malay glosses are standard Bahasa
// Malaysia (DBP) academic register; the less-obvious ones (deduce → menyimpulkan,
// convene → mengadakan, negate → menafikan, imply → membayangkan, constrain →
// mengekang, compensate → memberi pampasan, correspond → sepadan, immigrate →
// berhijrah) were web-checked (Glosbe / DBP / bilingual dictionaries) before
// shipping — a wrong gloss is the confident-wrong failure a learning tool must
// avoid. British -ise spelling kept for the AWL headword (maximise).

const ACADEMIC_EN_3 = [
  { m: 'alternative', e: 'alternatif; pilihan lain', ex: 'Walking is a healthy alternative to driving.', p: 'n' },
  { m: 'circumstance', e: 'keadaan', ex: 'We must judge each circumstance on its own.', p: 'n' },
  { m: 'comment', e: 'komen; ulasan', ex: 'The teacher wrote a kind comment on my essay.', p: 'n' },
  { m: 'compensate', e: 'memberi pampasan; mengimbangi', ex: 'The company will compensate workers for the loss.', p: 'v' },
  { m: 'component', e: 'komponen', ex: 'A battery is a key component of the toy.', p: 'n' },
  { m: 'consent', e: 'persetujuan; keizinan', ex: "You need a parent's consent to join the trip.", p: 'n' },
  { m: 'considerable', e: 'banyak; ketara', ex: 'She made considerable progress this term.', p: 'adj' },
  { m: 'constant', e: 'tetap; malar', ex: 'Keep a constant speed while you cycle.', p: 'adj' },
  { m: 'constrain', e: 'mengekang; menghadkan', ex: 'A tight budget can constrain your choices.', p: 'v' },
  { m: 'contribute', e: 'menyumbang', ex: 'Everyone should contribute to the group project.', p: 'v' },
  { m: 'convene', e: 'mengadakan; memanggil', ex: 'The head will convene a meeting tomorrow.', p: 'v' },
  { m: 'coordinate', e: 'menyelaras', ex: 'Teachers coordinate the exam timetable together.', p: 'v' },
  { m: 'core', e: 'teras; inti', ex: 'Honesty is the core of her character.', p: 'n' },
  { m: 'corporate', e: 'korporat', ex: 'The bank gave a corporate gift to the school.', p: 'adj' },
  { m: 'correspond', e: 'sepadan; berhubung', ex: 'The map should correspond to the real streets.', p: 'v' },
  { m: 'criteria', e: 'kriteria', ex: 'The essay is marked against clear criteria.', p: 'n' },
  { m: 'deduce', e: 'menyimpulkan', ex: 'From the clues we can deduce who did it.', p: 'v' },
  { m: 'demonstrate', e: 'menunjukkan; mempamerkan', ex: 'Please demonstrate how the machine works.', p: 'v' },
  { m: 'document', e: 'dokumen', ex: 'Keep this document in a safe place.', p: 'n' },
  { m: 'dominate', e: 'menguasai; mendominasi', ex: 'One team began to dominate the match.', p: 'v' },
  { m: 'emphasis', e: 'penekanan; emfasis', ex: 'Put more emphasis on your main idea.', p: 'n' },
  { m: 'ensure', e: 'memastikan', ex: 'Check your work to ensure there are no errors.', p: 'v' },
  { m: 'exclude', e: 'mengecualikan; menyingkirkan', ex: 'Do not exclude anyone from the game.', p: 'v' },
  { m: 'framework', e: 'rangka kerja', ex: 'The plan gives us a clear framework to follow.', p: 'n' },
  { m: 'fund', e: 'dana; tabung', ex: 'The school set up a fund for new books.', p: 'n' },
  { m: 'illustrate', e: 'menggambarkan; mengilustrasikan', ex: 'Use an example to illustrate your point.', p: 'v' },
  { m: 'immigrate', e: 'berhijrah masuk; berimigrasi', ex: 'Her family chose to immigrate to a new country.', p: 'v' },
  { m: 'imply', e: 'membayangkan; menyiratkan', ex: 'His silence may imply that he disagrees.', p: 'v' },
  { m: 'initial', e: 'awal; permulaan', ex: 'My initial answer turned out to be wrong.', p: 'adj' },
  { m: 'instance', e: 'contoh; kejadian', ex: 'This is one instance of careless writing.', p: 'n' },
  { m: 'interact', e: 'berinteraksi', ex: 'Students interact more in small groups.', p: 'v' },
  { m: 'justify', e: 'mewajarkan', ex: 'Give reasons to justify your opinion.', p: 'v' },
  { m: 'layer', e: 'lapisan', ex: 'A thin layer of dust covered the desk.', p: 'n' },
  { m: 'link', e: 'pautan; kaitan', ex: 'There is a clear link between sleep and focus.', p: 'n' },
  { m: 'locate', e: 'mengesan; menempatkan', ex: 'Use the map to locate the library.', p: 'v' },
  { m: 'maximise', e: 'memaksimumkan', ex: 'Plan ahead to maximise your study time.', p: 'v' },
  { m: 'minor', e: 'kecil; remeh', ex: 'It was only a minor mistake.', p: 'adj' },
  { m: 'negate', e: 'menafikan; membatalkan', ex: 'One careless error can negate all your hard work.', p: 'v' },
  { m: 'outcome', e: 'hasil; keputusan', ex: 'The outcome of the match surprised everyone.', p: 'n' },
  { m: 'partner', e: 'rakan; pasangan', ex: 'Work with a partner on this task.', p: 'n' },
  { m: 'philosophy', e: 'falsafah', ex: 'Kindness is at the heart of her philosophy.', p: 'n' },
  { m: 'physical', e: 'fizikal', ex: 'Sport keeps you in good physical health.', p: 'adj' },
  { m: 'proportion', e: 'perkadaran; bahagian', ex: 'A large proportion of the class passed.', p: 'n' },
  { m: 'publish', e: 'menerbitkan', ex: 'The school will publish the results online.', p: 'v' },
  { m: 'react', e: 'bertindak balas', ex: 'How did the crowd react to the news?', p: 'v' },
  { m: 'register', e: 'mendaftar', ex: 'Please register before the first lesson.', p: 'v' },
  { m: 'rely', e: 'bergantung', ex: 'You can rely on a good friend.', p: 'v' },
  { m: 'remove', e: 'mengeluarkan; membuang', ex: 'Please remove your shoes at the door.', p: 'v' },
  { m: 'scheme', e: 'skim', ex: 'The new scheme rewards regular readers.', p: 'n' },
  { m: 'sequence', e: 'urutan; jujukan', ex: 'List the events in the correct sequence.', p: 'n' },
  { m: 'sex', e: 'jantina', ex: 'The form asks for your name, age and sex.', p: 'n' },
  { m: 'shift', e: 'anjakan; peralihan', ex: 'There has been a big shift in how we learn.', p: 'n' },
  { m: 'specify', e: 'menentukan; menyatakan', ex: 'Please specify the exact time and place.', p: 'v' },
  { m: 'sufficient', e: 'mencukupi; memadai', ex: 'Make sure you have sufficient water for the trip.', p: 'adj' },
  { m: 'task', e: 'tugas', ex: 'Finish this task before you rest.', p: 'n' },
  { m: 'technical', e: 'teknikal', ex: 'The manual is full of technical words.', p: 'adj' },
  { m: 'technique', e: 'teknik', ex: 'She learned a new painting technique.', p: 'n' },
  { m: 'technology', e: 'teknologi', ex: 'Modern technology changes how we live.', p: 'n' },
  { m: 'valid', e: 'sah', ex: 'Your ticket is valid for one month.', p: 'adj' },
  { m: 'volume', e: 'isi padu; volum', ex: 'Measure the volume of water in the jug.', p: 'n' },
]

export default ACADEMIC_EN_3

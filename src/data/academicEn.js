// Academic English vocab seed — AWL Sublist 1 (the 60 highest-frequency word
// families of Averil Coxhead's Academic Word List, 2000). A FREE, on-device,
// no-key "level up" deck for IGCSE English learners (0510 higher bands / 0500):
// the sophisticated/academic register the writing grader rewards, which the
// basic reversed-dictionary starter (dictionaryEn.js) doesn't cover.
//
// Each entry: { m: English headword, e: verified Malay gloss, ex: an IGCSE-level
// example sentence that contains the base headword (so cloze/produce blanking
// works), p: part of speech 'v'|'n'|'adj' }. Studied as lang:'en' cards (m =
// target word, e = L1 Malay gloss) exactly like the reversed-dictionary seed.
//
// Word list source: Coxhead AWL Sublist 1 (public word list; words aren't
// copyrightable) — see public/CREDITS.txt. Malay glosses are standard Bahasa
// Malaysia (DBP) academic register; the less-obvious verbs (constitute / derive
// / legislate) were cross-checked against Glosbe / Cambridge / english-malay.net
// before shipping (a wrong gloss is the confident-wrong failure a learning tool
// must avoid).

const ACADEMIC_EN = [
  { m: 'analyse', e: 'menganalisis', ex: 'Scientists analyse data before they draw conclusions.', p: 'v' },
  { m: 'approach', e: 'pendekatan', ex: 'We need a new approach to this problem.', p: 'n' },
  { m: 'area', e: 'kawasan; bidang', ex: 'This is an important area of research.', p: 'n' },
  { m: 'assess', e: 'menilai; menaksir', ex: 'Examiners assess each essay carefully.', p: 'v' },
  { m: 'assume', e: 'mengandaikan; menganggap', ex: 'Never assume an answer is right without checking.', p: 'v' },
  { m: 'authority', e: 'pihak berkuasa', ex: 'The local authority approved the new road.', p: 'n' },
  { m: 'available', e: 'tersedia; ada', ex: 'More help is available on the website.', p: 'adj' },
  { m: 'benefit', e: 'manfaat; faedah', ex: 'Daily exercise can benefit your health.', p: 'n' },
  { m: 'concept', e: 'konsep', ex: 'The concept of gravity is hard to picture.', p: 'n' },
  { m: 'consist', e: 'terdiri daripada', ex: 'These parts consist of plastic and metal.', p: 'v' },
  { m: 'constitute', e: 'membentuk; menjadikan', ex: 'Twelve months constitute one year.', p: 'v' },
  { m: 'context', e: 'konteks', ex: "A word's meaning depends on its context.", p: 'n' },
  { m: 'contract', e: 'kontrak; perjanjian', ex: 'She signed a two-year contract.', p: 'n' },
  { m: 'create', e: 'mencipta; mewujudkan', ex: 'Good writers create clear sentences.', p: 'v' },
  { m: 'data', e: 'data', ex: 'The data shows a clear upward trend.', p: 'n' },
  { m: 'define', e: 'mentakrifkan; mendefinisikan', ex: 'Please define the term in your own words.', p: 'v' },
  { m: 'derive', e: 'memperoleh; berasal', ex: 'Many English words derive from Latin.', p: 'v' },
  { m: 'distribute', e: 'mengagihkan; mengedarkan', ex: 'Volunteers distribute food to the needy.', p: 'v' },
  { m: 'economy', e: 'ekonomi', ex: 'A strong economy creates more jobs.', p: 'n' },
  { m: 'environment', e: 'persekitaran; alam sekitar', ex: 'Pollution harms the environment.', p: 'n' },
  { m: 'establish', e: 'menubuhkan; mewujudkan', ex: 'We must establish clear rules first.', p: 'v' },
  { m: 'estimate', e: 'menganggarkan', ex: 'Experts estimate the cost at one million ringgit.', p: 'v' },
  { m: 'evident', e: 'jelas; nyata', ex: 'Her hard work was evident in the result.', p: 'adj' },
  { m: 'export', e: 'mengeksport', ex: 'Some countries export more than they import.', p: 'v' },
  { m: 'factor', e: 'faktor', ex: 'Cost is an important factor in the choice.', p: 'n' },
  { m: 'finance', e: 'kewangan', ex: 'He hopes to study finance at university.', p: 'n' },
  { m: 'formula', e: 'formula; rumus', ex: 'The formula for water is H2O.', p: 'n' },
  { m: 'function', e: 'fungsi', ex: 'The main function of the heart is to pump blood.', p: 'n' },
  { m: 'identify', e: 'mengenal pasti', ex: 'Can you identify the problem here?', p: 'v' },
  { m: 'income', e: 'pendapatan', ex: 'Farming is their main source of income.', p: 'n' },
  { m: 'indicate', e: 'menunjukkan', ex: 'The results indicate a strong link.', p: 'v' },
  { m: 'individual', e: 'individu', ex: 'Every individual deserves an education.', p: 'n' },
  { m: 'interpret', e: 'mentafsir', ex: 'Readers may interpret a poem differently.', p: 'v' },
  { m: 'involve', e: 'melibatkan', ex: 'These jobs involve a lot of travel.', p: 'v' },
  { m: 'issue', e: 'isu; persoalan', ex: 'Climate change is a serious global issue.', p: 'n' },
  { m: 'labour', e: 'buruh; tenaga kerja', ex: 'The farm needs more skilled labour.', p: 'n' },
  { m: 'legal', e: 'sah; berkaitan undang-undang', ex: 'It is not legal to drive without a licence.', p: 'adj' },
  { m: 'legislate', e: 'menggubal undang-undang', ex: 'Parliament may legislate to protect workers.', p: 'v' },
  { m: 'major', e: 'utama; besar', ex: 'Pollution is a major cause of illness.', p: 'adj' },
  { m: 'method', e: 'kaedah; cara', ex: 'We used a new method to gather the data.', p: 'n' },
  { m: 'occur', e: 'berlaku', ex: 'Earthquakes occur along fault lines.', p: 'v' },
  { m: 'percent', e: 'peratus', ex: 'About ninety percent of students passed.', p: 'n' },
  { m: 'period', e: 'tempoh; zaman', ex: 'The exam covers a long period of history.', p: 'n' },
  { m: 'policy', e: 'dasar; polisi', ex: 'The school has a strict anti-bullying policy.', p: 'n' },
  { m: 'principle', e: 'prinsip', ex: 'Honesty is a principle worth keeping.', p: 'n' },
  { m: 'proceed', e: 'meneruskan', ex: 'Please proceed to the next question.', p: 'v' },
  { m: 'process', e: 'proses', ex: 'Learning a language is a slow process.', p: 'n' },
  { m: 'require', e: 'memerlukan', ex: 'These plants require very little water.', p: 'v' },
  { m: 'research', e: 'penyelidikan; kajian', ex: 'She does research on clean energy.', p: 'n' },
  { m: 'respond', e: 'bertindak balas; menjawab', ex: 'Plants respond to light by growing towards it.', p: 'v' },
  { m: 'role', e: 'peranan', ex: 'Teachers play a key role in society.', p: 'n' },
  { m: 'section', e: 'bahagian; seksyen', ex: 'Answer every question in this section.', p: 'n' },
  { m: 'sector', e: 'sektor', ex: 'Many new jobs are in the service sector.', p: 'n' },
  { m: 'significant', e: 'penting; ketara', ex: 'There was a significant rise in temperature.', p: 'adj' },
  { m: 'similar', e: 'serupa; sama', ex: 'The two designs look very similar.', p: 'adj' },
  { m: 'source', e: 'sumber', ex: 'The sun is our main source of energy.', p: 'n' },
  { m: 'specific', e: 'khusus; tertentu', ex: 'Give a specific example to support your point.', p: 'adj' },
  { m: 'structure', e: 'struktur; binaan', ex: 'A good essay needs a clear structure.', p: 'n' },
  { m: 'theory', e: 'teori', ex: 'Darwin’s theory explains how species change.', p: 'n' },
  { m: 'vary', e: 'berbeza-beza; berubah-ubah', ex: 'Prices vary from shop to shop.', p: 'v' },
]

export default ACADEMIC_EN

// Academic English vocab seed — AWL Sublist 2 (the next 60 highest-frequency word
// families of Averil Coxhead's Academic Word List, 2000, after Sublist 1). A
// FREE, on-device, no-key "level up" deck for IGCSE English learners (0510 higher
// bands / 0500): the sophisticated/academic register the writing grader rewards.
// Mirrors academicEn.js (Sublist 1) exactly — same entry shape, same study-loop
// contract (m = target word, e = L1 Malay gloss), studied as lang:'en' cards.
//
// Each entry: { m: English headword, e: verified Malay gloss, ex: an IGCSE-level
// example sentence that contains the BASE headword as a whole word (so cloze/
// produce blanking works), p: part of speech 'v'|'n'|'adj' }.
//
// Word list source: Coxhead AWL Sublist 2 (public word list; words aren't
// copyrightable) — see public/CREDITS.txt. Malay glosses are standard Bahasa
// Malaysia (DBP) academic register; the less-obvious ones (administrate →
// mentadbir, regulate → mengawal selia, consequent → berikutan, perceive →
// menanggap, commission → suruhanjaya) were web-checked (Glosbe / DBP / Wikipedia
// BM) before shipping — a wrong gloss is the confident-wrong failure a learning
// tool must avoid.

const ACADEMIC_EN_2 = [
  { m: 'achieve', e: 'mencapai', ex: 'Hard work helps you achieve your goals.', p: 'v' },
  { m: 'acquire', e: 'memperoleh; menguasai', ex: 'We acquire new words by reading widely.', p: 'v' },
  { m: 'administrate', e: 'mentadbir', ex: 'Trained officers administrate the school exams fairly.', p: 'v' },
  { m: 'affect', e: 'menjejaskan; mempengaruhi', ex: 'Lack of sleep can affect your grades.', p: 'v' },
  { m: 'appropriate', e: 'sesuai; wajar', ex: 'Choose appropriate words for a formal letter.', p: 'adj' },
  { m: 'aspect', e: 'aspek; segi', ex: 'Cost is just one aspect of the plan.', p: 'n' },
  { m: 'assist', e: 'membantu', ex: 'Older pupils assist the new students.', p: 'v' },
  { m: 'category', e: 'kategori', ex: 'Place each word in the correct category.', p: 'n' },
  { m: 'chapter', e: 'bab', ex: 'Read the first chapter before class.', p: 'n' },
  { m: 'commission', e: 'suruhanjaya; komisen', ex: 'A special commission studied the new law.', p: 'n' },
  { m: 'community', e: 'komuniti; masyarakat', ex: 'The whole community joined the clean-up.', p: 'n' },
  { m: 'complex', e: 'kompleks; rumit', ex: 'The human brain is a complex organ.', p: 'adj' },
  { m: 'compute', e: 'mengira', ex: 'Computers can compute huge sums in seconds.', p: 'v' },
  { m: 'conclude', e: 'menyimpulkan', ex: 'We can conclude that exercise improves health.', p: 'v' },
  { m: 'conduct', e: 'menjalankan; mengendalikan', ex: 'Scientists conduct experiments to test their ideas.', p: 'v' },
  { m: 'consequent', e: 'berikutan; akibat', ex: 'Heavy rain and the consequent floods closed the road.', p: 'adj' },
  { m: 'construct', e: 'membina', ex: 'Workers will construct a new library here.', p: 'v' },
  { m: 'consume', e: 'menggunakan; memakan', ex: 'Large cities consume a lot of energy.', p: 'v' },
  { m: 'credit', e: 'kredit; penghargaan', ex: 'She earned credit for her honest work.', p: 'n' },
  { m: 'culture', e: 'budaya; kebudayaan', ex: 'Food is an important part of any culture.', p: 'n' },
  { m: 'design', e: 'reka bentuk', ex: 'The bridge has a clever design.', p: 'n' },
  { m: 'distinct', e: 'jelas berbeza; tersendiri', ex: 'The two languages have a distinct sound.', p: 'adj' },
  { m: 'element', e: 'unsur; elemen', ex: 'Trust is a key element of friendship.', p: 'n' },
  { m: 'equate', e: 'menyamakan', ex: 'Do not equate being busy with being useful.', p: 'v' },
  { m: 'evaluate', e: 'menilai', ex: 'Teachers evaluate each essay carefully.', p: 'v' },
  { m: 'feature', e: 'ciri', ex: 'The main feature of the map is the river.', p: 'n' },
  { m: 'final', e: 'akhir; terakhir', ex: 'Read the final paragraph carefully.', p: 'adj' },
  { m: 'focus', e: 'fokus; tumpuan', ex: 'The focus of the lesson is grammar.', p: 'n' },
  { m: 'impact', e: 'kesan; impak', ex: 'The new rule had a big impact on traffic.', p: 'n' },
  { m: 'injure', e: 'mencederakan', ex: 'Warm up first so you do not injure yourself.', p: 'v' },
  { m: 'institute', e: 'institut', ex: 'She studies at a science institute.', p: 'n' },
  { m: 'invest', e: 'melabur', ex: 'Many people invest in property.', p: 'v' },
  { m: 'item', e: 'item; perkara', ex: 'Tick each item on the list.', p: 'n' },
  { m: 'journal', e: 'jurnal', ex: 'She records her results in a science journal.', p: 'n' },
  { m: 'maintain', e: 'mengekalkan; menyelenggara', ex: 'Brush daily to maintain healthy teeth.', p: 'v' },
  { m: 'normal', e: 'biasa; normal', ex: 'A normal body temperature is about 37°C.', p: 'adj' },
  { m: 'obtain', e: 'mendapatkan; memperoleh', ex: 'You can obtain a form at the office.', p: 'v' },
  { m: 'participate', e: 'mengambil bahagian; menyertai', ex: 'All students participate in sports day.', p: 'v' },
  { m: 'perceive', e: 'menanggap; menyedari', ex: 'Different people perceive the same event in different ways.', p: 'v' },
  { m: 'positive', e: 'positif', ex: 'She has a positive attitude towards learning.', p: 'adj' },
  { m: 'potential', e: 'potensi', ex: 'The young player has great potential.', p: 'n' },
  { m: 'previous', e: 'sebelumnya; terdahulu', ex: 'Revise the previous chapter tonight.', p: 'adj' },
  { m: 'primary', e: 'utama; primer', ex: 'Reading is the primary skill we practise.', p: 'adj' },
  { m: 'purchase', e: 'membeli', ex: 'You can purchase tickets online.', p: 'v' },
  { m: 'range', e: 'julat; pelbagai', ex: 'The shop sells a wide range of books.', p: 'n' },
  { m: 'region', e: 'kawasan; wilayah', ex: 'Heavy snow fell across the northern region.', p: 'n' },
  { m: 'regulate', e: 'mengawal selia', ex: 'Laws regulate how factories treat their waste.', p: 'v' },
  { m: 'relevant', e: 'relevan; berkaitan', ex: 'Give only relevant details in your answer.', p: 'adj' },
  { m: 'reside', e: 'menetap; bermastautin', ex: 'Many workers reside near the factory.', p: 'v' },
  { m: 'resource', e: 'sumber', ex: 'Water is a precious natural resource.', p: 'n' },
  { m: 'restrict', e: 'menyekat; mengehadkan', ex: 'Schools may restrict the use of phones.', p: 'v' },
  { m: 'secure', e: 'selamat; terjamin', ex: 'A strong password keeps your account secure.', p: 'adj' },
  { m: 'seek', e: 'mencari', ex: 'Always seek help when you are stuck.', p: 'v' },
  { m: 'select', e: 'memilih', ex: 'Select the best answer from the list.', p: 'v' },
  { m: 'site', e: 'tapak; laman', ex: 'They picked a flat site for the new school.', p: 'n' },
  { m: 'strategy', e: 'strategi', ex: 'A good revision strategy saves time.', p: 'n' },
  { m: 'survey', e: 'tinjauan; kaji selidik', ex: 'We carried out a survey of local shoppers.', p: 'n' },
  { m: 'text', e: 'teks', ex: 'Read the text twice before you answer.', p: 'n' },
  { m: 'tradition', e: 'tradisi', ex: 'Giving gifts is a lovely tradition.', p: 'n' },
  { m: 'transfer', e: 'memindahkan; pemindahan', ex: 'You can transfer money using the app.', p: 'v' },
]

export default ACADEMIC_EN_2

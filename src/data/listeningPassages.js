// IGCSE Paper 4 (Listening) practice passages.
// Designed to be played via Web Speech Synthesis. Each passage is short
// (80-150 words) and is followed by 5 IGCSE-style questions emphasising
// factual recall, inference, and gist — the three skills examined.
//
// `speakerHint` is informational only; we do not have voice-cloning, but
// the field documents the intended register so future TTS tuning (rate,
// pitch, language variant) can be applied consistently.

const LISTENING_PASSAGES = [
  // ─────────────── ENGLISH ───────────────
  {
    id: 'airport-announce',
    title: 'Flight Announcement',
    lang: 'en',
    speakerHint: 'female airport announcer, calm, brisk',
    difficulty: 'beginner',
    text: `Attention please. This is a final boarding call for passengers travelling on flight BA289 to Singapore. Please note that the boarding gate has changed from Gate 14 to Gate 22. The flight is now boarding through Gate 22, and the gate will close in fifteen minutes. Passengers who have not yet completed boarding are kindly asked to make their way to Gate 22 immediately. We remind passengers to have their boarding passes and passports ready for inspection. Once again, this is the final boarding call for flight BA289 to Singapore at Gate 22. Thank you.`,
    questions: [
      { id: 1, type: 'factual', question: 'What is the destination of the flight?', options: ['A) Sydney', 'B) Singapore', 'C) Seoul', 'D) Shanghai'], correctIndex: 1, explanation: 'The announcer says "to Singapore" twice.' },
      { id: 2, type: 'factual', question: 'What was the original boarding gate?', options: ['A) Gate 12', 'B) Gate 14', 'C) Gate 22', 'D) Gate 24'], correctIndex: 1, explanation: 'The gate has changed FROM Gate 14 TO Gate 22.' },
      { id: 3, type: 'factual', question: 'How long until the gate closes?', options: ['A) Five minutes', 'B) Ten minutes', 'C) Fifteen minutes', 'D) Twenty minutes'], correctIndex: 2, explanation: '"the gate will close in fifteen minutes".' },
      { id: 4, type: 'inference', question: 'What does the announcer expect passengers to do?', options: ['A) Wait at the original gate', 'B) Go to Gate 22 quickly', 'C) Speak to airline staff', 'D) Collect baggage'], correctIndex: 1, explanation: 'The phrase "make their way to Gate 22 immediately" tells you the urgency.' },
      { id: 5, type: 'tone', question: 'What is the tone of the announcement?', options: ['A) Friendly and casual', 'B) Polite but urgent', 'C) Apologetic and slow', 'D) Uncertain'], correctIndex: 1, explanation: 'Polite phrases like "kindly asked" combined with "final" and "immediately" signal urgency.' },
    ],
  },
  {
    id: 'voicemail-mum',
    title: 'A Voicemail from Mum',
    lang: 'en',
    speakerHint: 'warm middle-aged woman, quick pace',
    difficulty: 'intermediate',
    text: `Hi sweetheart, it's Mum. Listen, I'll be home about an hour later than usual today because the meeting at work has run on. Don't worry about dinner — I've already taken the chicken curry out of the freezer, so you just need to warm it up in the microwave for about three minutes. The rice is in the cooker; switch it on at six o'clock so it's hot by the time I'm back. Oh, and please feed the cat before you start your homework — she missed breakfast because we left so early. Also, your aunt called and she's coming over on Saturday for lunch, so don't make any plans. Love you, see you soon.`,
    questions: [
      { id: 1, type: 'factual', question: 'Why will Mum be home later?', options: ['A) Traffic', 'B) A meeting overran', 'C) She is shopping', 'D) The car broke down'], correctIndex: 1, explanation: '"the meeting at work has run on".' },
      { id: 2, type: 'factual', question: 'What needs to be done to the chicken curry?', options: ['A) Cook it from raw', 'B) Defrost it overnight', 'C) Microwave it for three minutes', 'D) Throw it out'], correctIndex: 2, explanation: 'It is already defrosted; she says "warm it up in the microwave for about three minutes".' },
      { id: 3, type: 'factual', question: 'When should the rice cooker be switched on?', options: ['A) Five o\'clock', 'B) Six o\'clock', 'C) Seven o\'clock', 'D) Eight o\'clock'], correctIndex: 1, explanation: '"switch it on at six o\'clock".' },
      { id: 4, type: 'inference', question: 'Why does the cat need feeding?', options: ['A) She is sick', 'B) She is on a diet', 'C) She missed breakfast', 'D) She had visitors'], correctIndex: 2, explanation: '"she missed breakfast because we left so early".' },
      { id: 5, type: 'inference', question: 'What is happening on Saturday?', options: ['A) A trip to the cinema', 'B) An aunt is coming for lunch', 'C) A birthday party', 'D) A family holiday'], correctIndex: 1, explanation: '"your aunt … coming over on Saturday for lunch".' },
    ],
  },
  {
    id: 'school-trip',
    title: 'Class Trip Briefing',
    lang: 'en',
    speakerHint: 'male teacher, confident, slightly fast',
    difficulty: 'intermediate',
    text: `Right everyone, before we leave on Monday I want to go through the arrangements one more time. The coach leaves the school car park at exactly half past seven, so please arrive by twenty past at the latest. We will not wait for anyone who is late. Bring a packed lunch, a refillable water bottle, and a waterproof jacket — the forecast says rain in the afternoon. You do not need to bring money for the museum because entry is included, but a small amount for the gift shop is sensible. Mobile phones are allowed but must stay on silent during the guided tour. We expect to be back at school by half past four. Any questions, see me after the bell.`,
    questions: [
      { id: 1, type: 'factual', question: 'When does the coach leave?', options: ['A) Seven o\'clock', 'B) Quarter past seven', 'C) Half past seven', 'D) Quarter to eight'], correctIndex: 2, explanation: '"The coach leaves … at exactly half past seven".' },
      { id: 2, type: 'factual', question: 'By what time should students arrive?', options: ['A) Seven o\'clock', 'B) Twenty past seven', 'C) Half past seven', 'D) Quarter to eight'], correctIndex: 1, explanation: '"please arrive by twenty past at the latest".' },
      { id: 3, type: 'factual', question: 'Why should they bring a waterproof jacket?', options: ['A) Cold weather', 'B) Rain forecast in the afternoon', 'C) The museum is outdoors', 'D) Wind warning'], correctIndex: 1, explanation: '"the forecast says rain in the afternoon".' },
      { id: 4, type: 'inference', question: 'Why is no money needed for entry?', options: ['A) The trip is cancelled', 'B) Students get free entry as residents', 'C) Entry is included in the trip', 'D) The school will collect cash later'], correctIndex: 2, explanation: '"entry is included" — the school has paid as part of the trip.' },
      { id: 5, type: 'tone', question: 'What is the teacher\'s overall manner?', options: ['A) Apologetic', 'B) Strict but practical', 'C) Tired and unenthusiastic', 'D) Joking'], correctIndex: 1, explanation: 'Phrases like "We will not wait" and "must stay on silent" set firm rules, but useful information is delivered briskly.' },
    ],
  },

  // ─────────────── BAHASA MELAYU ───────────────
  {
    id: 'pengumuman-stesen',
    title: 'Pengumuman di Stesen Bas',
    lang: 'ms',
    speakerHint: 'pengumum lelaki di stesen bas, jelas dan tegas',
    difficulty: 'intermediate',
    text: `Perhatian kepada semua penumpang. Bas Ekspres Mara nombor 207 ke Kuala Lumpur kini berlepas dari Pelantar 5, dan bukan lagi Pelantar 3 seperti yang dijadualkan asal. Penumpang yang telah membeli tiket bas tersebut diminta supaya menuju ke Pelantar 5 dengan segera. Bas akan bertolak pada pukul sebelas tiga puluh pagi, iaitu lewat lima belas minit daripada masa asal. Sila pastikan tiket dan kad pengenalan disediakan untuk pemeriksaan. Bagasi besar perlu diletakkan di ruang bawah bas, manakala beg tangan boleh dibawa naik. Sekali lagi, bas Ekspres Mara nombor 207 ke Kuala Lumpur, dari Pelantar 5, akan berlepas pada pukul sebelas tiga puluh. Terima kasih.`,
    questions: [
      { id: 1, type: 'factual', question: 'Apakah destinasi bas tersebut?', options: ['A) Johor Bahru', 'B) Kuala Lumpur', 'C) Pulau Pinang', 'D) Melaka'], correctIndex: 1, explanation: '"ke Kuala Lumpur" disebut dua kali.' },
      { id: 2, type: 'factual', question: 'Pelantar manakah yang asal?', options: ['A) Pelantar 2', 'B) Pelantar 3', 'C) Pelantar 5', 'D) Pelantar 7'], correctIndex: 1, explanation: '"bukan lagi Pelantar 3 seperti yang dijadualkan asal".' },
      { id: 3, type: 'factual', question: 'Berapa lewatkah bas itu?', options: ['A) Lima minit', 'B) Sepuluh minit', 'C) Lima belas minit', 'D) Tiga puluh minit'], correctIndex: 2, explanation: '"lewat lima belas minit daripada masa asal".' },
      { id: 4, type: 'inference', question: 'Apa yang perlu dilakukan oleh penumpang?', options: ['A) Beli tiket baharu', 'B) Tunggu di Pelantar 3', 'C) Bergerak ke Pelantar 5 segera', 'D) Pulangkan tiket'], correctIndex: 2, explanation: '"diminta supaya menuju ke Pelantar 5 dengan segera".' },
      { id: 5, type: 'factual', question: 'Di manakah bagasi besar perlu diletakkan?', options: ['A) Di bawah kerusi', 'B) Di ruang bawah bas', 'C) Di tempat duduk kosong', 'D) Tidak boleh dibawa'], correctIndex: 1, explanation: '"Bagasi besar perlu diletakkan di ruang bawah bas".' },
    ],
  },
  {
    id: 'mesej-suara-kawan',
    title: 'Mesej Suara daripada Rakan',
    lang: 'ms',
    speakerHint: 'pelajar perempuan remaja, mesra, agak laju',
    difficulty: 'beginner',
    text: `Hai, Aishah! Ini Maya. Hari Sabtu ini saya akan adakan majlis hari jadi di rumah, mulai pukul tiga petang. Datanglah, ya! Rumah saya di Taman Sri Mawar, blok B, nombor dua belas. Kalau awak tidak pasti jalan, naik teksi atau Grab — lebih senang. Tema majlis adalah warna pastel, jadi pakailah baju warna lembut seperti merah jambu, biru muda, atau hijau pucuk pisang. Awak tidak perlu bawa hadiah, tetapi kalau awak nak, kek atau makanan ringan amat dialu-alukan kerana ramai akan datang. Tolong sahkan kehadiran sebelum hari Khamis supaya saya boleh siapkan tempat duduk. Saya tunggu awak, tau! Jumpa Sabtu.`,
    questions: [
      { id: 1, type: 'factual', question: 'Bila majlis hari jadi diadakan?', options: ['A) Hari Jumaat', 'B) Hari Sabtu', 'C) Hari Ahad', 'D) Hari Khamis'], correctIndex: 1, explanation: '"Hari Sabtu ini saya akan adakan majlis hari jadi".' },
      { id: 2, type: 'factual', question: 'Pada pukul berapa majlis bermula?', options: ['A) Dua petang', 'B) Tiga petang', 'C) Empat petang', 'D) Lima petang'], correctIndex: 1, explanation: '"mulai pukul tiga petang".' },
      { id: 3, type: 'factual', question: 'Apakah tema majlis itu?', options: ['A) Warna terang', 'B) Tradisional', 'C) Warna pastel', 'D) Hitam-putih'], correctIndex: 2, explanation: '"Tema majlis adalah warna pastel".' },
      { id: 4, type: 'inference', question: 'Apa boleh dibawa jika hendak?', options: ['A) Hadiah mahal', 'B) Kek atau makanan ringan', 'C) Bunga', 'D) Permainan'], correctIndex: 1, explanation: '"kek atau makanan ringan amat dialu-alukan kerana ramai akan datang".' },
      { id: 5, type: 'factual', question: 'Bila Aishah perlu mengesahkan kehadiran?', options: ['A) Sebelum Selasa', 'B) Sebelum Rabu', 'C) Sebelum Khamis', 'D) Pada hari Sabtu'], correctIndex: 2, explanation: '"sahkan kehadiran sebelum hari Khamis".' },
    ],
  },
  {
    id: 'library-rules',
    title: 'New Library Rules',
    lang: 'en',
    speakerHint: 'school librarian, slow and clear',
    difficulty: 'beginner',
    text: `Good morning, students. From next Monday there will be a few changes to how the library operates. First, the maximum number of books you can borrow at one time will increase from three to five, but the loan period will stay the same — fourteen days. Second, the silent study area on the second floor is being extended; the whole floor is now silent, so please do not take phone calls there. The first floor remains available for group work and quiet conversation. Finally, we are introducing self-checkout machines near the entrance. You will still need to scan your student card, but you will no longer have to queue at the front desk. Please ask any of the staff if you need help during the first week.`,
    questions: [
      { id: 1, type: 'factual', question: 'How many books can students borrow at once from Monday?', options: ['A) Three', 'B) Four', 'C) Five', 'D) Six'], correctIndex: 2, explanation: '"increase from three to five".' },
      { id: 2, type: 'factual', question: 'How long is the loan period?', options: ['A) Seven days', 'B) Ten days', 'C) Fourteen days', 'D) Twenty-one days'], correctIndex: 2, explanation: '"the loan period will stay the same — fourteen days".' },
      { id: 3, type: 'factual', question: 'Which floor is now entirely silent?', options: ['A) The ground floor', 'B) The first floor', 'C) The second floor', 'D) All floors'], correctIndex: 2, explanation: '"the silent study area on the second floor is being extended; the whole floor is now silent".' },
      { id: 4, type: 'inference', question: 'Why are self-checkout machines being added?', options: ['A) Because the library is closing the front desk', 'B) To reduce queueing time', 'C) Because staff are leaving', 'D) Because students stole books'], correctIndex: 1, explanation: '"you will no longer have to queue at the front desk".' },
      { id: 5, type: 'tone', question: 'What is the librarian\'s overall manner?', options: ['A) Annoyed', 'B) Calm and informative', 'C) Apologetic', 'D) Excited'], correctIndex: 1, explanation: 'The librarian explains changes neutrally and offers help during the first week, signalling a calm, informative register.' },
    ],
  },
  {
    id: 'arahan-makmal',
    title: 'Arahan Makmal Sains',
    lang: 'ms',
    speakerHint: 'guru sains lelaki, suara tegas',
    difficulty: 'intermediate',
    text: `Selamat pagi pelajar tingkatan empat. Sebelum kita memulakan eksperimen pagi ini, sila dengar arahan keselamatan dengan teliti. Pertama, semua pelajar mesti memakai kot makmal dan cermin mata keselamatan sepanjang sesi. Sesiapa yang tidak memakai kot tidak dibenarkan memasuki kawasan eksperimen. Kedua, beg dan barangan peribadi mesti diletakkan di rak di sebelah pintu masuk, bukan di atas meja eksperimen. Ketiga, kita akan menggunakan asid hidroklorik yang cair hari ini, jadi sila berhati-hati apabila menuangnya ke dalam tabung uji. Jika asid mengenai kulit anda, basuh segera dengan air paip selama lima minit dan beritahu saya. Akhir sekali, sebarang sisa kimia mesti dimasukkan ke dalam bekas berlabel di belakang makmal — jangan tuang ke dalam sinki. Soalan? Baiklah, mari kita mula.`,
    questions: [
      { id: 1, type: 'factual', question: 'Apakah dua perkara yang mesti dipakai sepanjang sesi?', options: ['A) Sarung tangan dan topeng', 'B) Kot makmal dan cermin mata keselamatan', 'C) Topi keledar dan apron', 'D) Kasut khas dan sarung tangan'], correctIndex: 1, explanation: '"semua pelajar mesti memakai kot makmal dan cermin mata keselamatan".' },
      { id: 2, type: 'factual', question: 'Di manakah beg perlu diletakkan?', options: ['A) Di atas meja eksperimen', 'B) Di lantai bawah meja', 'C) Di rak di sebelah pintu masuk', 'D) Di luar makmal'], correctIndex: 2, explanation: '"diletakkan di rak di sebelah pintu masuk, bukan di atas meja eksperimen".' },
      { id: 3, type: 'factual', question: 'Bahan kimia apakah yang akan digunakan hari ini?', options: ['A) Asid sulfurik', 'B) Asid hidroklorik cair', 'C) Natrium hidroksida', 'D) Air ammonia'], correctIndex: 1, explanation: '"kita akan menggunakan asid hidroklorik yang cair hari ini".' },
      { id: 4, type: 'factual', question: 'Berapa lamakah kulit perlu dibasuh jika terkena asid?', options: ['A) Satu minit', 'B) Tiga minit', 'C) Lima minit', 'D) Sepuluh minit'], correctIndex: 2, explanation: '"basuh segera dengan air paip selama lima minit".' },
      { id: 5, type: 'inference', question: 'Mengapa sisa kimia tidak boleh dituang ke dalam sinki?', options: ['A) Sinki rosak', 'B) Untuk pembuangan selamat / mengelakkan pencemaran', 'C) Sinki sedang dibaiki', 'D) Tiada sebab khusus'], correctIndex: 1, explanation: 'Sisa kimia perlu dimasukkan ke dalam bekas berlabel — implikasinya adalah pembuangan selamat.' },
    ],
  },
  {
    id: 'berita-cuaca',
    title: 'Berita Cuaca Petang',
    lang: 'ms',
    speakerHint: 'pemberita perempuan, tenang dan jelas',
    difficulty: 'advanced',
    text: `Selamat petang. Berikut adalah laporan cuaca terkini dari Jabatan Meteorologi. Hujan lebat dan ribut petir dijangka melanda kawasan pantai timur, terutamanya di Kelantan, Terengganu, dan utara Pahang, bermula dari pukul lapan malam ini sehingga awal pagi esok. Para penduduk diingatkan supaya berwaspada terhadap kemungkinan banjir kilat di kawasan rendah dan kawasan berdekatan sungai. Pihak berkuasa tempatan telah mengaktifkan pusat pemindahan sementara di sekolah-sekolah berdekatan. Penduduk yang merasa terancam digesa supaya menghubungi talian kecemasan 991. Bagi pantai barat dan kawasan tengah, cuaca dijangka mendung tetapi tanpa hujan signifikan. Suhu malam dijangka antara dua puluh enam hingga dua puluh lapan darjah Celsius. Selamat malam.`,
    questions: [
      { id: 1, type: 'factual', question: 'Negeri manakah yang akan menerima hujan lebat?', options: ['A) Kedah dan Perlis', 'B) Selangor', 'C) Kelantan, Terengganu, utara Pahang', 'D) Johor'], correctIndex: 2, explanation: '"melanda kawasan pantai timur, terutamanya di Kelantan, Terengganu, dan utara Pahang".' },
      { id: 2, type: 'factual', question: 'Pukul berapa hujan dijangka mula?', options: ['A) Pukul tujuh malam', 'B) Pukul lapan malam', 'C) Pukul sembilan malam', 'D) Tengah malam'], correctIndex: 1, explanation: '"bermula dari pukul lapan malam ini".' },
      { id: 3, type: 'factual', question: 'Apakah amaran utama untuk penduduk?', options: ['A) Banjir kilat di kawasan rendah', 'B) Tanah runtuh', 'C) Ribut petir di pantai barat', 'D) Cuaca panas'], correctIndex: 0, explanation: '"berwaspada terhadap kemungkinan banjir kilat di kawasan rendah".' },
      { id: 4, type: 'factual', question: 'Apakah nombor talian kecemasan?', options: ['A) 999', 'B) 991', 'C) 994', 'D) 112'], correctIndex: 1, explanation: '"talian kecemasan 991".' },
      { id: 5, type: 'inference', question: 'Apa keadaan cuaca di pantai barat?', options: ['A) Hujan lebat', 'B) Mendung tanpa hujan signifikan', 'C) Cerah dan panas', 'D) Tidak dilaporkan'], correctIndex: 1, explanation: '"Bagi pantai barat … cuaca dijangka mendung tetapi tanpa hujan signifikan".' },
    ],
  },
];

export default LISTENING_PASSAGES;

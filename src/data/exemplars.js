// Band-5/6 exemplar paragraphs for the top IGCSE writing formats.
//
// Each exemplar shows ONE opening + ONE closing — the parts examiners
// remember most — annotated to highlight the technique that earns marks.
// Annotations use { phrase, category } where category drives a colour:
//   vocab    — sophisticated word choice
//   cohesion — discourse marker / connector
//   format   — required structural element (greeting, sign-off, etc.)
//   craft    — descriptive image, sentence variety, voice
//
// Keep paragraphs short (45-90 words) — students should be able to
// internalise them in one read. Phrases must appear verbatim in the
// surrounding text or annotation rendering will silently miss them.

const EXEMPLARS = {
  // ─────────────────────── English ───────────────────────
  'eng-narrative': {
    opening: `The clock above the platform glared 23:47 — three minutes until the last train, and the briefcase still sat unclaimed on bench seven. I had walked past it twice already, telling myself someone would come. Nobody did. My phone, dead since the meeting, offered no excuse to keep moving. So I stayed.`,
    closing: `Years later I still pass that station on the way home, and every time my eyes drift to bench seven. The briefcase is gone, of course. The lesson it left behind, however, has been harder to put down.`,
    annotations: [
      { phrase: '23:47', category: 'craft' },
      { phrase: 'glared', category: 'vocab' },
      { phrase: 'unclaimed on bench seven', category: 'craft' },
      { phrase: 'telling myself someone would come', category: 'craft' },
      { phrase: 'Nobody did', category: 'craft' },
      { phrase: 'So I stayed.', category: 'craft' },
      { phrase: 'Years later', category: 'cohesion' },
      { phrase: 'has been harder to put down', category: 'craft' },
    ],
  },

  'eng-descriptive': {
    opening: `Dawn arrived in the market the way a guest arrives uninvited — quietly, but altering everything. Lanterns dimmed against the new grey light. The smell of coriander, hot oil and damp tarpaulin braided itself into a single thread of morning, and somewhere a radio coughed into life behind a stack of mango crates.`,
    closing: `By the time the sun cleared the rooftops the market had remade itself: the haggling sharpened, the prices shifted, the dust rose ankle-high. What had felt almost private at five o'clock now belonged to everyone. A new day, like every other, and like no other.`,
    annotations: [
      { phrase: 'the way a guest arrives uninvited', category: 'craft' },
      { phrase: 'quietly, but altering everything', category: 'craft' },
      { phrase: 'coriander, hot oil and damp tarpaulin', category: 'vocab' },
      { phrase: 'braided itself into a single thread of morning', category: 'craft' },
      { phrase: 'coughed into life', category: 'vocab' },
      { phrase: 'By the time', category: 'cohesion' },
      { phrase: 'remade itself', category: 'vocab' },
      { phrase: 'A new day, like every other, and like no other', category: 'craft' },
    ],
  },

  'eng-discursive': {
    opening: `Few topics divide a school assembly faster than the mention of mobile phones in classrooms. Supporters argue that a connected pupil is a researched pupil; opponents respond that a connected pupil is a distracted one. The truth, inevitably, is more nuanced — and worth examining carefully before any blanket policy is written.`,
    closing: `On balance, then, an outright ban risks discarding a powerful learning tool to solve a problem of supervision rather than technology. A measured policy — restricted use during instruction, free use during research — would address the genuine concerns without ignoring the genuine benefits. Education is rarely improved by simple solutions to complicated questions.`,
    annotations: [
      { phrase: 'a connected pupil is a researched pupil', category: 'craft' },
      { phrase: 'opponents respond', category: 'cohesion' },
      { phrase: 'inevitably', category: 'vocab' },
      { phrase: 'more nuanced', category: 'vocab' },
      { phrase: 'On balance, then', category: 'cohesion' },
      { phrase: 'discarding a powerful learning tool', category: 'craft' },
      { phrase: 'measured policy', category: 'vocab' },
      { phrase: 'rarely improved by simple solutions to complicated questions', category: 'craft' },
    ],
  },

  'eng-letter-formal': {
    opening: `Dear Sir or Madam,\n\nI am writing to express my serious concern regarding the proposed closure of the public library in Section 14, as reported in the local press last week. As a regular user and a Year 11 student preparing for major examinations, I should like to set out, respectfully but firmly, why this decision deserves to be reconsidered.`,
    closing: `For these reasons I would urge the Council to suspend the closure pending a full public consultation. I am of course willing to provide further evidence, including signatures from over two hundred fellow students, should this be helpful to the committee.\n\nI look forward to your reply.\n\nYours faithfully,\nNur Aisyah`,
    annotations: [
      { phrase: 'Dear Sir or Madam,', category: 'format' },
      { phrase: 'I am writing to express my serious concern', category: 'format' },
      { phrase: 'as reported in the local press last week', category: 'craft' },
      { phrase: 'respectfully but firmly', category: 'craft' },
      { phrase: 'For these reasons', category: 'cohesion' },
      { phrase: 'pending a full public consultation', category: 'vocab' },
      { phrase: 'I look forward to your reply.', category: 'format' },
      { phrase: 'Yours faithfully,', category: 'format' },
    ],
  },

  'eng-article': {
    opening: `Walk past any school gate at half past three and you will see them — heads tilted, thumbs flying, the world reduced to a glowing rectangle. We have somehow turned a generation into stenographers of their own lives. The question is whether this constant documenting is enriching the experience, or quietly replacing it.`,
    closing: `In the end, the camera roll will outlive the sunset; the scroll will outlast the conversation. That, perhaps, is the trade we have agreed to without ever quite noticing. The next time the phone rises automatically, it might be worth asking — for whom, exactly, are we filming?`,
    annotations: [
      { phrase: 'half past three', category: 'craft' },
      { phrase: 'heads tilted, thumbs flying', category: 'craft' },
      { phrase: 'reduced to a glowing rectangle', category: 'vocab' },
      { phrase: 'stenographers of their own lives', category: 'craft' },
      { phrase: 'In the end', category: 'cohesion' },
      { phrase: 'will outlive', category: 'vocab' },
      { phrase: 'will outlast', category: 'vocab' },
      { phrase: 'for whom, exactly, are we filming?', category: 'craft' },
    ],
  },

  'eng-speech': {
    opening: `Good morning, headteacher, fellow students, distinguished guests.\n\nLet me begin with a question. How many of you have ever waited for a bus that never came? Most of you, I imagine. Now, how many of you have stopped to wonder why? That, in essence, is the question I want to put to you today: why do we accept inconvenience as a fact of life, when often it is simply a fact of design?`,
    closing: `So I leave you with this. Change does not begin with grand speeches in a hall — it begins with a single complaint, a single petition, a single voice that refuses to be told that this is simply how things are. Today, that voice can be yours.\n\nThank you.`,
    annotations: [
      { phrase: 'Good morning, headteacher, fellow students, distinguished guests.', category: 'format' },
      { phrase: 'Let me begin with a question.', category: 'craft' },
      { phrase: 'how many of you have stopped to wonder why?', category: 'craft' },
      { phrase: 'in essence', category: 'cohesion' },
      { phrase: 'fact of life', category: 'craft' },
      { phrase: 'fact of design', category: 'craft' },
      { phrase: 'So I leave you with this.', category: 'cohesion' },
      { phrase: 'a single complaint, a single petition, a single voice', category: 'craft' },
      { phrase: 'Thank you.', category: 'format' },
    ],
  },

  'eng-review': {
    opening: `When a film opens with a sixty-second silent shot of a kettle boiling, you know the director is either very confident or very lost. In the case of *The Long Quiet*, released last month, it turns out to be both — a slow, deliberate study of a marriage that has nothing left to say, and refuses to admit it.`,
    closing: `The film is not for everyone. Audiences hoping for narrative momentum will be checking their watches by the second act. But for viewers willing to sit with a silence and let it do its work, *The Long Quiet* offers some of the most honest filmmaking of the year. Recommended — but only to the patient.`,
    annotations: [
      { phrase: 'sixty-second silent shot of a kettle boiling', category: 'craft' },
      { phrase: 'either very confident or very lost', category: 'craft' },
      { phrase: 'slow, deliberate study', category: 'vocab' },
      { phrase: 'has nothing left to say, and refuses to admit it', category: 'craft' },
      { phrase: 'narrative momentum', category: 'vocab' },
      { phrase: 'sit with a silence and let it do its work', category: 'craft' },
      { phrase: 'Recommended — but only to the patient.', category: 'format' },
    ],
  },

  // ─────────────────────── Malay ───────────────────────
  'ms-cerita': {
    opening: `Pukul 11.42 malam, hujan turun seperti enggan berhenti, dan saya masih berdiri di hentian bas yang sudah lama dilupakan oleh dunia. Sehelai surat lusuh dalam tangan, gemetar lebih daripada hujan itu sendiri. Surat yang sepatutnya saya hantar dua puluh tahun yang lalu. Surat yang akhirnya, malam itu, terpaksa saya hadapi.`,
    closing: `Apabila bas terakhir akhirnya tiba, saya tidak menaikinya. Surat itu, kini basah, telah saya selitkan ke dalam celah bangku — biar siapa-siapa yang menemuinya nanti membuka sendiri ceritanya. Sesetengah perjalanan, saya akhirnya faham, lebih baik ditinggalkan separuh jalan daripada dihabiskan dengan paksa.`,
    annotations: [
      { phrase: 'Pukul 11.42 malam', category: 'craft' },
      { phrase: 'seperti enggan berhenti', category: 'craft' },
      { phrase: 'sudah lama dilupakan oleh dunia', category: 'vocab' },
      { phrase: 'gemetar lebih daripada hujan itu sendiri', category: 'craft' },
      { phrase: 'akhirnya', category: 'cohesion' },
      { phrase: 'saya selitkan ke dalam celah bangku', category: 'craft' },
      { phrase: 'Sesetengah perjalanan', category: 'craft' },
      { phrase: 'lebih baik ditinggalkan separuh jalan daripada dihabiskan dengan paksa', category: 'craft' },
    ],
  },

  'ms-keperihalan': {
    opening: `Subuh di pasar tani itu tiba diam-diam, seperti tetamu yang segan menumpang. Lampu kalimantang malap satu demi satu, digantikan cahaya kelabu yang baru. Bau ketumbar, minyak panas dan kanvas lembap berjalin menjadi seutas benang pagi, dan dari sebalik tumpukan peti mangga, sebuah radio terbatuk-batuk hidup.`,
    closing: `Apabila matahari akhirnya tinggi, pasar itu telah membentuk dirinya semula: tawar-menawar menjadi tajam, harga berubah, debu naik separas buku lali. Apa yang tadi terasa hampir peribadi pada pukul lima, kini menjadi milik semua orang. Sebuah pagi yang sama seperti pagi-pagi lain — dan tidak pernah serupa.`,
    annotations: [
      { phrase: 'seperti tetamu yang segan menumpang', category: 'craft' },
      { phrase: 'Bau ketumbar, minyak panas dan kanvas lembap', category: 'vocab' },
      { phrase: 'berjalin menjadi seutas benang pagi', category: 'craft' },
      { phrase: 'terbatuk-batuk hidup', category: 'vocab' },
      { phrase: 'Apabila matahari akhirnya tinggi', category: 'cohesion' },
      { phrase: 'membentuk dirinya semula', category: 'vocab' },
      { phrase: 'separas buku lali', category: 'craft' },
      { phrase: 'sama seperti pagi-pagi lain — dan tidak pernah serupa', category: 'craft' },
    ],
  },

  'ms-rencana': {
    opening: `Penggunaan media sosial dalam kalangan remaja kini bukan lagi sekadar hiburan, malah telah menjelma sebagai sebahagian daripada cara mereka mendefinisikan diri. Persoalan yang lebih wajar diajukan bukanlah sama ada platform ini baik atau buruk, sebaliknya, sejauh mana penggunanya mampu menjadi tuan kepada peranti, bukan hambanya.`,
    closing: `Justeru, langkah ke hadapan bukan terletak pada larangan menyeluruh, sebaliknya pada pendidikan literasi digital yang mantap, kawalan ibu bapa yang berhemah, dan kesedaran kendiri remaja itu sendiri. Apabila ketiga-tiga tonggak ini bergerak seiring, barulah teknologi kembali kepada peranannya yang asal — alat, bukan tuan.`,
    annotations: [
      { phrase: 'menjelma sebagai sebahagian daripada cara mereka mendefinisikan diri', category: 'craft' },
      { phrase: 'sebaliknya', category: 'cohesion' },
      { phrase: 'sejauh mana', category: 'cohesion' },
      { phrase: 'menjadi tuan kepada peranti, bukan hambanya', category: 'craft' },
      { phrase: 'Justeru', category: 'cohesion' },
      { phrase: 'literasi digital yang mantap', category: 'vocab' },
      { phrase: 'berhemah', category: 'vocab' },
      { phrase: 'tonggak', category: 'vocab' },
      { phrase: 'alat, bukan tuan', category: 'craft' },
    ],
  },

  'ms-surat-rasmi': {
    opening: `Pengetua,\nSekolah Menengah Kebangsaan Seri Damai,\n40000 Shah Alam.\n\nTuan,\n\nCadangan Mengadakan Kempen Kesedaran Pemakanan Sihat di Sekolah\n\nDengan segala hormatnya, perkara di atas adalah dirujuk. Saya, selaku Pengerusi Kelab Kesihatan, mewakili ahli jawatankuasa ingin mengemukakan cadangan tersebut untuk dilaksanakan pada bulan Julai akan datang.`,
    closing: `Sehubungan dengan itu, kami amat berbesar hati sekiranya tuan dapat mempertimbangkan cadangan ini sebaik mungkin. Sebarang maklum balas atau cadangan tambahan dari pihak tuan amatlah kami alu-alukan demi kejayaan program ini.\n\nSekian, terima kasih.\n\nYang benar,\n.................................\n(NUR AISYAH BINTI HASSAN)\nPengerusi Kelab Kesihatan`,
    annotations: [
      { phrase: 'Tuan,', category: 'format' },
      { phrase: 'Cadangan Mengadakan Kempen Kesedaran Pemakanan Sihat di Sekolah', category: 'format' },
      { phrase: 'Dengan segala hormatnya, perkara di atas adalah dirujuk.', category: 'format' },
      { phrase: 'selaku', category: 'vocab' },
      { phrase: 'mewakili ahli jawatankuasa', category: 'vocab' },
      { phrase: 'Sehubungan dengan itu', category: 'cohesion' },
      { phrase: 'amatlah kami alu-alukan', category: 'vocab' },
      { phrase: 'Sekian, terima kasih.', category: 'format' },
      { phrase: 'Yang benar,', category: 'format' },
    ],
  },

  'ms-ucapan': {
    opening: `Yang Berusaha, Tuan Pengerusi Majlis, Yang Berbahagia Tuan Pengetua, barisan guru yang dihormati, dan rakan-rakan pelajar yang saya kasihi.\n\nAssalamualaikum dan salam sejahtera.\n\nIzinkan saya memulakan ucapan ini dengan satu soalan: pernahkah anda menunggu bas yang tidak pernah tiba? Hampir kesemua kita pernah. Namun berapa ramai antara kita yang sempat bertanya — mengapa? Itulah persoalan yang ingin saya kemukakan pada pagi yang berbahagia ini.`,
    closing: `Justeru, saya tinggalkan kepada hadirin sekalian satu pesan terakhir. Perubahan tidak bermula dengan ucapan yang panjang lebar di dewan, sebaliknya dengan satu suara, satu aduan, satu langkah kecil yang enggan menerima keadaan begitu sahaja. Hari ini, suara itu boleh menjadi suara kita.\n\nSekian, terima kasih.`,
    annotations: [
      { phrase: 'Yang Berusaha, Tuan Pengerusi Majlis, Yang Berbahagia Tuan Pengetua', category: 'format' },
      { phrase: 'Assalamualaikum dan salam sejahtera.', category: 'format' },
      { phrase: 'Izinkan saya memulakan ucapan ini dengan satu soalan', category: 'craft' },
      { phrase: 'Justeru', category: 'cohesion' },
      { phrase: 'saya tinggalkan kepada hadirin sekalian satu pesan terakhir', category: 'craft' },
      { phrase: 'satu suara, satu aduan, satu langkah kecil', category: 'craft' },
      { phrase: 'enggan menerima keadaan begitu sahaja', category: 'vocab' },
      { phrase: 'Sekian, terima kasih.', category: 'format' },
    ],
  },

  'ms-fakta': {
    opening: `Menurut Laporan Tahunan Kementerian Kesihatan Malaysia 2024, hampir 50 peratus rakyat dewasa kini berada dalam kategori berat berlebihan atau obes. Statistik ini bukan sekadar angka, sebaliknya cermin kepada gaya hidup moden yang semakin menjauhi prinsip pemakanan seimbang. Hal ini wajar diteliti dari pelbagai sudut sebelum sebarang penyelesaian dirangka.`,
    closing: `Kesimpulannya, berdasarkan fakta-fakta yang dikemukakan, jelaslah bahawa krisis pemakanan tidak boleh diselesaikan melalui kempen jangka pendek semata-mata. Pendekatan bersepadu antara pihak kerajaan, sekolah, dan keluarga merupakan satu-satunya jalan ke hadapan yang berkesan dan berpanjangan.`,
    annotations: [
      { phrase: 'Menurut Laporan Tahunan Kementerian Kesihatan Malaysia 2024', category: 'format' },
      { phrase: 'hampir 50 peratus', category: 'craft' },
      { phrase: 'sebaliknya cermin kepada gaya hidup moden', category: 'craft' },
      { phrase: 'Hal ini wajar diteliti dari pelbagai sudut', category: 'cohesion' },
      { phrase: 'Kesimpulannya', category: 'cohesion' },
      { phrase: 'berdasarkan fakta-fakta yang dikemukakan', category: 'cohesion' },
      { phrase: 'Pendekatan bersepadu', category: 'vocab' },
      { phrase: 'berpanjangan', category: 'vocab' },
    ],
  },

  'ms-dialog': {
    opening: `"Awak masih simpan surat itu?" tanya Faridah, suaranya rendah, hampir berbisik.\n\n"Surat yang mana?" Aku berpura-pura tidak faham, walaupun aku tahu ia tersimpan rapi di dalam laci sebelah katil.\n\n"Yang dari arwah ayah awak. Dua puluh tahun dahulu," jawabnya perlahan, seperti takut menyinggung sesuatu yang lebih dalam.`,
    closing: `"Mungkin sudah tiba masanya," kataku akhirnya.\n\n"Untuk?" Faridah memandang aku dengan matanya yang penuh tanda tanya.\n\n"Untuk berhenti menyimpan apa yang sepatutnya saya lepaskan," jawabku.\n\nDia hanya tersenyum. Sebuah senyuman yang sukar diterjemahkan, tetapi mudah difahami.`,
    annotations: [
      { phrase: '"Awak masih simpan surat itu?" tanya Faridah', category: 'format' },
      { phrase: 'suaranya rendah, hampir berbisik', category: 'craft' },
      { phrase: 'Aku berpura-pura tidak faham', category: 'craft' },
      { phrase: 'jawabnya perlahan', category: 'format' },
      { phrase: 'seperti takut menyinggung sesuatu yang lebih dalam', category: 'craft' },
      { phrase: 'Sebuah senyuman yang sukar diterjemahkan, tetapi mudah difahami.', category: 'craft' },
    ],
  },

  // ─────── Round 2: high-frequency formats added 2026-05-09 ───────

  'eng-letter-informal': {
    opening: `Dear Aishah,\n\nI know I owe you a proper letter — a long one — so here it finally is. Things have been chaotic since the move, but the chaos has finally settled into a shape I can describe, which is more than I could say last month. I hope life on your side has been kinder.`,
    closing: `Anyway, I will stop here before this turns into a small novel. Write back soon — I genuinely want all the boring details. The way you described that little café in your last letter is exactly the kind of thing I miss reading.\n\nLooking forward to hearing from you,\nNur`,
    annotations: [
      { phrase: 'Dear Aishah,', category: 'format' },
      { phrase: 'I know I owe you a proper letter', category: 'craft' },
      { phrase: 'the chaos has finally settled into a shape I can describe', category: 'craft' },
      { phrase: 'on your side', category: 'craft' },
      { phrase: 'before this turns into a small novel', category: 'craft' },
      { phrase: 'genuinely want all the boring details', category: 'craft' },
      { phrase: 'Looking forward to hearing from you,', category: 'format' },
    ],
  },

  'eng-email': {
    opening: `Subject: Request to Reschedule Tomorrow's Project Meeting\n\nDear Mr Tan,\n\nI hope this email finds you well. I am writing on behalf of the Year 11 robotics team to request that tomorrow's progress meeting be moved from 3:30 pm to 4:30 pm. Unfortunately, an unavoidable rehearsal for the school production has been scheduled at the same time.`,
    closing: `If 4:30 pm is not workable, we would be equally happy to meet on Thursday at any time that suits you. We are conscious that you have a very full week, and we appreciate your flexibility.\n\nThank you very much for considering this.\n\nBest regards,\nNur Aisyah Hassan\nYear 11, on behalf of the Robotics Team`,
    annotations: [
      { phrase: 'Subject: Request to Reschedule Tomorrow\'s Project Meeting', category: 'format' },
      { phrase: 'Dear Mr Tan,', category: 'format' },
      { phrase: 'I hope this email finds you well.', category: 'format' },
      { phrase: 'on behalf of the Year 11 robotics team', category: 'craft' },
      { phrase: 'an unavoidable rehearsal', category: 'vocab' },
      { phrase: 'we would be equally happy', category: 'craft' },
      { phrase: 'we appreciate your flexibility', category: 'craft' },
      { phrase: 'Best regards,', category: 'format' },
    ],
  },

  'eng-report': {
    opening: `Title: Report on the Effectiveness of the School's Recycling Programme (2024-2025)\n\nIntroduction\nThis report has been prepared for the school management committee at the request of the Environmental Club. It evaluates the recycling programme launched in January 2024 and recommends how it might be improved before the next academic year.`,
    closing: `Recommendations\nIn light of the findings above, three measures are proposed: (1) install clearly-labelled recycling stations on every floor, not only the ground floor; (2) integrate a five-minute recycling segment into the weekly assembly to sustain awareness; (3) appoint Year 10 stewards to monitor each station and record participation rates monthly.\n\nIf adopted, these measures would address the principal weaknesses identified and would, in the view of the committee, make the programme genuinely sustainable.`,
    annotations: [
      { phrase: 'Title: Report on the Effectiveness of the School\'s Recycling Programme (2024-2025)', category: 'format' },
      { phrase: 'Introduction', category: 'format' },
      { phrase: 'This report has been prepared for', category: 'format' },
      { phrase: 'at the request of', category: 'cohesion' },
      { phrase: 'Recommendations', category: 'format' },
      { phrase: 'In light of the findings above', category: 'cohesion' },
      { phrase: 'three measures are proposed', category: 'format' },
      { phrase: 'sustain awareness', category: 'vocab' },
      { phrase: 'genuinely sustainable', category: 'vocab' },
    ],
  },

  'ms-surat-tidak-rasmi': {
    opening: `Buat sahabat sejati,\nNur Aisyah,\n\nApa khabar di sana? Saya berdoa agar kekanda dan keluarga sentiasa di dalam keadaan sihat sejahtera. Maaflah lambat membalas — sejak pulang ke kampung minggu lepas, banyak benar perkara yang berlaku, hingga jari saya pun rasa terlalu malas untuk menulis semula.`,
    closing: `Eh, panjang sudah surat ini. Cukup setakat ini dahulu — nanti saya sambung lagi minggu depan. Kirim salam saya kepada mak cik dan pak cik di sana ya. Jangan lupa balas surat ini cepat-cepat, saya rindu mendengar cerita kekanda.\n\nSalam sayang dari sahabat,\nFaridah`,
    annotations: [
      { phrase: 'Buat sahabat sejati,', category: 'format' },
      { phrase: 'Apa khabar di sana?', category: 'format' },
      { phrase: 'sentiasa di dalam keadaan sihat sejahtera', category: 'craft' },
      { phrase: 'Maaflah lambat membalas', category: 'craft' },
      { phrase: 'jari saya pun rasa terlalu malas untuk menulis semula', category: 'craft' },
      { phrase: 'Cukup setakat ini dahulu', category: 'format' },
      { phrase: 'Kirim salam saya kepada', category: 'format' },
      { phrase: 'Salam sayang dari sahabat,', category: 'format' },
    ],
  },

  'ms-laporan': {
    opening: `Tajuk: Laporan Lawatan Sambil Belajar ke Pusat Sains Negara\n\nPendahuluan\nPada hari Jumaat lalu, sekumpulan empat puluh lima orang pelajar Tingkatan 4 dari Sekolah Menengah Kebangsaan Seri Damai telah mengadakan lawatan sambil belajar ke Pusat Sains Negara. Lawatan ini bertujuan untuk mendedahkan pelajar kepada perkembangan sains dan teknologi terkini secara langsung.`,
    closing: `Cadangan\nBerdasarkan tinjauan yang dibuat, dicadangkan agar lawatan seumpama ini diadakan sekurang-kurangnya dua kali setahun. Selain itu, masa di setiap pameran perlu dipanjangkan agar pelajar dapat meneroka dengan lebih mendalam.\n\nDisediakan oleh,\nNur Aisyah binti Hassan\nSetiausaha Kelab Sains`,
    annotations: [
      { phrase: 'Tajuk: Laporan Lawatan Sambil Belajar ke Pusat Sains Negara', category: 'format' },
      { phrase: 'Pendahuluan', category: 'format' },
      { phrase: 'Pada hari Jumaat lalu', category: 'cohesion' },
      { phrase: 'Lawatan ini bertujuan untuk', category: 'format' },
      { phrase: 'Cadangan', category: 'format' },
      { phrase: 'Berdasarkan tinjauan yang dibuat', category: 'cohesion' },
      { phrase: 'meneroka dengan lebih mendalam', category: 'vocab' },
      { phrase: 'Disediakan oleh,', category: 'format' },
    ],
  },

  'ms-wawancara': {
    opening: `Wartawan: Selamat petang, Cikgu Aminah. Terima kasih kerana sudi meluangkan masa untuk sesi temu bual kami pada petang ini.\n\nCikgu Aminah: Sama-sama. Saya berbesar hati dapat berkongsi pengalaman dengan pembaca majalah sekolah.\n\nWartawan: Bolehkah cikgu berkongsi apakah cabaran terbesar yang cikgu hadapi sebagai guru baharu pada tahun pertama bertugas?`,
    closing: `Wartawan: Akhir sekali, apakah pesan cikgu kepada para pelajar yang bercita-cita menjadi guru?\n\nCikgu Aminah: Pesan saya, jangan jadi guru sekadar kerana ia kerja yang stabil. Jadilah guru kerana anda benar-benar percaya pada potensi setiap pelajar — kerana hari yang anda hilang sabar adalah hari yang seorang pelajar paling perlukan anda.\n\nWartawan: Terima kasih, cikgu, atas perkongsian yang amat bermakna ini.`,
    annotations: [
      { phrase: 'Wartawan:', category: 'format' },
      { phrase: 'Cikgu Aminah:', category: 'format' },
      { phrase: 'Terima kasih kerana sudi meluangkan masa', category: 'format' },
      { phrase: 'Bolehkah cikgu berkongsi', category: 'format' },
      { phrase: 'cabaran terbesar yang cikgu hadapi', category: 'craft' },
      { phrase: 'Akhir sekali', category: 'cohesion' },
      { phrase: 'jangan jadi guru sekadar kerana ia kerja yang stabil', category: 'craft' },
      { phrase: 'hari yang anda hilang sabar adalah hari yang seorang pelajar paling perlukan anda', category: 'craft' },
      { phrase: 'Terima kasih, cikgu, atas perkongsian', category: 'format' },
    ],
  },

  'ms-berita': {
    opening: `BANJIR KILAT MELANDA TIGA KAMPUNG DI HULU LANGAT\n\nKuala Lumpur, 8 Mei — Hujan lebat berterusan sejak awal pagi semalam telah menyebabkan banjir kilat melanda tiga kampung di daerah Hulu Langat, Selangor. Menurut sumber daripada Agensi Pengurusan Bencana Negara (NADMA), seramai dua ratus enam belas orang penduduk telah dipindahkan ke pusat pemindahan sementara di Dewan Orang Ramai Sungai Tekala.`,
    closing: `Pengarah NADMA, Datuk Mohd Faizal, dalam sidang medianya petang tadi, berkata operasi pemindahan masih berjalan dan dijangka selesai sebelum tengah malam ini. "Keselamatan penduduk adalah keutamaan kami. Kami menggesa orang ramai supaya tidak kembali ke rumah masing-masing sehingga pengisytiharan rasmi dikeluarkan," tegasnya.\n\nSementara itu, pihak Jabatan Meteorologi telah mengeluarkan amaran cuaca buruk berterusan sehingga Khamis ini.`,
    annotations: [
      { phrase: 'BANJIR KILAT MELANDA TIGA KAMPUNG DI HULU LANGAT', category: 'format' },
      { phrase: 'Kuala Lumpur, 8 Mei —', category: 'format' },
      { phrase: 'Menurut sumber daripada', category: 'format' },
      { phrase: 'seramai dua ratus enam belas orang', category: 'craft' },
      { phrase: 'Pengarah NADMA', category: 'format' },
      { phrase: 'dalam sidang medianya petang tadi', category: 'format' },
      { phrase: 'tegasnya', category: 'format' },
      { phrase: 'Sementara itu', category: 'cohesion' },
      { phrase: 'mengeluarkan amaran cuaca buruk', category: 'vocab' },
    ],
  },
}

export function getExemplar(formatId) {
  return EXEMPLARS[formatId] || null
}

export function listExemplarFormats() {
  return Object.keys(EXEMPLARS)
}

export default EXEMPLARS

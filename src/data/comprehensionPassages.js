/**
 * IGCSE Paper 1 comprehension passages with pre-written questions.
 * Used as fallback when AI question generation is unavailable.
 * Topics aligned with IGCSE themes.
 */

const COMPREHENSION_PASSAGES = [
  {
    id: 'gotong-royong',
    title: 'Gotong-Royong di Kampung',
    titleEn: 'Community Clean-Up',
    topic: 'komuniti',
    difficulty: 'intermediate',
    lang: 'ms',
    text: `Pada hari Sabtu yang lalu, penduduk Kampung Seri Mawar telah mengadakan aktiviti gotong-royong. Aktiviti ini diadakan untuk membersihkan kawasan kampung sebelum musim hujan tiba. Seramai lima puluh orang penduduk telah menyertai aktiviti tersebut.

Ketua kampung, Encik Ahmad, telah memulakan ucapan pada pukul lapan pagi. Beliau menggalakkan semua penduduk supaya bekerjasama untuk menjaga kebersihan kampung. Selepas itu, penduduk dibahagikan kepada beberapa kumpulan. Ada yang membersihkan longkang, ada yang memotong rumput, dan ada yang mengutip sampah sarap.

Menjelang tengah hari, kawasan kampung sudah kelihatan bersih dan kemas. Semua penduduk berasa gembira kerana usaha mereka berjaya. Pihak MPKK juga menyediakan makanan dan minuman untuk semua peserta. Semangat kerjasama dalam kalangan penduduk amat membanggakan.`,
    questions: [
      {
        id: 1, type: 'factual',
        question: 'Bilakah aktiviti gotong-royong diadakan?',
        questionEn: 'When was the community clean-up held?',
        options: ['A) Hari Isnin', 'B) Hari Sabtu', 'C) Hari Ahad', 'D) Hari Jumaat'],
        correctIndex: 1,
        explanation: 'The passage states "Pada hari Sabtu yang lalu".',
        referenceText: 'Pada hari Sabtu yang lalu, penduduk Kampung Seri Mawar telah mengadakan aktiviti gotong-royong.',
      },
      {
        id: 2, type: 'vocabulary',
        question: 'Apakah maksud "menggalakkan" dalam petikan ini?',
        questionEn: 'What does "menggalakkan" mean in this passage?',
        options: ['A) Melarang', 'B) Mendorong', 'C) Menghukum', 'D) Menghalang'],
        correctIndex: 1,
        explanation: '"Menggalakkan" means to encourage/urge. Root: galak (enthusiastic) + meN-...-kan.',
        referenceText: 'Beliau menggalakkan semua penduduk supaya bekerjasama.',
      },
      {
        id: 3, type: 'inference',
        question: 'Mengapakah gotong-royong diadakan sebelum musim hujan?',
        questionEn: 'Why was the clean-up held before the rainy season?',
        options: ['A) Supaya penduduk tidak bosan', 'B) Untuk mengelakkan banjir dan masalah kesihatan', 'C) Kerana ketua kampung menyuruh', 'D) Untuk meraikan hari kemerdekaan'],
        correctIndex: 1,
        explanation: 'Cleaning drains and clearing rubbish before rainy season prevents flooding and health issues.',
        referenceText: 'Aktiviti ini diadakan untuk membersihkan kawasan kampung sebelum musim hujan tiba.',
      },
      {
        id: 4, type: 'main_idea',
        question: 'Apakah idea utama petikan ini?',
        questionEn: 'What is the main idea of this passage?',
        options: ['A) Masalah pencemaran di kampung', 'B) Semangat kerjasama penduduk kampung', 'C) Ucapan ketua kampung', 'D) Makanan yang disediakan'],
        correctIndex: 1,
        explanation: 'The passage emphasizes community cooperation during gotong-royong.',
        referenceText: 'Semangat kerjasama dalam kalangan penduduk amat membanggakan.',
      },
      {
        id: 5, type: 'grammar',
        question: 'Dalam ayat "penduduk dibahagikan kepada beberapa kumpulan", apakah jenis ayat ini?',
        questionEn: 'What type of sentence is "penduduk dibahagikan kepada beberapa kumpulan"?',
        options: ['A) Ayat aktif', 'B) Ayat pasif', 'C) Ayat tanya', 'D) Ayat perintah'],
        correctIndex: 1,
        explanation: '"Dibahagikan" uses the di- prefix, indicating passive voice. The subject (penduduk) receives the action.',
        referenceText: 'penduduk dibahagikan kepada beberapa kumpulan',
      },
    ]
  },
  {
    id: 'teknologi',
    title: 'Teknologi dalam Pendidikan',
    titleEn: 'Technology in Education',
    topic: 'pendidikan',
    difficulty: 'intermediate',
    lang: 'ms',
    text: `Penggunaan teknologi dalam pendidikan semakin meluas di Malaysia. Banyak sekolah kini menggunakan komputer riba dan tablet untuk proses pembelajaran. Guru-guru juga telah mula menggunakan aplikasi dalam talian untuk mengajar murid-murid mereka.

Menurut kajian terbaru, pelajar yang menggunakan teknologi dalam pembelajaran menunjukkan peningkatan sebanyak dua puluh peratus dalam keputusan peperiksaan. Walau bagaimanapun, terdapat juga kesan negatif. Sesetengah pelajar menghabiskan terlalu banyak masa di hadapan skrin dan mengabaikan aktiviti fizikal.

Oleh itu, keseimbangan antara penggunaan teknologi dan aktiviti tradisional amat penting. Ibu bapa dan guru perlu memantau penggunaan teknologi oleh pelajar. Dengan pendekatan yang betul, teknologi boleh menjadi alat yang berkesan untuk meningkatkan kualiti pendidikan di negara kita.`,
    questions: [
      {
        id: 1, type: 'factual',
        question: 'Berapakah peningkatan keputusan peperiksaan menurut kajian?',
        questionEn: 'How much did exam results improve according to the study?',
        options: ['A) 10%', 'B) 15%', 'C) 20%', 'D) 25%'],
        correctIndex: 2,
        explanation: 'The passage states "peningkatan sebanyak dua puluh peratus".',
        referenceText: 'pelajar yang menggunakan teknologi dalam pembelajaran menunjukkan peningkatan sebanyak dua puluh peratus',
      },
      {
        id: 2, type: 'vocabulary',
        question: 'Apakah maksud "memantau" dalam petikan?',
        questionEn: 'What does "memantau" mean in this passage?',
        options: ['A) Mengajar', 'B) Mengawasi', 'C) Menghukum', 'D) Membeli'],
        correctIndex: 1,
        explanation: '"Memantau" means to monitor/supervise. Root: pantau + meN-.',
        referenceText: 'Ibu bapa dan guru perlu memantau penggunaan teknologi oleh pelajar.',
      },
      {
        id: 3, type: 'inference',
        question: 'Mengapakah penulis menyebut kesan negatif teknologi?',
        questionEn: 'Why does the author mention the negative effects of technology?',
        options: ['A) Untuk menakutkan pelajar', 'B) Untuk menunjukkan perlunya keseimbangan', 'C) Untuk melarang penggunaan teknologi', 'D) Untuk menyalahkan guru'],
        correctIndex: 1,
        explanation: 'The author mentions negatives to argue for balance, not to ban technology.',
        referenceText: 'keseimbangan antara penggunaan teknologi dan aktiviti tradisional amat penting',
      },
      {
        id: 4, type: 'main_idea',
        question: 'Apakah mesej utama petikan ini?',
        questionEn: 'What is the main message of this passage?',
        options: ['A) Teknologi adalah berbahaya', 'B) Sekolah harus melarang teknologi', 'C) Teknologi berguna jika digunakan secara seimbang', 'D) Pelajar tidak suka teknologi'],
        correctIndex: 2,
        explanation: 'The passage argues technology is beneficial when used with balance and monitoring.',
        referenceText: 'Dengan pendekatan yang betul, teknologi boleh menjadi alat yang berkesan',
      },
      {
        id: 5, type: 'grammar',
        question: 'Dalam "Guru-guru juga telah mula menggunakan", apakah fungsi "telah"?',
        questionEn: 'What is the function of "telah" in this sentence?',
        options: ['A) Kata hubung', 'B) Penanda masa lampau', 'C) Kata sifat', 'D) Kata tanya'],
        correctIndex: 1,
        explanation: '"Telah" is a tense marker indicating past action (has/have done).',
        referenceText: 'Guru-guru juga telah mula menggunakan aplikasi dalam talian',
      },
    ]
  },
  {
    id: 'alam-sekitar',
    title: 'Menjaga Alam Sekitar',
    titleEn: 'Protecting the Environment',
    topic: 'alam sekitar',
    difficulty: 'advanced',
    lang: 'ms',
    text: `Pencemaran alam sekitar merupakan isu global yang semakin membimbangkan. Di Malaysia, masalah pembuangan sampah secara tidak bertanggungjawab telah menyebabkan pencemaran sungai dan laut. Keadaan ini bukan sahaja merosakkan ekosistem tetapi juga membahayakan kesihatan manusia.

Kerajaan telah mengambil pelbagai langkah untuk menangani masalah ini. Kempen "Malaysia Bersih" dilancarkan untuk menggalakkan rakyat mengitar semula bahan terbuang. Selain itu, undang-undang yang lebih ketat telah dikuatkuasakan terhadap kilang-kilang yang membuang sisa toksik ke dalam sungai.

Namun begitu, usaha kerajaan sahaja tidak mencukupi. Setiap individu perlu memainkan peranan masing-masing. Langkah mudah seperti mengurangkan penggunaan plastik, mengitar semula, dan menggunakan pengangkutan awam dapat membantu mengurangkan pencemaran. Jika semua pihak bekerjasama, kita pasti dapat mewariskan alam sekitar yang bersih kepada generasi akan datang.`,
    questions: [
      {
        id: 1, type: 'factual',
        question: 'Apakah nama kempen yang dilancarkan oleh kerajaan?',
        questionEn: 'What is the name of the campaign launched by the government?',
        options: ['A) Malaysia Hijau', 'B) Malaysia Bersih', 'C) Malaysia Maju', 'D) Malaysia Sejahtera'],
        correctIndex: 1,
        explanation: 'The passage mentions "Kempen Malaysia Bersih".',
        referenceText: 'Kempen "Malaysia Bersih" dilancarkan untuk menggalakkan rakyat mengitar semula bahan terbuang.',
      },
      {
        id: 2, type: 'vocabulary',
        question: 'Apakah maksud "dikuatkuasakan"?',
        questionEn: 'What does "dikuatkuasakan" mean?',
        options: ['A) Dibatalkan', 'B) Dilaksanakan dengan tegas', 'C) Diubah', 'D) Diabaikan'],
        correctIndex: 1,
        explanation: '"Dikuatkuasakan" means enforced. Root: kuatkuasa (enforce) + di-...-kan (passive).',
        referenceText: 'undang-undang yang lebih ketat telah dikuatkuasakan',
      },
      {
        id: 3, type: 'inference',
        question: 'Mengapakah penulis berkata "usaha kerajaan sahaja tidak mencukupi"?',
        questionEn: 'Why does the author say government efforts alone are not enough?',
        options: ['A) Kerajaan tidak berusaha', 'B) Masalah ini memerlukan kerjasama semua pihak', 'C) Rakyat lebih pandai daripada kerajaan', 'D) Undang-undang tidak berkesan'],
        correctIndex: 1,
        explanation: 'The author argues individual responsibility is needed alongside government action.',
        referenceText: 'Setiap individu perlu memainkan peranan masing-masing.',
      },
      {
        id: 4, type: 'main_idea',
        question: 'Apakah tema utama petikan ini?',
        questionEn: 'What is the main theme of this passage?',
        options: ['A) Keindahan alam semula jadi Malaysia', 'B) Tanggungjawab bersama menjaga alam sekitar', 'C) Masalah ekonomi negara', 'D) Peranan kerajaan sahaja'],
        correctIndex: 1,
        explanation: 'The passage emphasizes shared responsibility in environmental protection.',
        referenceText: 'Jika semua pihak bekerjasama, kita pasti dapat mewariskan alam sekitar yang bersih',
      },
      {
        id: 5, type: 'grammar',
        question: 'Dalam "bukan sahaja merosakkan ... tetapi juga membahayakan", apakah kata hubung yang digunakan?',
        questionEn: 'What connectors are used in "bukan sahaja ... tetapi juga"?',
        options: ['A) Kata hubung gabungan', 'B) Kata hubung pancangan', 'C) Kata hubung berpasangan', 'D) Kata hubung tunggal'],
        correctIndex: 2,
        explanation: '"Bukan sahaja ... tetapi juga" is a paired connector (kata hubung berpasangan) meaning "not only ... but also".',
        referenceText: 'bukan sahaja merosakkan ekosistem tetapi juga membahayakan kesihatan manusia',
      },
    ]
  },
  {
    id: 'keluarga',
    title: 'Keluarga Bahagia',
    titleEn: 'A Happy Family',
    topic: 'keluarga',
    difficulty: 'beginner',
    lang: 'ms',
    text: `Keluarga saya terdiri daripada lima orang ahli. Ayah saya bekerja sebagai guru di sebuah sekolah menengah. Ibu saya pula seorang jururawat di hospital kerajaan. Saya mempunyai seorang abang dan seorang adik perempuan.

Setiap hujung minggu, kami sekeluarga akan menghabiskan masa bersama-sama. Kadang-kadang kami pergi ke taman untuk bersenam. Ada kalanya kami menonton filem di panggung wayang. Aktiviti yang paling kami gemari ialah memasak bersama-sama di dapur.

Ibu saya pandai memasak pelbagai jenis makanan. Masakan kegemarannya ialah nasi lemak dan rendang ayam. Saya dan adik suka membantu ibu memotong sayur-sayuran. Abang saya pula suka mencuci pinggan mangkuk selepas makan. Kami sekeluarga amat rapat dan sentiasa menyayangi antara satu sama lain.`,
    questions: [
      {
        id: 1, type: 'factual',
        question: 'Apakah pekerjaan ibu penulis?',
        questionEn: "What is the author's mother's occupation?",
        options: ['A) Guru', 'B) Doktor', 'C) Jururawat', 'D) Peguam'],
        correctIndex: 2,
        explanation: 'The passage states "Ibu saya pula seorang jururawat di hospital kerajaan."',
        referenceText: 'Ibu saya pula seorang jururawat di hospital kerajaan.',
      },
      {
        id: 2, type: 'vocabulary',
        question: 'Apakah maksud "sekeluarga" dalam petikan?',
        questionEn: 'What does "sekeluarga" mean?',
        options: ['A) Seorang', 'B) Seluruh keluarga', 'C) Separuh keluarga', 'D) Tanpa keluarga'],
        correctIndex: 1,
        explanation: '"Sekeluarga" = se- + keluarga, meaning "the whole family / as a family".',
        referenceText: 'kami sekeluarga akan menghabiskan masa bersama-sama',
      },
      {
        id: 3, type: 'inference',
        question: 'Mengapakah keluarga ini dianggap bahagia?',
        questionEn: 'Why is this family considered happy?',
        options: ['A) Mereka kaya', 'B) Mereka menghabiskan masa bersama dan saling membantu', 'C) Mereka tinggal di rumah besar', 'D) Mereka selalu pergi bercuti'],
        correctIndex: 1,
        explanation: 'The passage shows happiness through togetherness and helping each other.',
        referenceText: 'Kami sekeluarga amat rapat dan sentiasa menyayangi antara satu sama lain.',
      },
      {
        id: 4, type: 'main_idea',
        question: 'Apakah mesej petikan ini?',
        questionEn: 'What is the message of this passage?',
        options: ['A) Kepentingan pekerjaan', 'B) Kasih sayang dan kebersamaan dalam keluarga', 'C) Cara memasak nasi lemak', 'D) Aktiviti hujung minggu'],
        correctIndex: 1,
        explanation: 'The central theme is family love, togetherness, and cooperation.',
        referenceText: 'Kami sekeluarga amat rapat dan sentiasa menyayangi antara satu sama lain.',
      },
      {
        id: 5, type: 'grammar',
        question: 'Dalam "Saya mempunyai seorang abang", apakah imbuhan pada "mempunyai"?',
        questionEn: 'What affix is on "mempunyai"?',
        options: ['A) meN-', 'B) meN-...-i', 'C) ber-', 'D) di-...-i'],
        correctIndex: 1,
        explanation: '"Mempunyai" = meN- + punya + -i. The circumfix meN-...-i indicates "having" (transitive).',
        referenceText: 'Saya mempunyai seorang abang dan seorang adik perempuan.',
      },
    ]
  },
  {
    id: 'kesihatan',
    title: 'Gaya Hidup Sihat',
    titleEn: 'Healthy Lifestyle',
    topic: 'kesihatan',
    difficulty: 'intermediate',
    lang: 'ms',
    text: `Gaya hidup sihat amat penting untuk mengekalkan kesihatan fizikal dan mental. Ramai anak muda pada masa kini lebih suka menghabiskan masa dengan telefon bimbit berbanding melakukan aktiviti fizikal. Keadaan ini boleh menyebabkan masalah kesihatan seperti obesiti dan tekanan perasaan.

Pakar kesihatan menasihatkan supaya setiap orang bersenam sekurang-kurangnya tiga puluh minit setiap hari. Selain bersenam, pemakanan yang seimbang juga perlu diamalkan. Kita harus memakan lebih banyak sayur-sayuran dan buah-buahan serta mengurangkan pengambilan makanan segera.

Tidur yang mencukupi juga merupakan aspek penting dalam gaya hidup sihat. Remaja memerlukan lapan hingga sepuluh jam tidur setiap malam. Dengan mengamalkan gaya hidup sihat, kita bukan sahaja dapat mengelakkan penyakit tetapi juga dapat meningkatkan tumpuan semasa belajar.`,
    questions: [
      {
        id: 1, type: 'factual',
        question: 'Berapa lama seseorang perlu bersenam setiap hari?',
        questionEn: 'How long should someone exercise daily?',
        options: ['A) 15 minit', 'B) 20 minit', 'C) 30 minit', 'D) 45 minit'],
        correctIndex: 2,
        explanation: '"bersenam sekurang-kurangnya tiga puluh minit setiap hari".',
        referenceText: 'bersenam sekurang-kurangnya tiga puluh minit setiap hari',
      },
      {
        id: 2, type: 'vocabulary',
        question: 'Apakah maksud "diamalkan"?',
        questionEn: 'What does "diamalkan" mean?',
        options: ['A) Dibincangkan', 'B) Dipraktikkan', 'C) Diabaikan', 'D) Dibatalkan'],
        correctIndex: 1,
        explanation: '"Diamalkan" = di- + amal + -kan, meaning "to be practised / put into practice".',
        referenceText: 'pemakanan yang seimbang juga perlu diamalkan',
      },
      {
        id: 3, type: 'inference',
        question: 'Mengapakah penulis menyebut telefon bimbit?',
        questionEn: 'Why does the author mention mobile phones?',
        options: ['A) Untuk menggalakkan penggunaan telefon', 'B) Untuk menunjukkan punca kurangnya aktiviti fizikal', 'C) Untuk mempromosikan aplikasi kesihatan', 'D) Untuk membincangkan teknologi baru'],
        correctIndex: 1,
        explanation: 'Mobile phones are mentioned as a reason youth are less physically active.',
        referenceText: 'Ramai anak muda pada masa kini lebih suka menghabiskan masa dengan telefon bimbit berbanding melakukan aktiviti fizikal.',
      },
      {
        id: 4, type: 'main_idea',
        question: 'Apakah mesej utama petikan ini?',
        questionEn: 'What is the main message?',
        options: ['A) Telefon bimbit berbahaya', 'B) Kepentingan mengamalkan gaya hidup sihat', 'C) Cara menurunkan berat badan', 'D) Masalah tidur remaja'],
        correctIndex: 1,
        explanation: 'The passage advocates for a healthy lifestyle through exercise, diet, and sleep.',
        referenceText: 'Gaya hidup sihat amat penting untuk mengekalkan kesihatan fizikal dan mental.',
      },
      {
        id: 5, type: 'grammar',
        question: '"Kita harus memakan lebih banyak sayur" — apakah imbuhan pada "memakan"?',
        questionEn: 'What affix is on "memakan"?',
        options: ['A) me-', 'B) meN-...-kan', 'C) ber-', 'D) di-'],
        correctIndex: 0,
        explanation: '"Memakan" = meN- + makan. The root "makan" begins with m (one of l/m/n/r/w/y), so the prefix stays "me-" with no change — there is no -kan suffix.',
        referenceText: 'Kita harus memakan lebih banyak sayur-sayuran',
      },
    ]
  },

  // ── English IGCSE 0500/0510 passages ──────────────────────────────
  {
    id: 'first-day',
    title: 'The Empty Seat',
    topic: 'narrative',
    difficulty: 'intermediate',
    lang: 'en',
    text: `Aisha clutched the strap of her bag a little tighter as she stepped through the gates. The school looked larger than she remembered from the open day, and the corridors echoed with voices she did not know. Somewhere along the line, the cheerful map her mother had printed for her had folded itself into a hopeless square in her pocket.

She found Room 7B by accident. The door was already half-open, and inside, twenty-eight strangers were busy pretending not to look at her. Aisha hovered in the doorway, suddenly aware of how loud her heart sounded. The teacher waved her in with a tired smile and pointed at the only empty seat — by the window, beside a girl with a mountain of textbooks and headphones in.

"You can sit there," said the girl, sliding the books across without looking up. Aisha sat. The girl reached over, paused her music, and offered half a granola bar. "I'm Mei. The maths teacher pretends to take attendance, but he doesn't actually check, so don't worry if your name's not on the list yet."

Aisha laughed, more out of relief than because anything was funny. The granola bar was stale and slightly squashed. It was, she decided, the best welcome she had received all week.`,
    questions: [
      {
        id: 1, type: 'factual',
        question: 'Where did Aisha find the empty seat?',
        options: ['A) At the back of the room', 'B) Beside the door', 'C) By the window', 'D) Next to the teacher'],
        correctIndex: 2,
        explanation: 'The text states the seat was "by the window, beside a girl with a mountain of textbooks".',
        referenceText: 'pointed at the only empty seat — by the window, beside a girl with a mountain of textbooks',
      },
      {
        id: 2, type: 'vocabulary',
        question: 'In "the corridors echoed with voices she did not know," what does "echoed" suggest about the corridors?',
        options: ['A) They were silent', 'B) They were full of sound that bounced off the walls', 'C) They were brightly lit', 'D) They smelled strange'],
        correctIndex: 1,
        explanation: '"Echoed" means sound reverberating, suggesting the corridors were noisy and the sound carried — reinforcing how overwhelming the space felt to Aisha.',
        referenceText: 'the corridors echoed with voices she did not know',
      },
      {
        id: 3, type: 'inference',
        question: 'Why does the writer mention the map "folded itself into a hopeless square"?',
        options: ['A) To show Aisha was good at origami', 'B) To suggest Aisha felt lost despite her preparation', 'C) To criticise her mother', 'D) To explain why she was late'],
        correctIndex: 1,
        explanation: 'The personification ("folded itself") shows the map has become useless. It reinforces that Aisha is unprepared and disoriented despite her mother\'s efforts.',
        referenceText: 'the cheerful map her mother had printed for her had folded itself into a hopeless square',
      },
      {
        id: 4, type: 'tone',
        question: 'How would you describe Mei\'s manner when she speaks to Aisha?',
        options: ['A) Hostile and dismissive', 'B) Casual and reassuring', 'C) Formal and distant', 'D) Anxious and uncertain'],
        correctIndex: 1,
        explanation: 'Mei slides her books over without fuss, offers food, and gives helpful information about the teacher — her tone is unforced and welcoming.',
        referenceText: '"The maths teacher pretends to take attendance, but he doesn\'t actually check, so don\'t worry if your name\'s not on the list yet."',
      },
      {
        id: 5, type: 'main_idea',
        question: 'What is the main impression the writer leaves at the end?',
        options: ['A) Aisha regrets coming to the new school', 'B) Aisha will probably make friends with Mei', 'C) The school is unfriendly', 'D) Aisha cannot wait to go home'],
        correctIndex: 1,
        explanation: 'The "best welcome" line, the laughter, and the shared snack all point to a small but real connection forming.',
        referenceText: 'It was, she decided, the best welcome she had received all week.',
      },
    ]
  },

  {
    id: 'screen-time',
    title: 'Are Phones Really the Problem?',
    topic: 'argumentative',
    difficulty: 'advanced',
    lang: 'en',
    text: `Every few months, a new headline insists that smartphones are destroying the lives of teenagers. Reports cite rising anxiety, falling test scores, and shrinking attention spans, all laid at the feet of the device in your pocket. The argument is loud, simple and emotionally satisfying — and it is also too neat.

The data is messier than the headlines suggest. A study published last year compared the wellbeing of teenagers in households with strict screen-time rules to those without. The difference, when researchers controlled for sleep and family income, was so small as to be statistically meaningless. What did predict poor wellbeing, again and again, was a lack of sleep and a lack of close friendships — neither of which is caused by phones in any direct way.

This does not mean phones are harmless. They displace time that might otherwise be spent on hobbies, exercise, or face-to-face conversation. They make it almost effortless to compare oneself to a curated version of someone else's life. The honest answer, however, is that phones are an amplifier rather than a cause. They make existing problems louder; they rarely invent new ones from scratch.

If we want healthier teenagers, the boring solutions still apply: protect their sleep, give them real friendships to invest in, and trust them with the choice of when to put their phones down. Banning the device is a satisfying gesture. It is not, on the evidence, a serious answer.`,
    questions: [
      {
        id: 1, type: 'factual',
        question: 'According to the study mentioned, what most strongly predicted poor wellbeing in teenagers?',
        options: ['A) Smartphone ownership', 'B) Family income alone', 'C) Lack of sleep and close friendships', 'D) Strict screen-time rules'],
        correctIndex: 2,
        explanation: 'The passage explicitly names sleep and close friendships as the strongest predictors, once income and sleep were controlled for.',
        referenceText: 'What did predict poor wellbeing, again and again, was a lack of sleep and a lack of close friendships',
      },
      {
        id: 2, type: 'vocabulary',
        question: 'In context, what does the writer mean by calling phones "an amplifier rather than a cause"?',
        options: ['A) Phones make existing problems louder but rarely create them', 'B) Phones produce music too loudly', 'C) Phones cause every problem teenagers face', 'D) Phones replace older technology'],
        correctIndex: 0,
        explanation: 'An amplifier increases the volume of an existing signal. The writer uses this metaphor to argue phones intensify problems that are already there.',
        referenceText: 'phones are an amplifier rather than a cause. They make existing problems louder; they rarely invent new ones from scratch',
      },
      {
        id: 3, type: 'inference',
        question: 'What attitude does the writer take toward the dramatic headlines about smartphones?',
        options: ['A) Agrees with them strongly', 'B) Treats them as overstated and emotionally satisfying rather than accurate', 'C) Believes they are written by experts only', 'D) Thinks they should be banned'],
        correctIndex: 1,
        explanation: 'Phrases like "loud, simple and emotionally satisfying — and it is also too neat" signal scepticism without dismissing the underlying concern.',
        referenceText: 'The argument is loud, simple and emotionally satisfying — and it is also too neat.',
      },
      {
        id: 4, type: 'tone',
        question: 'How would you describe the overall tone of the passage?',
        options: ['A) Alarmed and panicked', 'B) Calm, evidence-based and gently corrective', 'C) Sarcastic and angry', 'D) Nostalgic for a time before phones'],
        correctIndex: 1,
        explanation: 'The writer cites a study, qualifies their claims, and lands on practical advice — the register is reasoned and measured.',
        referenceText: 'The honest answer, however, is that phones are an amplifier rather than a cause.',
      },
      {
        id: 5, type: 'main_idea',
        question: 'Which sentence best summarises the writer\'s overall argument?',
        options: [
          'A) Smartphones should be banned for all teenagers.',
          'B) Phones intensify existing problems but are not the root cause; sleep and friendship matter more.',
          'C) The data on smartphones is impossible to interpret.',
          'D) Parents should never enforce screen-time rules.',
        ],
        correctIndex: 1,
        explanation: 'The closing paragraph names the real solutions (sleep, friendships, trust) and explicitly rejects banning as a "satisfying gesture" rather than a serious answer.',
        referenceText: 'Banning the device is a satisfying gesture. It is not, on the evidence, a serious answer.',
      },
    ]
  },

  {
    id: 'coral-reefs',
    title: 'The Cities Beneath the Waves',
    topic: 'environment',
    difficulty: 'intermediate',
    lang: 'en',
    text: `If you have ever swum over a healthy coral reef, you will not have forgotten it. The water turns suddenly noisy with colour: parrotfish grazing the rock, clouds of yellow tangs sliding past your fingers, and an occasional turtle hauling itself slowly into view. Reefs occupy less than one percent of the ocean floor, and yet roughly a quarter of all marine species depend on them at some point in their lives.

That dependence is exactly the problem. When sea temperatures rise even slightly, the corals expel the tiny algae that live inside them and give them their colour. The reef goes pale — a process called bleaching — and if conditions do not return to normal quickly, large stretches of it die. Once the structure begins to crumble, the fish leave, the predators that hunt those fish leave with them, and a whole underwater city quietly empties out.

It is tempting to think this is somebody else's problem, and one happening far away. It is not. Reefs protect coastlines from storm waves; they support the fishing communities that feed millions of people; and the medicines extracted from reef organisms have already shaped modern cancer and infection treatments. Their loss is felt on land as well as below it.

There is some good news. Local interventions — better fisheries management, controls on coastal pollution, and dedicated marine protected areas — measurably help reefs recover. They cannot, on their own, undo a warming ocean, but they buy time. And buying time, in conservation, is sometimes the most useful thing you can do.`,
    questions: [
      {
        id: 1, type: 'factual',
        question: 'According to the passage, roughly what proportion of marine species depend on coral reefs?',
        options: ['A) Half', 'B) About a quarter', 'C) Less than one percent', 'D) Almost all'],
        correctIndex: 1,
        explanation: 'The passage states that "roughly a quarter of all marine species depend on them at some point in their lives".',
        referenceText: 'roughly a quarter of all marine species depend on them at some point in their lives',
      },
      {
        id: 2, type: 'vocabulary',
        question: 'What does "bleaching" mean as it is used in the passage?',
        options: [
          'A) Cleaning a reef with chemicals',
          'B) The process where corals expel their algae and turn pale, which can lead to death',
          'C) The growth of new coral colonies',
          'D) A natural seasonal change in colour',
        ],
        correctIndex: 1,
        explanation: 'The passage defines bleaching as corals losing their algae and turning pale, with the risk of widespread death if conditions do not recover.',
        referenceText: 'the corals expel the tiny algae that live inside them and give them their colour. The reef goes pale — a process called bleaching',
      },
      {
        id: 3, type: 'inference',
        question: 'Why does the writer compare a damaged reef to "a whole underwater city quietly empties out"?',
        options: [
          'A) To suggest reefs are man-made structures',
          'B) To convey that the loss is not just of corals but of an entire connected community of life',
          'C) To imply fish move to other cities',
          'D) To make the passage sound dramatic and hide the science',
        ],
        correctIndex: 1,
        explanation: 'The metaphor extends the chain of consequences: corals die, fish leave, predators follow — emphasising the systemic nature of the loss.',
        referenceText: 'the fish leave, the predators that hunt those fish leave with them, and a whole underwater city quietly empties out',
      },
      {
        id: 4, type: 'tone',
        question: 'How does the writer balance the passage emotionally?',
        options: [
          'A) Pure despair throughout',
          'B) Pure optimism throughout',
          'C) Vivid concern about losses, balanced with measured optimism about local action',
          'D) Detached, with no opinion expressed',
        ],
        correctIndex: 2,
        explanation: 'The passage opens with awe, moves through serious threats, and closes on local interventions and "buying time" — a deliberate emotional arc.',
        referenceText: 'There is some good news. Local interventions ... measurably help reefs recover.',
      },
      {
        id: 5, type: 'main_idea',
        question: 'Which statement best captures the writer\'s overall position?',
        options: [
          'A) Coral reefs are doomed and there is nothing useful to do.',
          'B) Coral reefs matter ecologically, economically and medically, and local action genuinely helps even if it cannot fix the climate alone.',
          'C) Tourism is the main threat to coral reefs.',
          'D) Coral reefs are only important to scientists.',
        ],
        correctIndex: 1,
        explanation: 'The middle of the passage establishes the breadth of why reefs matter; the closing paragraph endorses local action while honestly limiting its scope.',
        referenceText: 'Reefs protect coastlines from storm waves; they support the fishing communities that feed millions of people; and the medicines extracted from reef organisms have already shaped modern cancer and infection treatments.',
      },
    ]
  },
];

export default COMPREHENSION_PASSAGES;

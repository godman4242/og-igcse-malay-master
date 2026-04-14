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
        correctIndex: 1,
        explanation: '"Memakan" = meN- + makan + (-kan implied transitive). The meN- prefix with makan becomes memakan.',
        referenceText: 'Kita harus memakan lebih banyak sayur-sayuran',
      },
    ]
  },
];

export default COMPREHENSION_PASSAGES;

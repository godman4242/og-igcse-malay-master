export const DISC_EN = ['furthermore','moreover','however','nevertheless','consequently','therefore','in addition','on the other hand','despite','although','meanwhile','additionally','ultimately','firstly','secondly','thirdly','finally','likewise','similarly','nonetheless','hence','thus','accordingly'];

export const FORM_EN = ['shall','whom','thus','hence','anticipate','apprehensive','reassure','endeavour','crucial','significant','meticulous','impeccable','paramount','utmost','indeed','beneficial','empathise','capability','advantageous','wisdom','familiarising','delighted','invaluable','profound','demonstrates'];

export const SIM_RE = /\b(like a|like an|like the|as\s+\w+\s+as|as if|as though)\b/gi;
export const MET_RE = /\b(a wave of|a storm of|heart of|journey of|mountain of|ocean of|fire of|shadow of|butterflies|stepping stone|a sea of|flood of|beacon of|pillar of)\b/gi;

export const PW_ML = ['selain itu','tambahan pula','di samping itu','walau bagaimanapun','namun demikian','oleh itu','justeru','seterusnya','akhir sekali','pertamanya','keduanya','kesimpulannya','sebagai contoh','contohnya','misalnya','malah','bahkan','sebaliknya','walaupun','sungguhpun','pada pendapat saya','pada pandangan saya'];

export const FORM_ML = ['sewajarnya','sememangnya','bertanggungjawab','melaksanakan','menggalakkan','menitikberatkan','kepentingan','masyarakat','generasi','pembangunan','pendidikan','kemajuan','perpaduan','kesejahteraan','menghargai','berdedikasi'];

export const KARANGAN_TEMPLATES = [
  {
    id: 'surat',
    title: 'Surat Kiriman Rasmi',
    titleEn: 'Formal Letter',
    wordTarget: '200-250',
    structure: [
      { section: 'Alamat Pengirim', hint: 'Your address (top right)', example: 'No. 12, Jalan Mawar, 47600 Subang Jaya, Selangor.' },
      { section: 'Tarikh', hint: 'Date below address', example: '6 April 2026' },
      { section: 'Alamat Penerima', hint: 'Recipient address (left)', example: 'Pengetua, Sekolah Menengah Kebangsaan Taman Jaya...' },
      { section: 'Perkara', hint: 'Subject line — bold and clear', example: 'Perkara: Permohonan Mengadakan Hari Sukan Tahunan' },
      { section: 'Salam Hormat', hint: 'Formal greeting', example: 'Tuan/Puan,' },
      { section: 'Perenggan 1 — Tujuan', hint: 'State purpose directly', example: 'Dengan hormatnya, saya... ingin memohon kebenaran untuk...' },
      { section: 'Perenggan 2 — Huraian', hint: 'Explain details/reasons', example: 'Aktiviti ini bertujuan untuk menggalakkan semangat berpasukan...' },
      { section: 'Perenggan 3 — Harapan', hint: 'Express hope/conclusion', example: 'Oleh itu, saya berharap pihak tuan/puan dapat mempertimbangkan...' },
      { section: 'Penutup', hint: 'Formal closing', example: 'Sekian, terima kasih.\n\nYang benar,\n(Nama)' },
    ],
    markers: ['Dengan hormatnya','Merujuk perkara di atas','Oleh itu','Sehubungan dengan itu','Sekian, terima kasih'],
  },
  {
    id: 'rencana',
    title: 'Rencana / Artikel',
    titleEn: 'Article',
    wordTarget: '250-300',
    structure: [
      { section: 'Tajuk', hint: 'Catchy title', example: 'Kepentingan Membaca dalam Kalangan Remaja' },
      { section: 'Pendahuluan', hint: 'Hook + define topic', example: 'Pada zaman globalisasi ini, tabiat membaca semakin dipinggirkan oleh golongan muda...' },
      { section: 'Isi 1 — Sebab / Kepentingan', hint: 'First main point with evidence', example: 'Pertamanya, membaca dapat menambah ilmu pengetahuan...' },
      { section: 'Isi 2 — Kesan / Contoh', hint: 'Second point with examples', example: 'Selain itu, aktiviti membaca juga dapat meningkatkan kemahiran bahasa...' },
      { section: 'Isi 3 — Cadangan / Langkah', hint: 'Suggestions or solutions', example: 'Justeru, pelbagai langkah perlu diambil seperti mengadakan kempen membaca...' },
      { section: 'Penutup', hint: 'Summary + final thought', example: 'Kesimpulannya, tabiat membaca amat penting dan perlu dipupuk sejak kecil...' },
    ],
    markers: ['Pertamanya','Selain itu','Tambahan pula','Di samping itu','Justeru','Akhir sekali','Kesimpulannya','Sebagai contoh'],
  },
  {
    id: 'cerita',
    title: 'Cerita / Karangan Naratif',
    titleEn: 'Story / Narrative',
    wordTarget: '250-350',
    structure: [
      { section: 'Pengenalan', hint: 'Set the scene — who, where, when', example: 'Pada suatu hari yang cerah, Ahmad dan keluarganya bersiap-siap untuk pergi bercuti...' },
      { section: 'Perkembangan', hint: 'Rising action — what happened', example: 'Tiba-tiba, hujan turun dengan lebatnya. Jalan raya menjadi licin...' },
      { section: 'Klimaks', hint: 'The turning point / peak', example: 'Tanpa disedari, sebuah kereta dari arah bertentangan meluncur laju...' },
      { section: 'Peleraian', hint: 'Resolution — how it ended', example: 'Syukurlah, tiada kecederaan serius. Semua penumpang selamat...' },
      { section: 'Pengajaran', hint: 'Moral of the story', example: 'Peristiwa itu mengajar saya bahawa kita perlu sentiasa berhati-hati...' },
    ],
    markers: ['Pada suatu hari','Tiba-tiba','Tanpa disedari','Syukurlah','Akhirnya','Setelah itu','Peristiwa itu mengajar saya'],
  },
  {
    id: 'ucapan',
    title: 'Ucapan / Syarahan',
    titleEn: 'Speech',
    wordTarget: '250-300',
    structure: [
      { section: 'Salam & Kata Aluan', hint: 'Formal greeting to audience', example: 'Bismillahirrahmanirrahim. Yang Berusaha Pengetua, guru-guru, dan rakan-rakan yang saya hormati...' },
      { section: 'Pengenalan Topik', hint: 'Introduce your topic', example: 'Pada pagi yang mulia ini, saya ingin menyampaikan ucapan bertajuk...' },
      { section: 'Isi 1', hint: 'First main point', example: 'Pertama sekali, saya ingin menekankan bahawa...' },
      { section: 'Isi 2', hint: 'Second main point', example: 'Seterusnya, kita juga perlu sedar bahawa...' },
      { section: 'Isi 3', hint: 'Third main point', example: 'Akhir sekali, marilah kita bersama-sama...' },
      { section: 'Penutup', hint: 'Closing statement', example: 'Sebagai penutup, saya ingin menegaskan bahawa... Sekian, terima kasih.' },
    ],
    markers: ['Yang Berusaha','Pertama sekali','Seterusnya','Akhir sekali','Sebagai penutup','Hadirin yang dihormati','Marilah kita'],
  },
];

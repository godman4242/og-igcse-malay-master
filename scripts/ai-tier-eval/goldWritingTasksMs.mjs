// GOLD SET — Malay 0546 over-praise eval for the task-aware Content / task-
// fulfilment trait. The whole point of the Content grader is that a fluent,
// well-written essay must NOT score high Content when it is off-topic or only
// partly answers the task. This MALAY set proves the (lower-resource for LLMs)
// Malay grader scores those DOWN too — the load-bearing ship gate.
//
// SYNTHETIC + HAND-LABELLED (mirrors goldWritingTasksEn.mjs): every essay is
// freshly authored in Bahasa Melayu, so the ground truth is KNOWN. Each essay
// targets one of the 3 authored Malay tasks in src/data/writingTasks.js and
// carries a `label` + `expectedContentMax` the harness checks `content_band`
// against.
//
// LABELS (identical construct to the English set):
//   • onTask        — genuinely fulfils the task. expectedContentMax = 6.
//   • partial       — the SUBTLE failure: on-topic but addresses some-but-not-all
//                     requirements, OR wrong register/audience, OR drifts off-task
//                     halfway. expectedContentMax = 4.
//   • offTopicFluent— fluent Malay, WRONG topic / ignores the task. Fluency must
//                     not rescue it. expectedContentMax = 2.
//
// DISTRIBUTION: 3 onTask, 4 partial, 3 offTopicFluent → 7/10 subtle (pinned).
//
// NO IMPORTS — pure data array, so the vitest well-formedness test (which runs
// WITHOUT the Node extensionless resolver) can load it directly.

export const WRITING_TASKS_GOLD_MS = [
  // ─────────────────────── onTask (3) — genuine fulfilment ───────────────────────
  {
    id: 'g-surat-ontask',
    taskId: 'ms-surat-taman-permainan',
    label: 'onTask',
    expectedContentMax: 6,
    // Masalah terperinci + kesan kepada penduduk/kanak-kanak + dua tindakan konkrit
    // + nada surat rasmi sepanjang surat → keempat-empat keperluan dipenuhi.
    text: `Tuan,

Aduan Berhubung Keadaan Taman Permainan di Taman Sri Damai

Dengan segala hormatnya, saya selaku penduduk Taman Sri Damai ingin menarik perhatian pihak tuan terhadap keadaan taman permainan di kawasan kami yang semakin usang dan membahayakan.

2. Sejak beberapa bulan ini, kebanyakan peralatan permainan telah rosak. Dua buah buaian telah patah rantainya, manakala papan gelongsor pula berkarat dan tajam di bahagian tepi. Selain itu, lampu di kawasan taman tidak menyala pada waktu malam dan rumput dibiarkan meninggi sehingga menjadi sarang nyamuk.

3. Keadaan ini amat merisaukan penduduk, terutamanya ibu bapa yang mempunyai anak kecil. Kanak-kanak tidak lagi mempunyai tempat bermain yang selamat dan beberapa kejadian tergelincir telah dilaporkan. Penduduk juga kehilangan ruang untuk beriadah pada waktu petang.

4. Sehubungan dengan itu, saya berharap pihak tuan dapat mengambil dua tindakan segera. Pertama, membaiki atau mengganti peralatan yang rosak supaya selamat digunakan. Kedua, menyediakan jadual penyelenggaraan berkala termasuk memotong rumput dan membaiki lampu setiap bulan.

5. Saya amat berharap aduan ini diberi perhatian sewajarnya demi kesejahteraan penduduk. Kerjasama daripada pihak tuan amatlah saya hargai.

Sekian, terima kasih.

Yang benar,
Penduduk Taman Sri Damai`,
  },
  {
    id: 'g-laporan-ontask',
    taskId: 'ms-laporan-kitar-semula',
    label: 'onTask',
    expectedContentMax: 6,
    // Tajuk + bahagian berperenggan + hasil disokong angka + dua cadangan dikait
    // hasil + nada formal & penyedia → keempat-empat keperluan.
    text: `Laporan Program Kitar Semula Kelab Alam Sekitar

Pendahuluan
Laporan ini disediakan untuk memaklumkan pelaksanaan Program Kitar Semula yang dianjurkan oleh Kelab Alam Sekitar selama sebulan, bermula pada 1 hingga 30 Mac. Program ini bertujuan memupuk kesedaran kitar semula dalam kalangan pelajar.

Pelaksanaan
Tiga buah tong kitar semula bagi kertas, plastik dan tin telah diletakkan di setiap aras bangunan. Ahli kelab bertugas secara bergilir untuk mengasing dan menimbang bahan setiap minggu.

Hasil
Sepanjang program, sebanyak 120 kilogram kertas, 45 kilogram plastik dan 30 kilogram tin berjaya dikumpulkan. Seramai 180 orang pelajar telah menyertai program ini secara aktif. Namun, penyertaan pada minggu pertama agak rendah kerana kurang hebahan.

Cadangan
Berdasarkan hasil tersebut, dua cadangan dikemukakan. Pertama, hebahan melalui sistem siaraya dan poster perlu dibuat lebih awal kerana penyertaan rendah pada minggu pertama berpunca daripada kekurangan maklumat. Kedua, pertandingan antara kelas boleh diadakan untuk meningkatkan lagi jumlah bahan yang dikumpul.

Penutup
Secara keseluruhan, program ini berjaya mencapai objektifnya dan wajar diteruskan pada masa hadapan.

Disediakan oleh:
Setiausaha Kelab Alam Sekitar`,
  },
  {
    id: 'g-rencana-ontask',
    taskId: 'ms-rencana-amalan-membaca',
    label: 'onTask',
    expectedContentMax: 6,
    // Pendahuluan + dua kepentingan dengan contoh + cadangan praktikal + penanda
    // wacana & penutup → keempat-empat keperluan.
    text: `Kepentingan Amalan Membaca dalam Kalangan Remaja

Tahukah anda bahawa kajian mendapati remaja hari ini lebih banyak menghabiskan masa dengan telefon pintar berbanding buku? Senario ini membimbangkan kerana amalan membaca semakin terpinggir dalam kalangan generasi muda.

Pertamanya, membaca penting kerana ia menambah ilmu pengetahuan. Melalui pembacaan, remaja dapat mengetahui pelbagai perkara di luar sukatan pelajaran, contohnya isu semasa dan sejarah negara. Seorang pelajar yang gemar membaca akhbar lazimnya lebih yakin ketika berhujah dalam kelas.

Selain itu, membaca turut mengasah daya fikir dan imaginasi. Apabila membaca novel, remaja terpaksa membayangkan watak dan peristiwa, lalu pemikiran kritis mereka terlatih. Hal ini secara tidak langsung membantu mereka menyelesaikan masalah dengan lebih baik.

Untuk menggalakkan tabiat membaca, pihak sekolah boleh menganjurkan program seperti NILAM atau menyediakan sudut bacaan yang selesa di setiap kelas. Kempen 'satu murid satu buku' juga mampu menyemarakkan minat membaca.

Kesimpulannya, amalan membaca memberikan manfaat yang besar kepada remaja. Marilah kita menjadikan membaca sebagai budaya kerana membaca jambatan ilmu.`,
  },

  // ─────────────────────── partial (4) — the subtle failures ───────────────────────
  {
    id: 'g-surat-partial-register',
    taskId: 'ms-surat-taman-permainan',
    label: 'partial',
    expectedContentMax: 4,
    // Menyatakan masalah + kesan + memohon pembaikan, TETAPI nada terlalu mesra dan
    // tidak rasmi — salah untuk surat rasmi kepada pihak berkuasa (keperluan 4 gagal).
    text: `Hai,

Saya nak bagitahu pasal taman permainan kat kawasan rumah saya ni yang dah rosak teruk. Buaian dah patah, lampu pun tak menyala langsung waktu malam. Rumput pula panjang sampai macam hutan!

Budak-budak kecil dah tak boleh main dengan selamat sebab semuanya bahaya. Ada yang dah tergelincir dekat papan gelongsor yang berkarat tu. Kesian betul tengok mereka.

Boleh tak tolong baiki cepat-cepat? Kalau boleh tukar buaian baru dengan baiki lampu tu. Kami semua harap sangat-sangat pihak tuan boleh buat sesuatu pasal hal ni.

Okeylah, terima kasih banyak-banyak ye!

Daripada,
Budak Taman Sri Damai`,
  },
  {
    id: 'g-laporan-partial-drift',
    taskId: 'ms-laporan-kitar-semula',
    label: 'partial',
    expectedContentMax: 4,
    // Bermula sebagai laporan (tajuk, pendahuluan, sedikit hasil) tetapi TERPESONG
    // separuh jalan menjadi luahan peribadi/kenangan — tiada cadangan dikait bukti
    // (keperluan 3 gagal) dan nada laporan runtuh menjadi cerita.
    text: `Laporan Program Kitar Semula

Pendahuluan
Saya telah diminta menulis laporan tentang Program Kitar Semula yang dijalankan oleh kelab kami bulan lepas.

Hasil
Beberapa orang ahli kelab berkata program itu agak menyeronokkan dan banyak kertas dikumpul.

Sebenarnya, program ini mengingatkan saya kepada zaman kanak-kanak. Datuk saya seorang yang sangat menjaga alam sekitar. Beliau selalu mengajar saya supaya tidak membazir dan sentiasa menyimpan barang lama. Saya masih ingat bagaimana beliau mengumpul surat khabar lama dan mengikatnya kemas-kemas di belakang rumah. Kenangan itu amat bermakna buat saya sehingga kini.

Pada pendapat saya, menjaga alam sekitar ialah tanggungjawab kita semua. Jika setiap orang berusaha sedikit, dunia ini pasti menjadi lebih indah. Saya berasa bangga dapat menyertai program seperti ini dan berharap semangat ini akan kekal dalam diri saya selama-lamanya.`,
  },
  {
    id: 'g-rencana-partial-norule',
    taskId: 'ms-rencana-amalan-membaca',
    label: 'partial',
    expectedContentMax: 4,
    // Pendahuluan + dua kepentingan, TETAPI tidak pernah mencadangkan cara
    // menggalakkan tabiat membaca (keperluan 3 gagal) + penutup lemah.
    text: `Kepentingan Membaca

Pada zaman ini, ramai remaja tidak lagi gemar membaca. Mereka lebih suka melayari media sosial daripada membelek buku. Keadaan ini sungguh membimbangkan kita semua.

Membaca sebenarnya sangat penting kerana ia menambah ilmu. Orang yang banyak membaca tahu banyak perkara dan tidak mudah ketinggalan. Mereka juga lebih bijak ketika berbual dengan orang lain.

Selain itu, membaca juga boleh menghiburkan hati. Apabila kita bosan, membaca cerita yang menarik dapat menghilangkan tekanan. Banyak orang berjaya kerana mereka rajin membaca sejak kecil lagi.

Oleh itu, membaca memang banyak faedahnya. Kita semua patut sedar betapa pentingnya membaca dalam kehidupan kita seharian.`,
  },
  {
    id: 'g-rencana-partial-halfdrift',
    taskId: 'ms-rencana-amalan-membaca',
    label: 'partial',
    expectedContentMax: 4,
    // Bermula betul pada tabiat membaca, kemudian terpesong menjadi karangan umum
    // "ketagihan gajet" — mengabaikan fokus menggalakkan membaca dan tidak pernah
    // mencadangkan langkah membaca (keperluan 2 & 3 lemah/gagal).
    text: `Kepentingan Amalan Membaca dalam Kalangan Remaja

Ramai pihak kini membincangkan tabiat membaca dalam kalangan remaja. Memang benar, membaca penting kerana ia menambah ilmu dan meluaskan pemikiran.

Namun, isu yang lebih besar ialah ketagihan gajet dalam kalangan remaja hari ini. Kebanyakan remaja menghabiskan lima hingga enam jam sehari menatap skrin telefon. Hal ini merosakkan kesihatan mata dan mengganggu waktu tidur kerana cahaya biru daripada skrin.

Selain itu, penggunaan media sosial yang berlebihan dikaitkan dengan masalah tekanan dan kebimbangan. Remaja sering membandingkan kehidupan mereka dengan kehidupan sempurna yang dipaparkan dalam talian. Keluarga juga semakin renggang kerana masing-masing sibuk dengan telefon sendiri.

Jika keadaan ini tidak dibendung, satu generasi mungkin hilang tumpuan dan jati diri. Kita perlu menguasai teknologi, bukan dikuasai olehnya.`,
  },

  // ─────────────────────── offTopicFluent (3) — wrong topic, well written ───────────────────────
  {
    id: 'g-surat-offtopic-terimakasih',
    taskId: 'ms-surat-taman-permainan',
    label: 'offTopicFluent',
    expectedContentMax: 2,
    // Surat rasmi yang kemas — tetapi ucapan terima kasih kepada seorang guru, bukan
    // aduan kepada pihak berkuasa tentang taman permainan. Format betul, tugasan salah.
    text: `Tuan,

Ucapan Terima Kasih kepada Guru Tersayang

Dengan segala hormatnya, saya ingin merakamkan setinggi-tinggi penghargaan kepada Cikgu Aminah atas segala jasa dan bimbingan beliau sepanjang saya bersekolah di sini.

2. Ketika saya mula-mula masuk ke tingkatan satu, saya seorang yang pemalu dan kurang yakin. Namun, dengan kesabaran dan dorongan Cikgu Aminah, saya perlahan-lahan menjadi lebih berani. Saya tidak akan lupa bagaimana beliau sanggup tinggal selepas waktu sekolah untuk membantu saya mengulang kaji.

3. Pengajaran Cikgu Aminah bukan sekadar tentang pelajaran. Beliau mengajar kami erti kesungguhan, kejujuran dan budi bahasa. Nilai-nilai ini akan saya bawa sepanjang hayat.

4. Sekali lagi, saya mengucapkan ribuan terima kasih atas segala pengorbanan Cikgu Aminah. Semoga beliau sentiasa dirahmati dan dimurahkan rezeki.

Sekian, terima kasih.

Yang benar,
Bekas Anak Murid`,
  },
  {
    id: 'g-laporan-offtopic-naratif',
    taskId: 'ms-laporan-kitar-semula',
    label: 'offTopicFluent',
    expectedContentMax: 2,
    // Naratif yang lancar tentang perkhemahan — tiada struktur laporan, tiada kitar
    // semula, tiada hasil. Penulisan kuat, tugasan salah.
    text: `Pada pagi yang masih berkabus, bas sekolah kami meluncur keluar dari pintu pagar menuju ke kaki gunung. Tiada seorang pun antara kami yang menyangka pengembaraan hujung minggu itu bakal menjadi kenangan paling indah.

Setibanya di sana, udara sejuk menusuk tulang dan bau tanah basah memenuhi ruang. Kami mendaki denai yang curam sambil tergelincir di atas batu-batu kecil, ketawa berderai melihat telatah masing-masing. Walaupun kaki terasa lenguh, pemandangan di puncak sungguh menakjubkan.

Pada malamnya, kami memasang khemah di tepi sungai yang jernih. Ketika unggun api mula menyala dan bintang berkelipan, guru kami bercerita kisah-kisah seram yang membuatkan kami terlompat setiap kali ranting berderak.

Keesokan paginya, kami dikejutkan oleh kicauan burung dan matahari terbit yang menyinari langit. Dengan tubuh yang penat namun hati yang gembira, kami pulang membawa seribu kenangan.`,
  },
  {
    id: 'g-rencana-offtopic-sukan',
    taskId: 'ms-rencana-amalan-membaca',
    label: 'offTopicFluent',
    expectedContentMax: 2,
    // Rencana yang kemas tentang Hari Sukan — tiada kaitan dengan amalan membaca.
    // Kelancaran tidak boleh menyelamatkannya.
    text: `Hari Sukan Sekolah: Kenangan yang Tidak Terlupakan

Sorak-sorai bergema di seluruh padang apabila Hari Sukan Tahunan sekolah kami berlangsung minggu lepas. Suasana pagi itu begitu meriah dengan bendera pelbagai warna berkibaran ditiup angin.

Acara dimulakan dengan perbarisan rumah sukan yang penuh bersemangat. Setiap pasukan mengenakan pakaian seragam berwarna-warni sambil melaungkan cogan kata masing-masing. Para penonton bertepuk tangan tanpa henti.

Acara yang paling dinantikan ialah larian berganti-ganti 4x100 meter. Pelari terakhir rumah Merah berjaya memintas lawannya pada saat akhir, lalu menyebabkan seluruh stadium bergema dengan sorakan. Wajah-wajah ceria terpancar di mana-mana sahaja.

Apabila matahari mula condong ke barat, majlis penyampaian hadiah pun diadakan. Walaupun ada yang menang dan ada yang kalah, semangat kesukanan dan perpaduan itulah yang paling bermakna. Sungguh, hari itu satu kenangan yang tidak akan saya lupakan.`,
  },
]

const SCENARIOS = [
  {
    id: 'kapal-terbang',
    title: 'Kapal Terbang',
    titleEn: 'Airplane',
    context: 'Anda dalam kapal terbang. Anda berasa tidak selesa kerana telinga anda berdesing.',
    contextEn: 'You are on an airplane. You feel uncomfortable because your ears are ringing.',
    turns: [
      { examiner: 'Selamat petang. Apa khabar? Adakah ini penerbangan pertama anda?', hint: 'Greet back, say how you feel, answer about first flight' },
      { examiner: 'Nampaknya anda tidak selesa. Apa masalahnya?', hint: 'Describe ear ringing, discomfort symptoms' },
      { examiner: 'Oh, telinga berdesing. Sudahkah anda cuba mengunyah gula-gula?', hint: 'Respond about trying gum/swallowing, ask for advice' },
      { examiner: 'Cuba telan air liur atau tutup hidung dan hembus perlahan. Berapa lama lagi penerbangan ini?', hint: 'Thank them, mention flight duration, express hope' },
      { examiner: 'Baiklah. Adakah anda memerlukan bantuan lain?', hint: 'Politely decline or ask for water, thank them' },
    ]
  },
  {
    id: 'telefon-terpakai',
    title: 'Telefon Terpakai',
    titleEn: 'Used Phone',
    context: 'Anda ingin membeli telefon terpakai daripada rakan anda.',
    contextEn: 'You want to buy a used phone from your friend.',
    turns: [
      { examiner: 'Hai! Saya dengar awak nak beli telefon saya. Berminat ke?', hint: 'Express interest, ask about the phone model' },
      { examiner: 'Ini telefon Samsung, dua tahun pakai. Masih elok. Harga RM500.', hint: 'Negotiate price, ask about condition/battery' },
      { examiner: 'Bateri masih tahan satu hari. Kalau RM450, boleh lah.', hint: 'Counter-offer or accept, ask about warranty' },
      { examiner: 'Takde waranti dah, tapi saya jamin takde masalah. Nak tengok?', hint: 'Ask to test it, check camera/screen' },
      { examiner: 'Ini dia. Cuba lah. Macam mana?', hint: 'Give opinion, finalize deal or decline' },
    ]
  },
  {
    id: 'restoran',
    title: 'Di Restoran',
    titleEn: 'At a Restaurant',
    context: 'Anda di restoran dan ingin memesan makanan untuk keluarga.',
    contextEn: 'You are at a restaurant and want to order food for the family.',
    turns: [
      { examiner: 'Selamat datang! Berapa orang? Nak duduk di mana?', hint: 'State number of people, seating preference' },
      { examiner: 'Baik, sila duduk. Ini menu kami. Nak minum apa dulu?', hint: 'Order drinks for family, ask about specials' },
      { examiner: 'Hari ini ada nasi ayam istimewa dan mee goreng. Nak cuba?', hint: 'Order food, mention dietary needs/preferences' },
      { examiner: 'Baik. Makanan akan siap dalam 15 minit. Ada apa-apa lagi?', hint: 'Ask about dessert or extra items' },
      { examiner: 'Ini bil anda. Jumlahnya RM85. Tunai atau kad?', hint: 'Choose payment, comment on food, thank them' },
    ]
  },
  {
    id: 'doktor',
    title: 'Di Klinik',
    titleEn: 'At the Clinic',
    context: 'Anda tidak sihat dan pergi ke klinik untuk berjumpa doktor.',
    contextEn: 'You are unwell and go to the clinic to see a doctor.',
    turns: [
      { examiner: 'Selamat pagi. Apa masalah kesihatan anda hari ini?', hint: 'Describe symptoms — fever, headache, etc.' },
      { examiner: 'Berapa lama sudah anda rasa begini? Ada demam?', hint: 'Give duration, mention temperature/other symptoms' },
      { examiner: 'Saya perlu periksa anda. Ada alergi ubat?', hint: 'Answer about allergies, mention past medical issues' },
      { examiner: 'Anda demam dan sakit tekak. Saya beri ubat tiga hari. Perlu MC?', hint: 'Ask about MC, inquire about medication instructions' },
      { examiner: 'Makan ubat tiga kali sehari selepas makan. Minum banyak air. Ada soalan?', hint: 'Ask follow-up questions, thank the doctor' },
    ]
  },
  {
    id: 'sekolah-baru',
    title: 'Sekolah Baru',
    titleEn: 'New School',
    context: 'Anda baru berpindah ke sekolah baru dan bertemu rakan sekelas.',
    contextEn: 'You just transferred to a new school and meet a classmate.',
    turns: [
      { examiner: 'Hai! Awak murid baru ke? Nama saya Amir. Nama awak?', hint: 'Introduce yourself, say where you came from' },
      { examiner: 'Bestnya! Macam mana sekolah lama awak? Kenapa pindah?', hint: 'Describe old school, explain reason for transfer' },
      { examiner: 'Oh begitu. Awak suka subjek apa? Kita ada banyak kelab di sini.', hint: 'Mention favourite subjects, ask about clubs' },
      { examiner: 'Ada kelab sains, kelab bahasa, dan pasukan bola. Nak join?', hint: 'Express interest in a club, ask about schedule' },
      { examiner: 'Jom, saya tunjuk kantin dan perpustakaan. Awak bawa bekal ke?', hint: 'Respond about lunch plans, express gratitude' },
    ]
  },
  {
    id: 'percutian',
    title: 'Merancang Percutian',
    titleEn: 'Planning a Holiday',
    context: 'Anda dan keluarga merancang percutian cuti sekolah.',
    contextEn: 'You and your family are planning a school holiday trip.',
    turns: [
      { examiner: 'Cuti sekolah dah dekat! Nak pergi mana tahun ini?', hint: 'Suggest a destination, give reasons' },
      { examiner: 'Idea yang bagus! Berapa hari nak pergi? Nak naik apa?', hint: 'Discuss duration and transport' },
      { examiner: 'Kita kena tempah hotel juga. Awak nak bilik macam mana?', hint: 'Discuss accommodation preferences' },
      { examiner: 'Apa aktiviti yang awak nak buat di sana?', hint: 'List activities — beach, hiking, food, etc.' },
      { examiner: 'Kita kena bawa apa? Awak tolong senaraikan.', hint: 'List packing items, mention budget' },
    ]
  },
  {
    id: 'kedai-buku',
    title: 'Di Kedai Buku',
    titleEn: 'At the Bookstore',
    context: 'Anda di kedai buku untuk membeli buku teks dan buku cerita.',
    contextEn: 'You are at a bookstore to buy textbooks and storybooks.',
    turns: [
      { examiner: 'Selamat datang! Cari buku apa hari ini?', hint: 'Say what books you need, subjects' },
      { examiner: 'Buku teks ada di tingkat dua. Nak saya tunjuk?', hint: 'Accept help, ask about prices' },
      { examiner: 'Buku Sains RM35 dan Matematik RM30. Ada diskaun untuk pelajar.', hint: 'Ask about discount, mention budget' },
      { examiner: 'Diskaun 10% dengan kad pelajar. Nak buku cerita juga?', hint: 'Ask for recommendations, mention interests' },
      { examiner: 'Saya cadangkan novel ini. Sangat popular. Jumlah semua RM80.', hint: 'Decide, pay, thank them' },
    ]
  },
  {
    id: 'sukarelawan',
    title: 'Kerja Sukarelawan',
    titleEn: 'Volunteer Work',
    context: 'Anda ingin menyertai program sukarelawan di komuniti.',
    contextEn: 'You want to join a community volunteer program.',
    turns: [
      { examiner: 'Terima kasih kerana berminat! Kenapa anda nak jadi sukarelawan?', hint: 'Explain motivation — help community, learn skills' },
      { examiner: 'Bagus! Kami ada program bersihkan pantai dan mengajar kanak-kanak. Pilih mana?', hint: 'Choose program, explain preference' },
      { examiner: 'Program bermula Sabtu depan. Boleh commit setiap minggu?', hint: 'Discuss availability, ask about schedule' },
      { examiner: 'Anda perlu bawa pakaian yang sesuai dan air. Ada pengalaman?', hint: 'Mention any experience, ask what to expect' },
      { examiner: 'Nanti kami beri sijil penyertaan. Ada soalan lain?', hint: 'Ask about certificate, team, duration' },
    ]
  },
  {
    id: 'sukan',
    title: 'Hari Sukan',
    titleEn: 'Sports Day',
    context: 'Anda menyertai acara hari sukan sekolah.',
    contextEn: 'You are participating in the school sports day.',
    turns: [
      { examiner: 'Hari sukan tahun ini! Awak masuk acara apa?', hint: 'State events — running, long jump, etc.' },
      { examiner: 'Hebat! Sudah berlatih? Macam mana persediaan awak?', hint: 'Describe training routine' },
      { examiner: 'Lawan awak kuat tahun ini. Rasa boleh menang?', hint: 'Express confidence, discuss competitors' },
      { examiner: 'Acara awak akan bermula dalam 30 minit. Dah warm-up?', hint: 'Talk about warm-up, feelings before event' },
      { examiner: 'Tahniah! Awak dapat tempat kedua! Macam mana perasaan?', hint: 'Express feelings, plans for next year' },
    ]
  },
];

export default SCENARIOS;

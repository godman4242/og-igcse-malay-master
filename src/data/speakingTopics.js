// IGCSE Malay Paper 3 (oral) topic prompts. Each topic has the prompt
// the student should respond to plus a few prep cues to help them get
// started. The grader uses these to anchor "did the student address the
// topic" judgements.

const TOPICS = [
  {
    id: 'family',
    title: 'Keluarga Saya',
    titleEn: 'My Family',
    prompt: 'Ceritakan tentang keluarga anda — siapa ahli keluarga, apa yang anda suka tentang mereka, dan satu kenangan istimewa.',
    cues: ['Ahli keluarga (nama & pekerjaan)', 'Personaliti', 'Kenangan istimewa', 'Pengajaran daripada keluarga'],
    expectedDurationSec: 90,
  },
  {
    id: 'school',
    title: 'Kehidupan Sekolah',
    titleEn: 'School Life',
    prompt: 'Cerita tentang kehidupan sekolah anda — subjek kegemaran, aktiviti kokurikulum, dan cabaran yang anda hadapi.',
    cues: ['Subjek kegemaran (sebab)', 'Kokurikulum', 'Cabaran & cara mengatasinya', 'Cita-cita'],
    expectedDurationSec: 90,
  },
  {
    id: 'hobby',
    title: 'Hobi Saya',
    titleEn: 'My Hobby',
    prompt: 'Terangkan hobi anda. Mengapa anda meminatinya? Bila anda mula? Apa manfaatnya?',
    cues: ['Apa hobi itu', 'Bila & bagaimana mula', 'Sebab meminatinya', 'Manfaat fizikal/mental'],
    expectedDurationSec: 75,
  },
  {
    id: 'technology',
    title: 'Teknologi dalam Kehidupan',
    titleEn: 'Technology in Daily Life',
    prompt: 'Bincangkan kesan teknologi dalam kehidupan harian. Adakah lebih banyak kebaikan atau keburukan?',
    cues: ['Contoh teknologi (telefon, media sosial)', 'Kebaikan', 'Keburukan', 'Pendapat akhir'],
    expectedDurationSec: 90,
  },
  {
    id: 'environment',
    title: 'Alam Sekitar',
    titleEn: 'The Environment',
    prompt: 'Apa masalah alam sekitar yang paling membimbangkan? Bagaimana remaja boleh membantu?',
    cues: ['Masalah utama (banjir, pencemaran)', 'Sebab masalah', 'Tindakan remaja', 'Cadangan kerajaan'],
    expectedDurationSec: 90,
  },
  {
    id: 'health',
    title: 'Gaya Hidup Sihat',
    titleEn: 'Healthy Lifestyle',
    prompt: 'Mengapa gaya hidup sihat penting? Apa amalan baik yang anda lakukan?',
    cues: ['Pemakanan seimbang', 'Senaman', 'Tidur cukup', 'Kesihatan mental'],
    expectedDurationSec: 75,
  },
  {
    id: 'travel',
    title: 'Tempat Yang Ingin Dilawati',
    titleEn: 'A Place I Want to Visit',
    prompt: 'Cerita tentang satu tempat yang anda ingin lawati — di mana, mengapa, dan apa yang ingin anda buat di sana.',
    cues: ['Lokasi & ciri unik', 'Sebab tertarik', 'Aktiviti', 'Persediaan'],
    expectedDurationSec: 75,
  },
  {
    id: 'role-model',
    title: 'Idola Saya',
    titleEn: 'My Role Model',
    prompt: 'Siapa idola anda dan mengapa? Apa pengajaran yang anda boleh ambil daripada mereka?',
    cues: ['Siapa orang itu', 'Pencapaian', 'Sifat yang dikagumi', 'Pengajaran untuk diri sendiri'],
    expectedDurationSec: 75,
  },
  {
    id: 'social-media',
    title: 'Media Sosial',
    titleEn: 'Social Media',
    prompt: 'Adakah media sosial baik atau buruk untuk remaja? Berikan pendapat anda dengan contoh.',
    cues: ['Cara remaja guna media sosial', 'Kesan positif', 'Kesan negatif', 'Cadangan penggunaan bijak'],
    expectedDurationSec: 90,
  },
  {
    id: 'culture',
    title: 'Budaya Malaysia',
    titleEn: 'Malaysian Culture',
    prompt: 'Apa yang anda paling banggakan tentang budaya Malaysia? Bagaimana kita memastikan ia kekal?',
    cues: ['Kepelbagaian etnik', 'Makanan / perayaan', 'Kebanggaan diri', 'Cara mengekalkan budaya'],
    expectedDurationSec: 90,
  },
]

export default TOPICS

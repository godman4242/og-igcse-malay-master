// scripts/build-missing-icons-prompts.mjs
//
// Build FLUX-1-Pro prompts for every Malay word defined in `src/data/wordFamilies.js`.
//
// Outputs (both refreshed in lockstep so the manifest and the prompts can never
// drift out of sync):
//   - scripts/missing-icons-manifest.json         (manifest of every word + type + root)
//   - scripts/missing-icons-prompts-enhanced.json (manifest with the rendered FLUX prompt)
//
// The "missing-only" mode (default) emits only the words that don't yet have a
// webp under public/dict-icons; --all emits every word in wordFamilies (so the
// overnight runner can `--force` regenerate any of them with a consistent prompt).
//
// Usage:
//   node scripts/build-missing-icons-prompts.mjs           # default: missing only
//   node scripts/build-missing-icons-prompts.mjs --all     # every wordFamily word
//   node scripts/build-missing-icons-prompts.mjs --report  # don't write files; print diff

import { writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WORD_FAMILIES_PATH = path.join(ROOT, 'src', 'data', 'wordFamilies.js');
const ICONS_DIR = path.join(ROOT, 'public', 'dict-icons');
const MANIFEST_PATH = path.join(ROOT, 'scripts', 'missing-icons-manifest.json');
const ENHANCED_PATH = path.join(ROOT, 'scripts', 'missing-icons-prompts-enhanced.json');

// ---------------------------------------------------------------------------
// Root-level metaphors. Each entry is one short visual sentence — no text,
// no letters, no numbers, no UI furniture.
// ---------------------------------------------------------------------------
const ROOT_METAPHOR = {
  tulis:   'an elegant quill dipping into ink, leaving a graceful swirl across cream paper',
  ajar:    'a glowing book floating above an open palm, tiny stars drifting upward',
  kerja:   'a stylised cog-wheel intertwined with a rising sun',
  masak:   'a sizzling wok releasing fragrant steam shaped like a soft cloud',
  baca:    'an open book with luminous pages turning in a gentle breeze',
  jual:    'a market storefront awning with a hanging price tag and a shining coin',
  beli:    'a glowing shopping bag wrapped with a silk ribbon and a single coin',
  makan:   'a steaming bowl of rice with chopsticks resting on top, gentle vapour curls',
  minum:   'a frosted glass with a single droplet falling, ripples on the surface',
  main:    'a colourful spinning top mid-twirl with sparkles trailing around it',
  jalan:   'a winding cobbled path stretching toward a soft glowing horizon',
  cari:    'a polished magnifying glass hovering over a trail of luminous footprints',
  potong:  'a sleek chef knife slicing cleanly through a citrus fruit',
  sapu:    'a wooden broom mid-sweep with soft motion lines and gentle dust particles',
  goreng:  'a hot frying pan with golden cracklings and rising oil bubbles',
  hantar:  'a paper aeroplane mid-flight with a glowing comet trail',
  didik:   'a young sapling growing out of an open book, bathed in soft light',
  hubung:  'two glowing nodes linked by a luminous arc of energy',
  latih:   'a pair of stylised dumbbells with a motion-blur swoosh behind them',
  bangun:  'a sun rising behind a half-built tower of stacked blocks',
  lukis:   'a paintbrush stroking a rainbow arc across a fresh white canvas',
  dengar:  'a stylised ear with concentric sound waves rippling outward',
  nyanyi:  'a vintage microphone with musical notes floating upward in a soft glow',
  siar:    'a stylised radio tower with concentric signal waves spreading outward',
  tanya:   'a glowing question mark hovering above an open palm',
  fikir:   'a stylised brain with luminous synapses firing tiny sparks',
  guna:    'a hand gripping a stylised wrench with motion lines around it',
  tahu:    'a glowing lightbulb floating above an open book',
  ubah:    'two circling arrows forming an infinity loop with drifting sparkles',
  bersih:  'a sparkling water droplet bouncing on a polished mirror surface',
  pandu:   'a polished steering wheel with soft motion-blur streaks behind it',
  tinggi:  'a slender lighthouse reaching upward into soft pastel clouds',
  indah:   'a single hibiscus bloom haloed by a soft golden glow',
  sedia:   'a stylised checkmark resting inside a polished wooden clipboard',
  baik:    'a stylised thumbs-up gesture surrounded by a soft halo of light',
  takut:   'a stylised silhouette stepping back, surrounded by trembling shadow ripples',
  tinggal: 'a cosy lantern glowing on a wooden doorstep at dusk',
  pukul:   'a stylised wooden gavel striking a round base with concentric impact rings',
  tangkap: 'a translucent butterfly net mid-swing capturing a glowing orb',
  sihat:   'a stylised heart entwined with a single fresh green leaf and a soft pulse line',
  aman:    'a single white dove silhouette gliding against a soft sunrise',
};

// ---------------------------------------------------------------------------
// Per-word metaphor overrides. Lead with the most semantically-loaded visual
// the form deserves (passive => object/result, agent => stylised silhouette,
// -an => the produced artifact, ter- => completion or accidental state, etc.).
// Roots that already have a webp icon (tulis, ajar, baca, …) get a premium
// override here so a `--force` regeneration produces consistent style.
// ---------------------------------------------------------------------------
const WORD_OVERRIDES = {
  // ---- tulis (write) family ----
  tulis:      'an elegant quill dipping into a polished inkwell beside cream paper',
  menulis:    'an elegant quill mid-stroke drawing a graceful swirl across cream paper, ink glistening',
  ditulis:    'a finished line of glowing ink resting on a parchment page, the quill set aside',
  penulis:    'a stylised writer silhouette in soft profile holding a quill above a notebook',
  penulisan:  'a softly lit desk scene with stacked papers, an open inkwell and a quill',
  tulisan:    'an elegant calligraphic flourish glowing on a single sheet of parchment',
  bertulis:   'a glowing pen tip tracing a luminous arc across paper, alive with energy',
  tertulis:   'engraved letters shimmering faintly on a smooth stone tablet',

  // ---- ajar (teach/learn) family ----
  ajar:        'an open book glowing softly with tiny stars drifting upward above a palm',
  mengajar:    'a teacher silhouette gesturing toward a glowing chalkboard with floating sparks',
  diajar:      'an attentive student silhouette with golden insight rays falling onto an open palm',
  belajar:     'a focused student silhouette at a desk with an open book and a softly glowing pencil',
  mempelajari: 'a curious silhouette leaning over a glowing book, threads of light rising from the pages',
  pelajar:     'a graduate silhouette in cap and gown holding a small glowing diploma',
  pengajar:    'a teacher silhouette holding a piece of chalk beside a luminous board',
  pelajaran:   'a neatly opened textbook with glowing pages and a single bookmark ribbon',
  pengajaran:  'a softly lit chalkboard with elegant diagrams and a sunrise glow behind it',
  terpelajar:  'a graduate silhouette in cap and gown haloed by a gentle golden light',

  // ---- kerja (work) family ----
  kerja:       'a polished leather briefcase resting on a wooden desk with a luminous cog beside it',
  bekerja:     'a silhouette in a softly lit workshop, tools mid-motion around them',
  mengerjakan: 'a focused silhouette completing a task, small motion lines and a glowing checklist',
  pekerja:     'a stylised worker silhouette wearing a hard hat, calm and steady',
  pekerjaan:   'a tidy workspace with neatly arranged tools laid out on a wooden bench',
  kerjaya:     'a luminous staircase ascending into soft clouds, suggesting a rising career path',
  sekerja:     'two stylised silhouettes working side by side with overlapping motion lines',

  // ---- masak (cook) family ----
  masak:    'a frying pan on a stove with a spatula tending bubbling food, gentle steam rising',
  memasak:  'a sizzling wok with rising steam shaped like a soft cloud above it',
  dimasak:  'a finished dish in a ceramic bowl with delicate steam curling upward',
  pemasak:  'a stylised chef silhouette in toque tending a steaming pot with focus',
  masakan:  'a beautifully plated dish of fragrant curry garnished with herbs',
  termasak: 'a perfectly browned dish ready on a wooden trivet, glowing softly',

  // ---- baca (read) family ----
  baca:       'an open hardcover book with luminous pages turning gently in a soft breeze',
  membaca:    'an open book with pages turning gently, soft light glowing from the spine',
  dibaca:     'a single highlighted passage glowing warmly across an open page',
  pembaca:    'a stylised reader silhouette absorbed in an open book in soft profile',
  pembacaan:  'a polished podium with an open book under a single warm spotlight',
  bacaan:     'a stack of well-loved books with ribbon bookmarks peeking out',
  terbaca:    'an open book whose passage suddenly illuminates with a soft glow',

  // ---- jual (sell) family ----
  jual:       'a small market stall with a hanging price tag, a single coin glowing on the counter',
  menjual:    'a stylised vendor silhouette behind a wooden stall with a glowing coin in hand',
  dijual:     'a market item with a luminous price tag tied to it with twine',
  penjual:    'a friendly vendor silhouette standing behind a vibrant market stall',
  jualan:     'a row of vibrant market goods neatly arranged on a wooden display',
  penjualan:  'a glowing receipt with stacked golden coins beside it',
  terjual:    'a sold tag glowing softly on a freshly emptied market display',

  // ---- beli (buy) family ----
  beli:       'a glowing shopping bag wrapped with a silk ribbon and a single coin',
  membeli:    'a hand reaching out with a glowing coin toward a market item',
  dibeli:     'a wrapped purchase tied with twine and a small receipt curling beside it',
  pembeli:    'a stylised shopper silhouette carrying a soft glowing shopping bag',
  belian:     'a wrapped gift with a ribbon and a small receipt nestled beside it',
  membelikan: 'a silhouette presenting a wrapped gift to an outstretched hand',

  // ---- makan (eat) family ----
  makan:    'a stylised plate with crossed fork and spoon and a single grain of rice glowing softly',
  memakan:  'a steaming bowl of rice with chopsticks lifting a single grain',
  dimakan:  'a clean plate with a single crumb and a glowing fork resting beside it',
  pemakan:  'a stylised diner silhouette seated at a table with a bowl in hand',
  makanan:  'a beautifully plated meal with garnish and rising vapour curls',
  termakan: 'an emptied plate with a single soft glow where the meal once was',

  // ---- minum (drink) family ----
  minum:    'a tall frosted glass of water with a single suspended droplet about to fall',
  meminum:  'a frosted glass tilted gently with a final ripple on its surface',
  diminum:  'a half-empty glass with a single suspended droplet caught mid-fall',
  peminum:  'a stylised silhouette sipping from a tall glass, soft steam rising',
  minuman:  'a tall iced drink with a sprig of mint and condensation droplets',

  // ---- main (play) family ----
  main:       'a stylised retro game controller with two glowing joysticks and soft sparkles',
  bermain:    'a child-like silhouette mid-jump with sparkles and a colourful spinning top',
  memainkan:  'two hands plucking a stylised guitar string with floating musical notes',
  pemain:     'a stylised player silhouette in dynamic action pose',
  mainan:     'a colourful toy block sitting in a soft beam of light',
  permainan:  'a stylised chessboard with three pieces glowing in soft pastel hues',

  // ---- jalan (walk/road) family ----
  jalan:        'a paved cobbled road winding toward a soft glowing horizon with crisp lane markings',
  berjalan:     'a stylised silhouette mid-step walking along a softly lit path, motion lines trailing',
  menjalankan:  'a silhouette pushing a glowing wheel forward, motion lines trailing behind',
  pejalan:      'a stylised walker silhouette mid-step on a softly lit path',
  jalanan:      'a quiet urban street scene with stylised buildings and a warm streetlamp',
  perjalanan:   'a stylised suitcase resting beside a winding path that curves into the distance',

  // ---- cari (search) family ----
  cari:        'a polished brass magnifying glass hovering over a luminous map',
  mencari:     'a polished magnifying glass hovering over a trail of luminous footprints',
  dicari:      'a single glowing object highlighted within the beam of a searchlight',
  pencari:     'a stylised silhouette holding a magnifying glass over an open map',
  pencarian:   'a magnifying glass and an unfurled treasure map laid neatly side by side',
  mencarikan:  'a silhouette extending a found object toward an outstretched hand',

  // ---- potong (cut) family ----
  potong:    'a sleek pair of metal scissors slicing through a leaf with a clean motion arc',
  memotong:  'a sleek chef knife mid-slice through a citrus fruit, droplets spraying',
  dipotong:  'a freshly cut piece of fruit resting on a clean wooden board',
  pemotong:  'a stylised silhouette wielding a knife with a calm, focused stance',
  potongan:  'a single tidy slice of fruit displaying a neat cross-section',

  // ---- sapu (sweep) family ----
  sapu:     'a wooden broom standing upright beside a small pile of swept dust',
  menyapu:  'a wooden broom mid-sweep with soft motion lines and drifting dust particles',
  disapu:   'a freshly swept floor with the faint trail of a broom mark visible',
  penyapu:  'a stylised silhouette sweeping the floor with steady, rhythmic motion',
  sapuan:   'a graceful sweeping arc traced across a polished wooden floor',

  // ---- goreng (fry) family ----
  goreng:     'a hot frying pan with golden oil bubbles rising and gentle steam',
  menggoreng: 'a chef silhouette tilting a hot frying pan with rising bubbles and steam',
  digoreng:   'golden crispy snacks resting on parchment paper, glistening with oil',
  penggoreng: 'a stylised silhouette tending a frying pan with focused calm',
  gorengan:   'a small heap of crispy golden fritters arranged on a wooden plate',

  // ---- hantar (send/deliver) family ----
  hantar:       'a paper aeroplane mid-flight with a glowing comet trail and a small envelope tucked under its wing',
  menghantar:   'a paper aeroplane mid-flight with a luminous comet trail behind it',
  dihantar:     'a delivered package on a doorstep with a gentle glow around the seal',
  penghantar:   'a stylised courier silhouette holding a parcel with both hands',
  penghantaran: 'a delivery van mid-route with a glowing package floating above it',

  // ---- didik (educate) family ----
  didik:       'a young sapling growing out of an open book, bathed in soft light',
  mendidik:    'a teacher silhouette guiding a small luminous sapling rising from a book',
  dididik:     'a small silhouette absorbing golden light radiating from an open book',
  pendidik:    'a stylised educator silhouette with an open book and a glowing leaf',
  pendidikan:  'a graduation cap resting atop a stack of softly glowing books',
  berdidik:    'a silhouette standing beside a sapling and an open book, both glowing softly',

  // ---- hubung (connect) family ----
  hubung:        'two glowing nodes linked by a luminous arc of energy',
  menghubungi:   'a stylised phone with soft glowing signal arcs radiating outward',
  menghubungkan: 'a hand connecting two glowing nodes with a luminous thread',
  dihubungi:     'a phone receiving an incoming glowing signal, with arcs around it',
  penghubung:    'a stylised bridge silhouette linking two softly glowing islands',
  hubungan:      'two hands clasped together with a luminous link of light between them',
  berhubung:     'two stylised silhouettes connected by a glowing thread of light',

  // ---- latih (train) family ----
  latih:     'a pair of stylised dumbbells with a clean motion-blur swoosh behind them',
  melatih:   'a coach silhouette directing motion lines around a focused trainee',
  dilatih:   'a stylised athlete silhouette flexing with subtle motion-blur',
  pelatih:   'a stylised coach silhouette with a whistle and a clipboard',
  latihan:   'a fitness scene with neat dumbbells, a notebook and a water bottle',
  berlatih:  'a stylised silhouette mid-exercise with crisp motion lines around them',
  terlatih:  'an athlete silhouette confidently posed mid-motion, glowing softly',

  // ---- bangun (build/wake) family ----
  bangun:        'a sun rising behind a half-built tower of stacked blocks',
  membangun:     'a stylised crane lifting blocks into a half-finished tower',
  membangunkan:  'a soft alarm clock with golden rays of morning light radiating outward',
  dibangunkan:   'a softly glowing alarm clock with rays gently waking a sleeping silhouette',
  pembangunan:   'a stylised cityscape under construction with cranes and rising buildings',
  bangunan:      'a polished modern skyscraper silhouette against a pastel sky',
  terbangun:     'a startled silhouette sitting up as soft sunlight floods through a window',

  // ---- lukis (paint) family ----
  lukis:    'a wooden artist palette dotted with paint and a single fine brush resting across it',
  melukis:  'a paintbrush stroking a rainbow arc across a fresh white canvas',
  dilukis:  'a freshly painted canvas drying on an easel with the brush set aside',
  pelukis:  'a stylised painter silhouette holding a palette and brush before an easel',
  lukisan:  'a framed painting displayed on an easel under a soft gallery light',

  // ---- dengar (hear/listen) family ----
  dengar:       'a stylised human ear with three luminous concentric sound waves arcing outward',
  mendengar:    'a stylised ear with concentric sound waves rippling outward',
  mendengarkan: 'an attentive silhouette with a hand cupped to one ear, sound waves curling in',
  didengar:     'a single glowing sound wave being intercepted by an attentive ear',
  pendengar:    'a stylised listener silhouette leaning forward with hand to ear',
  pendengaran:  'a stylised ear with three concentric sound waves blooming outward',
  terdengar:    'an ear catching a sudden glowing sound wave, ripples expanding outward',
  kedengaran:   'a softly drifting sound wave glowing gently in calm air',

  // ---- nyanyi (sing) family ----
  nyanyi:      'a vintage stage microphone with musical notes floating upward in a warm soft glow',
  menyanyi:    'a vintage microphone with musical notes floating upward in a soft glow',
  menyanyikan: 'a silhouette singing on a small stage with luminous notes spiralling above',
  dinyanyikan: 'a single luminous music note unfurling into a graceful melody trail',
  penyanyi:    'a stylised singer silhouette holding a microphone with notes rising',
  nyanyian:    'a music sheet with floating notes drifting up like fireflies',

  // ---- siar (broadcast/stroll) family ----
  siar:           'a stylised radio tower with concentric signal waves spreading outward',
  menyiarkan:     'a softly glowing microphone broadcasting concentric ripples',
  disiarkan:      'a glowing screen radiating concentric broadcast waves outward',
  penyiar:        'a stylised broadcaster silhouette at a softly lit microphone',
  penyiaran:      'a broadcast booth with a luminous microphone and signal arcs',
  siaran:         'a glowing television screen with broadcast waves rippling outward',
  'bersiar-siar': 'a stylised silhouette strolling beneath a sunlit street with gentle motion',

  // ---- tanya (ask) family ----
  tanya:       'a tall, glowing pastel question mark hovering above an open palm',
  menanya:     'a stylised silhouette raising a hand with a glowing question mark above',
  bertanya:    'a silhouette with raised hand and a softly floating question mark',
  ditanya:     'a glowing question mark hovering before an attentive silhouette',
  penanya:     'a stylised inquirer silhouette with a question mark above their head',
  pertanyaan:  'a glowing question mark cradled within a softly drawn speech bubble',
  soal:        'a stylised question mark resting on an open scroll beside a quill',

  // ---- fikir (think) family ----
  fikir:        'a luminous thought bubble drifting above a stylised head silhouette with a small spark inside',
  berfikir:     'a thinker silhouette in classic pose with a small glowing thought spark',
  memikirkan:   'a silhouette deep in focus with luminous thought sparks orbiting above',
  pemikir:      'a stylised thinker silhouette with chin on hand in classic pose',
  pemikiran:    'a stylised brain glowing with luminous circuits and softly drifting sparks',
  fikiran:      'a soft cloud of luminous thought sparks drifting upward in pastel hues',

  // ---- guna (use) family ----
  guna:        'a polished wrench crossed with a small screwdriver, soft sparkles around them',
  menggunakan: 'a silhouette actively wielding a tool with crisp motion lines',
  digunakan:   'a tool mid-use with motion-blur and small swirling sparks',
  pengguna:    'a stylised user silhouette holding a tool with steady focus',
  penggunaan:  'a stylised hand using a tool with arcs of motion around it',
  kegunaan:    'a stylised gear with a glowing checkmark resting at its centre',
  berguna:     'a stylised tool glowing warmly while actively held in a hand',

  // ---- tahu (know) family ----
  tahu:           'a glowing lightbulb floating just above an open book, soft sparkles around it',
  mengetahui:     'a silhouette with a softly glowing lightbulb appearing above their head',
  diketahui:      'a glowing lightbulb floating gently above an open palm',
  pengetahuan:    'an open book with a glowing constellation of stars above its pages',
  ketahui:        'a single luminous lightbulb being gently grasped by a hand',
  berpengetahuan: 'a silhouette haloed by drifting stars and stacked books at their feet',

  // ---- ubah (change) family ----
  ubah:        'two circling pastel arrows forming an infinity loop with drifting sparkles',
  mengubah:    'two circling arrows forming an infinity loop with drifting sparkles',
  diubah:      'two arrows in mid-swap, with a soft trail of sparkles around them',
  pengubah:    'a stylised silhouette adjusting two interlocked rotating gears',
  perubahan:   'a stylised butterfly emerging gracefully from a luminous chrysalis',
  berubah:     'a butterfly silhouette mid-transformation surrounded by soft sparkles',

  // ---- bersih (clean) family ----
  bersih:         'a sparkling water droplet bouncing on a polished mirror surface',
  membersihkan:   'a silhouette polishing a sparkling surface with a soft cloth',
  dibersihkan:    'a freshly polished surface with the faint fading motion of a cloth',
  pembersih:      'a stylised silhouette holding a cloth, surface gleaming beside them',
  pembersihan:    'a sparkling clean surface with a polishing cloth resting beside it',
  kebersihan:     'a single gleaming droplet on a pristine surface with soft halo',
  bersihkan:      'a hand wiping clean a softly glowing surface with a fresh cloth',

  // ---- pandu (drive/guide) family ----
  pandu:    'a polished steering wheel framed by soft trailing motion arcs',
  memandu:  'a steering wheel turning with subtle motion-blur arcs around it',
  dipandu:  'a steering wheel rotating gently with soft trailing motion arcs',
  pemandu:  'a stylised driver silhouette behind a steering wheel, calm and focused',
  panduan:  'a stylised guidebook open beside a small brass compass',

  // ---- tinggi (tall/high) family ----
  tinggi:       'a slender lighthouse reaching upward into soft pastel clouds',
  meninggikan:  'a silhouette stacking glowing blocks upward into a tall column',
  ketinggian:   'a tall mountain peak rising serenely above soft pastel clouds',
  tertinggi:    'a soaring summit piercing through golden clouds, sunlight gleaming',
  setinggi:     'two tall stylised columns side by side reaching equally toward the sky',

  // ---- indah (beautiful) family ----
  indah:        'a single hibiscus bloom haloed by a soft golden glow',
  keindahan:    'an exquisite hibiscus blossom radiating in warm golden light',
  terindah:     'a single radiant hibiscus surrounded by drifting golden particles',
  memperindah:  'a silhouette adding final petals to a blossoming flower with care',

  // ---- sedia (ready/provide) family ----
  sedia:        'a stylised checkmark resting inside a polished wooden clipboard',
  bersedia:     'a stylised silhouette in a ready stance with a clipboard in hand',
  menyediakan:  'a silhouette presenting a neatly arranged tray with soft glow',
  disediakan:   'a tray neatly laid out with all items in place and a soft halo',
  penyedia:     'a stylised provider silhouette presenting a tray of items',
  persediaan:   'a neatly organised checklist with a pencil resting on top',
  kesediaan:    'a polished clipboard with a glowing checkmark at its centre',

  // ---- baik (good) family ----
  baik:         'a large stylised thumbs-up gesture haloed by a soft golden glow',
  memperbaiki:  'a stylised silhouette adjusting a glowing object with careful tools',
  kebaikan:     'a stylised heart radiating a soft halo of warm light',
  terbaik:      'a gleaming golden trophy resting on a polished pedestal',
  sebaik:       'two stylised thumbs-up gestures side by side haloed in soft light',
  perbaiki:     'a stylised hand turning a small screwdriver on a glowing object',

  // ---- takut (fear) family ----
  takut:        'a stylised silhouette stepping back, surrounded by trembling shadow ripples',
  menakutkan:   'a shadowy silhouette with an ominous aura and curling dark mist',
  ketakutan:    'a trembling silhouette wrapped in soft shadow with faint ripples',
  penakut:      'a stylised timid silhouette shrinking back, hands raised gently',
  ditakuti:     'a shadowy presence retreating from a softly glowing protective aura',

  // ---- tinggal (live/leave) family ----
  tinggal:       'a cosy lantern glowing on a wooden doorstep at dusk',
  meninggalkan:  'a silhouette walking away with luminous footprints left behind',
  ditinggalkan:  'a single empty wooden chair under a soft warm spotlight',
  kediaman:      'a cosy house silhouette with warm glowing windows under twilight',
  peninggalan:   'an ancient stone monument resting under a soft moonlit glow',
  ketinggalan:   'a fading suitcase on an empty platform with a soft drifting mist',
  bertinggal:    'a silhouette pausing beside a glowing lantern at a doorway',

  // ---- pukul (hit) family ----
  pukul:     'a stylised wooden gavel striking a round base with concentric impact rings',
  memukul:   'a hand swinging a small bat with motion lines and impact sparkles',
  dipukul:   'an impact ring radiating outward from a soft point of contact',
  pemukul:   'a stylised silhouette wielding a bat in dynamic mid-motion',
  pukulan:   'a stylised gavel mid-strike with concentric impact rings around it',
  terpukul:  'a silhouette recoiling slightly with soft impact ripples around them',

  // ---- tangkap (catch) family ----
  tangkap:      'a translucent butterfly net mid-swing capturing a glowing orb',
  menangkap:    'a hand reaching to catch a luminous orb mid-air with sparkles',
  ditangkap:    'a glowing creature gently suspended inside a translucent net',
  penangkapan:  'a stylised hand reaching outward and capturing a small beam of light',
  tangkapan:    'a luminous creature resting inside a softly glowing net',
  tertangkap:   'a glowing orb suddenly suspended in a beam of light, sparkles drifting',

  // ---- sihat (healthy) family ----
  sihat:        'a stylised heart entwined with a single fresh green leaf and a soft pulse line',
  menyihatkan:  'a leaf-shaped pulse line arching gently over a stylised heart',
  kesihatan:    'a stylised heart entwined with a green leaf and a glowing pulse line',
  penyihat:     'a stylised wellness silhouette holding a fresh green leaf',

  // ---- aman (peaceful) family ----
  aman:         'a single white dove silhouette gliding against a soft sunrise',
  mengamankan:  'a silhouette shielding a small white dove with both hands',
  keamanan:     'a single dove silhouette carrying a small olive branch in its beak',
  pengaman:     'a stylised peacekeeper silhouette gently holding a small dove',
};

// Motion words — when the metaphor contains any of these, the composition
// gains a "subtle motion-blur" hint.
const MOTION_PATTERN = /\b(motion|mid-flight|mid-swing|mid-slice|mid-sweep|mid-stroke|mid-jump|mid-transformation|mid-motion|mid-step|mid-strike|mid-swap|mid-route|rising|sweeping|swinging|tilting|turning|spinning|striking|sliding|leaping|gliding|dripping|falling|bouncing|reaching|throwing|swooping|streaking|trailing|gleaming|radiating|spiralling|drifting|curling|emerging|bloom(ing)?)\b/i;

function buildPrompt(word, metaphor) {
  const motion = MOTION_PATTERN.test(metaphor);
  const composition = motion
    ? 'Centered composition, balanced negative space, slight vignette, subtle motion-blur.'
    : 'Centered composition, balanced negative space, slight vignette.';
  return [
    `A premium, circular, transparent-background icon for the Malay word "${word}".`,
    `Visual metaphor: ${metaphor}.`,
    'Style: ultra-realistic 8K, hyper-detail, soft-diffuse lighting, pastel-hue palette, subtle depth-of-field, glass-morphism glow, no borders, no text.',
    `Composition: ${composition}`,
    'Negative: no lettering, no watermarks, no background clutter, avoid realistic human faces.',
  ].join(' ');
}

function fallbackMetaphor(word, type, root) {
  if (type === 'form') {
    const base = ROOT_METAPHOR[root];
    if (base) return `${base}, evoking the action of "${word}"`;
    return `a dynamic silhouette of a person performing the action of "${root}", captured with subtle motion-blur`;
  }
  return `a minimal, flat-design icon symbolising "${word}"`;
}

async function loadWordFamilies() {
  const url = pathToFileURL(WORD_FAMILIES_PATH).href;
  const mod = await import(url);
  return mod.default;
}

function listExistingWebp() {
  if (!existsSync(ICONS_DIR)) return new Set();
  return new Set(
    readdirSync(ICONS_DIR).filter(f => f.endsWith('.webp')).map(f => f.replace(/\.webp$/, '')),
  );
}

function parseArgs() {
  const out = { all: false, report: false };
  for (const a of process.argv.slice(2)) {
    if (a === '--all') out.all = true;
    else if (a === '--report') out.report = true;
  }
  return out;
}

async function main() {
  const args = parseArgs();
  const wf = await loadWordFamilies();
  const existing = listExistingWebp();

  const all = [];
  for (const [root, data] of Object.entries(wf)) {
    all.push({ word: root, type: 'root', root });
    for (const f of data.forms) all.push({ word: f.word, type: 'form', root });
  }

  const include = args.all ? all : all.filter(e => !existing.has(e.word));
  const overrideMap = new Map(Object.entries(WORD_OVERRIDES));
  const usedFallback = [];
  const entries = include.map(({ word, type, root }) => {
    const override = overrideMap.get(word);
    const metaphor = override ?? fallbackMetaphor(word, type, root);
    if (override == null) usedFallback.push(word);
    return { word, type, root, prompt: buildPrompt(word, metaphor) };
  });

  const manifestEntries = entries.map(({ word, type, root }) => (type === 'root' ? { word, type } : { word, type, root }));
  const enhancedEntries = entries.map(({ word, prompt }) => ({ word, prompt }));

  if (args.report) {
    console.log(`Total word-family entries: ${all.length}`);
    console.log(`Already have a webp:      ${all.length - include.length}`);
    console.log(`Would write to manifest:  ${include.length}`);
    if (usedFallback.length) {
      console.log(`\nWould use the fallback metaphor (${usedFallback.length}):`);
      for (const w of usedFallback) console.log(`  - ${w}`);
    }
    return;
  }

  mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifestEntries, null, 2) + '\n', 'utf8');
  writeFileSync(ENHANCED_PATH, JSON.stringify(enhancedEntries, null, 2) + '\n', 'utf8');

  console.log(`Wrote manifest (${manifestEntries.length} entries) → ${path.relative(ROOT, MANIFEST_PATH)}`);
  console.log(`Wrote prompts  (${enhancedEntries.length} entries) → ${path.relative(ROOT, ENHANCED_PATH)}`);
  if (usedFallback.length) {
    console.log(`\nUsed fallback metaphor for ${usedFallback.length} words:`);
    for (const w of usedFallback) console.log(`  - ${w}`);
  }
}

await main().catch(err => { console.error('FATAL:', err); process.exit(1); });

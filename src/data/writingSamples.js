// Short, deliberately mid-band (~Band 3) sample drafts for the Writing
// Analyzer's first-visit "Try a sample" affordance. The point is to let a
// blank-page student see the tool work end-to-end: loading one and tapping
// Analyze surfaces a real band score PLUS specific fixes (tense slips,
// repetition, weak connectors, spelling) — not a flat Band 6.
//
// These are intentionally NOT exemplars. Exemplars (src/data/exemplars.js) are
// Band-6 models shown as a target to aspire to; a sample is a realistic learner
// draft with the kind of errors the analyzer is meant to catch.

const WRITING_SAMPLES = {
  eng: `My Best Holiday

Last year me and my family went to the beach for our holiday. It was very fun and very nice. We wake up early and we go swimming in the sea. The water was cold but we enjoy it alot. After that we eat our lunch at a small restaurant near the beach. The food was delicious and we was very happy.

In the evening we walk along the beach and watch the sunset. It was very beautiful. I think this is the best holiday because i can spend time with my family. I hope we can go there again next year because it make me happy.`,

  malay: `Cuti Sekolah Saya

Pada cuti sekolah yang lepas, saya dan keluarga saya pergi ke kampung nenek saya. Saya sangat gembira. Kami bertolak pada pagi hari dengan kereta. Saya rasa penat sangat sebab perjalanan itu sangat jauh.

Di kampung, saya tolong nenek saya memasak. Saya juga tolong dia membersihkan rumah. Pada waktu petang, saya pergi bermain di sungai dengan sepupu saya. Air sungai itu sangat sejuk tetapi saya sangat seronok. Saya harap saya boleh pergi ke kampung itu lagi sebab saya suka sangat tempat itu.`,
}

// Returns the sample draft for the given Writing-page language ('eng' | 'malay').
// Anything else (e.g. 'templates') falls back to English.
export function getWritingSample(lang) {
  return WRITING_SAMPLES[lang === 'malay' ? 'malay' : 'eng'] || WRITING_SAMPLES.eng
}

export default WRITING_SAMPLES

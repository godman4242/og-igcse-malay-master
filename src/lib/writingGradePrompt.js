// Pure, shared builder for the IGCSE English Paper 2 (Writing) grading system
// prompt. Used by BOTH the product (`fetchAIGrade` in gemini.js) and the offline
// AI-tier eval (scripts/ai-tier-eval/harness.mjs) so the two can never drift.
//
// WHY THIS LIVES HERE (not in gemini.js): the eval harness runs under plain Node
// with the extensionless resolver, which only appends `.js`/`/index.js`. gemini.js
// imports `CIKGU_SYSTEM_PROMPT` from `../core/agent/promptLibrary` — a `.ts` file
// the Node resolver cannot reach — so importing the builder from gemini.js under
// the harness fails ("Cannot find module promptLibrary"). This module has NO
// module-level imports, so the harness imports it cleanly. gemini.js re-exports it
// for back-compat (the Task-2 byte-identity test imports from '../gemini.js').
//
// PARITY INVARIANT: with no `task` AND no `lang` (or lang:'eng'), the returned
// string is byte-for-byte identical to the historical inline prompt (pinned by
// src/lib/__tests__/writingGradePrompt.test.js). `task` is optional —
// `{ prompt: string, requirements: string[] }` — and adds a task-aware Content /
// task-fulfilment trait WITHOUT altering the no-task text. `lang:'malay'` swaps in
// the IGCSE Bahasa Melayu Kertas 2 examiner persona + Malay band descriptors +
// Malay anti-over-praise rule, while keeping the SAME JSON keys (content_band,
// task_coverage, req_i, …) the app + eval parse on. Any other lang → English.
export function buildWritingGradePrompt({ formatHints, metrics, findings, task, lang }) {
  // Map format hints into a JSON schema expectation string so the AI knows what
  // keys to output. SHARED — key names are language-neutral (both branches use it).
  const markerKeys = formatHints && formatHints.length > 0
    ? formatHints.map(hint => `"${hint.toLowerCase().replace(/[^a-z0-9]+/g, '_')}": boolean`).join(', ')
    : '"meets_general_structure": boolean';

  // Format local findings to inject into the prompt
  const findingsList = findings && findings.length > 0
    ? findings.slice(0, 15).map(f => `- ${f.type} (${f.severity}): "${f.excerpt}" -> ${f.message}`).join('\n')
    : 'No major grammar or spelling errors found.';

  const metricsString = metrics
    ? `Word count: ${metrics.wordCount}. Lexical diversity (TTR): ${metrics.ttr}. Errors per 100 words: ${metrics.errorsPer100}.`
    : '';

  // ── Malay 0546 examiner branch ──────────────────────────────────────────────
  // A faithful mirror of the English prompt below, in Bahasa Melayu. SAME JSON
  // keys (only the persona/calibration/band descriptors/instructions are Malay) so
  // ContentTraitPanel, missedRequirements and the over-praise eval read it
  // identically. The English branch is left byte-identical (returned early-after).
  if (lang === 'malay') {
    const antiOverPraiseMs = task
      ? `\n- ISI BERASINGAN DARIPADA BAHASA: karangan yang lancar dan ditulis dengan baik tetapi terpesong daripada tugasan, mengabaikan tugasan, atau menyentuh hanya sedikit isi yang dikehendaki MESTI mendapat Band Isi ≤ 2. Kelancaran TIDAK PERNAH menyelamatkan jawapan yang terpesong. Berikan Band Isi tinggi hanya apabila jawapan benar-benar memenuhi tugasan di atas.`
      : '';
    const taskSectionMs = task
      ? `\n\nTUGASAN (pelajar menjawab tugasan ini — nilai ISI berdasarkannya):
"${task.prompt}"
Tugasan ini menghendaki pelajar:
${task.requirements.map(r => `- ${r}`).join('\n')}`
      : '';
    const contentSchemaMs = task
      ? `,
  "content_band": number,
  "content_justification": "1-2 ayat yang menyatakan keperluan yang dipenuhi/tidak dipenuhi",
  "task_coverage": { ${task.requirements.map((r, i) => `"req_${i}": boolean`).join(', ')} }`
      : '';
    const metricsStringMs = metrics
      ? `Jumlah perkataan: ${metrics.wordCount}. Kepelbagaian leksikal (TTR): ${metrics.ttr}. Kesalahan setiap 100 perkataan: ${metrics.errorsPer100}.`
      : '';
    const findingsListMs = findings && findings.length > 0
      ? findings.slice(0, 15).map(f => `- ${f.type} (${f.severity}): "${f.excerpt}" -> ${f.message}`).join('\n')
      : 'Tiada kesalahan tatabahasa atau ejaan utama dikesan.';

    return `Anda ialah Pemeriksa Kanan IGCSE Bahasa Melayu untuk Kertas 2 (Penulisan). Tugas anda adalah memberikan penilaian yang teliti, adil dan berdasarkan bukti terhadap karangan pelajar.

KALIBRASI PENTING - MENGATASI BIAS AI:
Model AI cenderung mengalami "bias kecenderungan memusat" (memberikan markah 3 atau 4 untuk semua). Anda MESTI menggunakan keseluruhan julat 1-6:
- JANGAN teragak-agak memberikan markah 6. Markah 6/6 BUKAN bermaksud karya pemenang hadiah sastera. Ia bermaksud karangan yang cemerlang dan amat cekap bagi seorang pelajar IGCSE berusia 16 tahun. Jangan menahan markah 6 kerana kesilapan kecil yang tidak menjejaskan makna.
- JANGAN melambungkan markah karangan yang lemah. Jika teks terlalu pendek, banyak pengulangan, atau penuh kesalahan asas, ia MESTI mendapat markah 1 atau 2.${antiOverPraiseMs}

AMBANG TEGAS:
- Peraturan 1: Jika kesalahan kerap mengaburkan makna atau jumlah perkataan terlalu sedikit (< 80 perkataan), BAND MAKSIMUM ialah 2.
- Peraturan 2: Jika metrik tempatan menunjukkan amat sedikit kesalahan, struktur kompleks digunakan, dan format dipenuhi, anda MESTI memberikan markah 5 atau 6.

Protokol Pemarkahan:
1. Analisis Format: Kenal pasti sama ada pelajar memenuhi konvensyen khusus bagi genre yang dipilih.
2. Ambil Kira Heuristik Tempatan:
   Kami telah menjalankan analisis berasaskan peraturan ke atas karangan ini.
   ${metricsStringMs}
   Kesalahan Dikesan:
   ${findingsListMs}
   Jangan reka kesalahan. Gunakan senarai kesalahan yang diberi untuk menilai ketepatan.
3. Berikan Markah daripada 6 (Band Holistik):
   Band 6: Kosa kata canggih dan pelbagai; kohesi lancar; suara tersendiri; hampir tiada kesalahan. (Berikan ini jika metrik menunjukkan amat sedikit kesalahan dan jumlah perkataan tinggi.)
   Band 5: Komunikasi konsisten; kosa kata luas; tersusun rapi; kesilapan kecil sahaja.
   Band 4: Komunikasi jelas; ada struktur kompleks; umumnya tepat tetapi mungkin kurang seri.
   Band 3: Boleh difahami tetapi bergantung pada struktur mudah; kesalahan ketara yang tidak menghalang makna.
   Band 2: Kosa kata asas; kesalahan kerap yang kadangkala menghalang makna; huraian terhad.
   Band 1: Amat cacat; kesalahan teruk dan kerap; komunikasi minimum; terlalu pendek.${taskSectionMs}

Keperluan Output:
Anda mesti memulangkan analisis anda dalam format JSON sahaja. Jangan sertakan sebarang teks perbualan. Gunakan skema yang tepat ini:
{
  "step_by_step_reasoning": "Sebelum memberi markah, analisis ringkas tatabahasa, kosa kata dan kohesi berdasarkan heuristik dan teks. Tentukan sama ada ia condong ke hujung melampau (1/2 atau 5/6).",
  "band": number,
  "justification": "Ringkasan 2 ayat tentang sebab markah ini diberikan, dengan merujuk deskriptor band secara jelas.",
  "positives": ["Perkara 1", "Perkara 2"],
  "improvements": ["Bahagian khusus 1", "Bahagian khusus 2"],
  "marker_check": { ${markerKeys} }${contentSchemaMs}
}`;
  }

  // Task-aware additions (only when a task is supplied). Kept as separate
  // interpolations so the no-task branch is empty strings → byte-identical text.
  const antiOverPraise = task
    ? `\n- CONTENT IS SEPARATE FROM LANGUAGE: a fluent, well-written essay that is off-topic, ignores the task, or addresses few of the required points MUST score Content band ≤ 2. Fluency NEVER rescues an off-task answer. Only award high Content when the response genuinely fulfils the task above.`
    : '';

  const taskSection = task
    ? `\n\nTASK (the student was answering this — judge CONTENT against it):
"${task.prompt}"
The task requires the student to:
${task.requirements.map(r => `- ${r}`).join('\n')}`
    : '';

  const contentSchema = task
    ? `,
  "content_band": number,
  "content_justification": "1-2 sentences citing which requirements were/were not met",
  "task_coverage": { ${task.requirements.map((r, i) => `"req_${i}": boolean`).join(', ')} }`
    : '';

  return `You are a Senior IGCSE English Language Examiner for Paper 2 (Writing). Your task is to provide a rigorous, fair, and evidence-based evaluation of student essays.

CRITICAL CALIBRATION - OVERCOMING AI BIAS:
LLMs typically suffer from "central tendency bias" (scoring everything a 3 or 4). You MUST use the full 1-6 range:
- DO NOT hesitate to award a 6. A 6/6 does NOT mean a Pulitzer-prize winning masterpiece. It means an excellent, highly competent essay for a 16-year-old IGCSE student. Do not withhold 6s for minor, non-impeding slips.
- DO NOT artificially inflate poor essays. If the text is very short, highly repetitive, or full of basic errors, it MUST be a 1 or 2.${antiOverPraise}

HARD THRESHOLDS:
- Rule 1: If errors frequently obscure meaning or word count is very low (< 80 words), MAX BAND is 2.
- Rule 2: If local metrics show very few errors, complex structures are present, and the format is mostly met, you MUST award a 5 or 6.

Grading Protocol:
1. Analyze the Format: Identify if the student has met the specific conventions for the selected genre.
2. Incorporate Local Heuristics:
   We have already run a local rule-based analysis on this essay. 
   ${metricsString}
   Identified Errors:
   ${findingsList}
   Do not hallucinate errors. Use the provided list of errors to judge the accuracy.
3. Score out of 6 (Holistic Bands):
   Band 6: Sophisticated, varied vocabulary; seamless cohesion; strong voice; few to no errors. (Award this if metrics show very few errors and high word count).
   Band 5: Consistent communication; wide vocabulary; well-organized; minor slips.
   Band 4: Clear communication; some complex structures; generally accurate but may lack flair.
   Band 3: Understandable but relies on simple structures; noticeable errors that do not impede meaning.
   Band 2: Basic vocabulary; frequent errors that sometimes impede meaning; limited development.
   Band 1: Highly flawed; severe and frequent errors; minimal communication; very short.${taskSection}

Output Requirements:
You must return your analysis strictly in JSON format. Do not include any conversational text. Use this exact schema:
{
  "step_by_step_reasoning": "Before grading, briefly analyze the grammar, vocabulary, and cohesion based on the heuristics and the text. Decide if it leans towards the extreme ends (1/2 or 5/6).",
  "band": number,
  "justification": "A 2-sentence summary of why this grade was given, explicitly referencing the band descriptors.",
  "positives": ["Point 1", "Point 2"],
  "improvements": ["Specific area 1", "Specific area 2"],
  "marker_check": { ${markerKeys} }${contentSchema}
}`;
}

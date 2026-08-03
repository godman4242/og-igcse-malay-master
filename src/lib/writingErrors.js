// Rule-based English writing error detector for IGCSE students.
// Each rule returns findings of the shape:
//   { id, type, severity, start, end, excerpt, message, suggestion }
//
// severity: 'high'   = clear error that costs marks (grammar, spelling)
//           'medium' = likely error / strong stylistic issue
//           'low'    = stylistic nudge (cliche, weak word, register)
//
// All offsets are character positions into the original text.
// Rules are conservative: prefer false negatives over false positives,
// because wrong corrections actively damage a learner's confidence.

const HIGH = 'high'
const MED  = 'medium'
const LOW  = 'low'

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

function pushAll(list, more) { for (const f of more) list.push(f) }

function makeFinding({ id, type, severity, start, end, text, message, suggestion }) {
  return {
    id,
    type,
    severity,
    start,
    end,
    excerpt: text.slice(start, end),
    message,
    suggestion: suggestion ?? null,
  }
}

// Sentence span splitter — returns [{start, end, text}, ...]
function splitSentenceSpans(text) {
  const out = []
  const re = /[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g
  let m
  while ((m = re.exec(text)) !== null) {
    const start = m.index
    const end = start + m[0].length
    const t = m[0]
    if (t.trim().length === 0) continue
    out.push({ start, end, text: t })
  }
  return out
}

// Word-iterator within a span — yields {start, end, word, lower}
function* iterWords(text, offset = 0) {
  const re = /[A-Za-z][A-Za-z'']*/g
  let m
  while ((m = re.exec(text)) !== null) {
    yield { start: offset + m.index, end: offset + m.index + m[0].length, word: m[0], lower: m[0].toLowerCase() }
  }
}

// Stems written with a vowel LETTER but pronounced with an initial /juː/ (or
// /jʊə/) — a CONSONANT sound, so they take "a": "a university", "a euro".
//
// These are deliberately specific rather than short. A bare `uni` also matches
// the NEGATIVE PREFIX un- + an i-stem ("an unimportant point", "an uninvited
// guest", "an unidentified object"), which made the mirror rule
// `an-before-consonant` fire on correct English and propose "a unimportant".
// Same trap for `one`, which also matches `onerous`. So: never add a stem here
// that un-/on- could shadow — extend the list with the next letter instead.
const YU_STEMS = /^(?:eu|ewe|ubiquit|ukulel|ukrain|unani|unic|unif|unil|unio|uniq|unis|unit|univ|uran|ure|urin|urolog|usab|usag|use|usu|usur|uten|uter|util|utop|uvul)/

const STARTS_VOWEL_SOUND = (word) => {
  // Heuristic for "a/an": treat words starting with a vowel letter as a vowel
  // sound, minus the /juː/ and silent-h exceptions.
  const w = word.toLowerCase()
  if (!w) return false
  // Words beginning with silent h
  if (/^(hour|honest|honou?r|heir)/.test(w)) return true
  // "one"/"once" are /wʌn/ — a consonant sound. "onerous"/"oneness" are not
  // "one" + suffix and keep their /ɒ/ vowel, so they must NOT be caught here.
  if (/^once/.test(w) || /^one(?!rous|ness)/.test(w)) return false
  // Words beginning with u/eu that sound like "you" — consonant sound
  if (YU_STEMS.test(w)) return false
  // Words starting with the letter sound (acronyms) — handled separately
  if (/^[aeiou]/.test(w)) return true
  return false
}

// Position is "inside a quoted string" — we soften certain rules in dialogue.
function isInsideQuotes(text, pos) {
  let inside = false
  for (let i = 0; i < pos; i++) {
    const ch = text[i]
    if (ch === '"' || ch === '“' || ch === '”') inside = !inside
  }
  return inside
}

// ────────────────────────────────────────────────────────────────────
// Confusable word pairs — context-checked patterns
// ────────────────────────────────────────────────────────────────────

// Each entry: pattern that matches a likely-wrong usage.
// Be careful — only trigger on patterns that are wrong with high confidence.
const CONFUSABLES = [
  // its / it's
  { id: 'its-possessive-error', pattern: /\bit's\s+(?:own|color|colour|size|shape|name|tail|fur|edge|cover|side|surface|appearance|design|effect|effects|significance|importance|value|impact|impacts|wings|legs|teeth|eyes|head|body|center|centre)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"it\'s" means "it is/has". Use "its" for the possessive form.',
    fix: (m) => m.replace(/it's/i, 'its') },
  { id: 'its-isnt-error', pattern: /\bits\s+(?:a|an|the|been|going|raining|cold|hot|important|clear|obvious|true|amazing|incredible|wonderful|terrible|easy|hard|difficult)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"its" is possessive. Use "it\'s" for "it is" / "it has".',
    fix: (m) => m.replace(/its/i, "it's") },

  // your / you're
  { id: 'youre-possessive-error', pattern: /\byou're\s+(?:own|family|friend|friends|home|house|work|job|life|car|book|books|teacher|teachers|parents|mother|father|sister|brother)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"you\'re" means "you are". Use "your" for the possessive.',
    fix: (m) => m.replace(/you're/i, 'your') },
  // NOTE: "right|wrong" deliberately excluded — "on your right" / "your right to…"
  // are valid possessives, and flagging them is far costlier than missing the rare
  // "your right" → "you're right" typo (adversarial review #5).
  { id: 'your-areerror', pattern: /\byour\s+(?:going|coming|being|getting|making|doing|the\s+(?:best|worst|one)|a\s+\w+er\b|so\s+\w+|absolutely|probably|definitely|welcome\b)/gi,
    type: 'confusable', severity: HIGH,
    message: '"your" is possessive. Use "you\'re" for "you are".',
    fix: (m) => m.replace(/your/i, "you're") },

  // their / there / they're
  { id: 'there-possessive-error', pattern: /\bthere\s+(?:own|home|house|family|friend|friends|parents|mother|father|car|book|books|teacher|opinion|opinions|view|views|idea|ideas|hands|eyes|hearts|lives|feelings)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"there" is a place. Use "their" for possession.',
    fix: (m) => m.replace(/there/i, 'their') },
  { id: 'their-place-error', pattern: /\bthere's\s+no\s+\w+|\bthere\s+(?:is|are|was|were)\b(?!\s+(?:own|family))/gi,
    type: null, severity: null }, // disabled — high false positive risk
  { id: 'theyre-possessive-error', pattern: /\bthey're\s+(?:own|home|house|family|car|book|teacher|parents|opinion|view|idea)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"they\'re" means "they are". Use "their" for possession.',
    fix: (m) => m.replace(/they're/i, 'their') },

  // then / than
  { id: 'then-comparative-error', pattern: /\b(?:more|less|better|worse|bigger|smaller|larger|cheaper|stronger|weaker|faster|slower|older|younger|sooner|later|harder|easier|higher|lower)\s+then\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"then" is about time. Use "than" for comparisons.',
    fix: (m) => m.replace(/\bthen\b/i, 'than') },
  { id: 'than-time-error', pattern: /\bback\s+than\b|\beven\s+than\b|\band\s+than\s+(?:I|we|he|she|they|you|it)\b/gi,
    type: 'confusable', severity: MED,
    message: '"than" is for comparisons. Did you mean "then" (time/sequence)?',
    fix: (m) => m.replace(/\bthan\b/i, 'then') },

  // affect / effect
  { id: 'effect-verb-error', pattern: /\bwill\s+effect\b|\bdoesn't?\s+effect\b|\bcan\s+effect\b|\bmight\s+effect\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"effect" is usually a noun. Use "affect" as a verb (to influence).',
    fix: (m) => m.replace(/effect/i, 'affect') },
  { id: 'affect-noun-error', pattern: /\bthe\s+affect\s+of\b|\ban\s+affect\s+on\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"affect" is a verb. Use "effect" as the noun (a result/influence).',
    fix: (m) => m.replace(/affect/i, 'effect') },

  // lose / loose
  { id: 'loose-verb-error', pattern: /\b(?:will|might|could|would|may|can|don't|doesn't|didn't|to)\s+loose\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"loose" means not tight. Use "lose" (rhymes with "choose") for not winning/misplacing.',
    fix: (m) => m.replace(/loose/i, 'lose') },

  // accept / except
  { id: 'except-verb-error', pattern: /\bexcept\s+(?:my|your|his|her|their|our|the)\s+(?:offer|invitation|apology|gift|advice|challenge|responsibility|fact)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"except" means "excluding". Use "accept" for receiving/agreeing.',
    fix: (m) => m.replace(/except/i, 'accept') },
  { id: 'accept-exclude-error', pattern: /\baccept\s+for\s+(?:that|the|this|when|when\s+I)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"accept" means receive. Use "except" for "excluding".',
    fix: (m) => m.replace(/accept/i, 'except') },

  // advice / advise
  { id: 'advise-noun-error', pattern: /\b(?:my|your|his|her|their|our|some|any|good|bad|sound|wise|free|expert)\s+advise\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"advise" is a verb. Use "advice" as the noun.',
    fix: (m) => m.replace(/advise/i, 'advice') },
  { id: 'advice-verb-error', pattern: /\b(?:to|would|will|can|should|please|kindly)\s+advice\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"advice" is the noun. Use "advise" for the verb (to give advice).',
    fix: (m) => m.replace(/advice/i, 'advise') },

  // peek / peak / pique
  { id: 'peak-look-error', pattern: /\b(?:take\s+a|sneak\s+a|have\s+a)\s+peak\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"peak" is a summit. Use "peek" for a quick look.',
    fix: (m) => m.replace(/peak/i, 'peek') },

  // passed / past
  { id: 'past-verb-error', pattern: /\b(?:I|we|you|he|she|they)\s+past\s+(?:the|by|him|her|them|me|us|it)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"past" is a noun/preposition. Use "passed" as the past-tense verb.',
    fix: (m) => m.replace(/past/i, 'passed') },

  // whose / who's
  { id: 'whos-possessive-error', pattern: /\bwho's\s+(?:car|house|book|idea|fault|turn|opinion|family|friend|name)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"who\'s" means "who is/has". Use "whose" for possession.',
    fix: (m) => m.replace(/who's/i, 'whose') },

  // less / fewer
  { id: 'less-countable-error', pattern: /\bless\s+(?:people|students|cars|things|items|ideas|books|friends|hours|minutes|days|months|years|opportunities|options|choices|reasons|differences)\b/gi,
    type: 'confusable', severity: MED,
    message: 'Use "fewer" for countable items (fewer students), "less" for uncountable (less time).',
    fix: (m) => m.replace(/less/i, 'fewer') },

  // amount / number
  { id: 'amount-countable-error', pattern: /\bamount\s+of\s+(?:people|students|cars|things|items|ideas|books|friends|hours|minutes|days|months|years)\b/gi,
    type: 'confusable', severity: MED,
    message: 'Use "number of" for countable items, "amount of" for uncountable.',
    fix: (m) => m.replace(/amount/i, 'number') },

  // principal / principle
  { id: 'principal-rule-error', pattern: /\b(?:moral|guiding|fundamental|basic|core|key)\s+principal\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"principal" = head of school / main. "principle" = a rule or belief.',
    fix: (m) => m.replace(/principal/i, 'principle') },

  // complement / compliment
  { id: 'compliment-pair-error', pattern: /\bcompliment\s+(?:each\s+other|the\s+(?:dish|outfit|colour|color|design|style|flavou?r))\b/gi,
    type: 'confusable', severity: MED,
    message: '"compliment" = praise. "complement" = goes well with / completes.',
    fix: (m) => m.replace(/compliment/i, 'complement') },

  // stationary / stationery
  { id: 'stationary-supplies-error', pattern: /\bstationary\s+(?:shop|store|supplies|items|set)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"stationary" = not moving. "stationery" = paper, pens, etc.',
    fix: (m) => m.replace(/stationary/i, 'stationery') },

  // bought / brought
  { id: 'brought-purchase-error', pattern: /\bbrought\s+(?:it|them|some)\s+(?:from\s+the\s+(?:shop|store|market|mall))\b/gi,
    type: 'confusable', severity: MED,
    message: '"brought" = past tense of bring. Did you mean "bought" (past tense of buy)?',
    fix: (m) => m.replace(/brought/i, 'bought') },

  // weather / whether
  { id: 'weather-conditional-error', pattern: /\bweather\s+(?:or\s+not|to|he|she|they|we|you|I)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"weather" is rain/sun/etc. Use "whether" for conditionals (whether or not).',
    fix: (m) => m.replace(/weather/i, 'whether') },

  // would have / would of
  { id: 'would-of-error', pattern: /\b(?:would|could|should|might|must)\s+of\b/gi,
    type: 'grammar', severity: HIGH,
    message: '"would of" is wrong — it sounds like "would\'ve". Use "would have".',
    fix: (m) => m.replace(/of\b/i, 'have') },

  // their / there / they're — broader patterns
  { id: 'their-be-verb', pattern: /\btheir\s+(?:is|are|was|were)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"their" is possessive. Use "there" with is/are/was/were ("there is", "there are").',
    fix: (m) => m.replace(/their/i, 'there') },
  // "their + adverb/verb" (e.g. "their always") — likely should be "they're"
  { id: 'their-they-are', pattern: /\btheir\s+(?:always|never|often|usually|sometimes|rarely|seldom|currently|now|just|already|still|all|both|going|coming|trying|doing|making|saying|thinking|feeling|getting|moving|working|learning|growing|becoming|likely|probably|definitely|certainly|surely|happy|sad|angry|excited|tired|hungry|busy|ready|aware|sure|interested|excited|worried|so|too|very|really|quite)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"their" is possessive. Use "they\'re" for "they are".',
    fix: (m) => m.replace(/their/i, "they're") },
  { id: 'there-possessive-2', pattern: /\bthere\s+(?:opinion|view|feelings|behaviour|behavior|grades|results|interests|values|culture|future|hopes|fears|dreams|education|attention|thoughts|argument|response|action|actions|decision|decisions|problem|problems|phones?|laptops?|computers?|cars?|bikes?|bags?|things?|stuff|families|kids|children|parents|friends|teachers|colleagues)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"there" is a place. Use "their" for possession.',
    fix: (m) => m.replace(/there/i, 'their') },

  // ── effect/affect verb forms beyond the existing rule ──
  { id: 'effecting-verb', pattern: /\b(?:is|are|was|were|been|keep|keeps|kept|by|of|stop|start)\s+effecting\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"effecting" usually means "bringing about". For "having an effect on", use "affecting".',
    fix: (m) => m.replace(/effecting/i, 'affecting') },
  { id: 'effects-verb', pattern: /\b(?:it|they|that|this|these|those)\s+effects\s+(?:my|our|their|his|her|the|a|an|me|us|him|them|people|society)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"effects" as a verb is rare. The verb is usually "affects".',
    fix: (m) => m.replace(/effects/i, 'affects') },

  // ── except / accept beyond existing ──
  { id: 'except-this', pattern: /\bexcept\s+(?:this|that|it|the\s+(?:fact|truth|reality|outcome|result))\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"except" means "excluding". For "agree to / receive" use "accept".',
    fix: (m) => m.replace(/except/i, 'accept') },
  { id: 'had-to-except', pattern: /\b(?:had|have|has)\s+to\s+except\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"except" is "excluding". To agree/receive use "accept".',
    fix: (m) => m.replace(/except/i, 'accept') },

  // Affect on / The X effect — more cases
  { id: 'affect-noun-2', pattern: /\b(?:the|an?|its|this|that|some|any|many|positive|negative|main|biggest|greatest)\s+affect\s+on\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"affect" is a verb. Use "effect" as the noun (a result/influence).',
    fix: (m) => m.replace(/affect/i, 'effect') },

  // lose / loose — broader: "is/are/was/were/keeps/keep/start/started + loosing"
  { id: 'loose-gerund', pattern: /\b(?:is|are|am|was|were|been|keep|keeps|kept|start|starts|started|stop|stops|stopped|risk|risks|risked|avoid|avoids|avoided|fear|fears|feared|hate|hates|hated)\s+loosing\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"loose" means not tight. Use "losing" (rhymes with "choosing").',
    fix: (m) => m.replace(/loosing/i, 'losing') },
  { id: 'loose-of', pattern: /\bloose\s+(?:weight|money|the\s+game|the\s+match|interest|focus|track|hope|control|sight)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"loose" means not tight. Use "lose" (rhymes with "choose").',
    fix: (m) => m.replace(/loose/i, 'lose') },

  // its' — never correct
  { id: 'its-apostrophe-end', pattern: /\bits'/gi,
    type: 'grammar', severity: HIGH,
    message: '"its\'" is never correct. Use "its" (possessive) or "it\'s" (it is).',
    fix: () => 'its' },

  // todays / tomorrows / yesterdays — missing possessive apostrophe
  { id: 'time-possessive', pattern: /\b(today|tomorrow|yesterday|tonight|tomorrow's|today's|yesterday's)s\s+(?:society|world|youth|generation|teenagers|teenager|students|news|paper|newspaper|edition|episode|game|match|meeting|lesson|class|homework|paper|topic|issue|technology|economy)\b/gi,
    type: 'grammar', severity: HIGH,
    message: 'Missing possessive apostrophe. "Today\'s society", not "todays society".',
    fix: (m) => m.replace(/(today|tomorrow|yesterday|tonight)s\s/i, "$1's ") },

  // ── Pronoun case errors ──
  // "between you and I" → "between you and me"
  { id: 'between-you-and-i', pattern: /\bbetween\s+you\s+and\s+I\b/gi,
    type: 'grammar', severity: HIGH,
    message: 'After a preposition, use "me" not "I". → "between you and me".',
    fix: () => 'between you and me' },
  // "with X and I" / "for X and I" / "to X and I" / "give it to X and I" → "...and me"
  { id: 'prep-and-i', pattern: /\b(?:with|for|to|from|by|of|about)\s+\w+\s+and\s+I\b/gi,
    type: 'grammar', severity: HIGH,
    message: 'After a preposition, use "me" instead of "I".',
    fix: (m) => m.replace(/I\b/, 'me') },
  // "X and me went/are/can/will/think..." → subject position needs "I"
  { id: 'me-and-x-subject', pattern: /\b(?:Me|me)\s+and\s+(?:my\s+\w+|\w+)\s+(?:went|are|will|can|could|would|should|might|may|do|did|have|had|think|thought|know|knew|saw|see|go|came|come|left|stayed|tried|hope|love|like|hate|need|want|wonder|wondered|realised|realized|noticed|decided|started|stopped|finished)\b/g,
    type: 'grammar', severity: HIGH,
    message: 'In subject position, use "X and I", not "Me and X" / "X and me".',
    fix: null },
  // "myself" used as subject — "John and myself went" → "John and I went"
  { id: 'myself-as-subject', pattern: /\b(?:and|&)\s+myself\s+(?:went|are|will|can|could|would|should|do|did|have|had|think|know|saw|see|go|came|left|tried|need|want)\b/gi,
    type: 'grammar', severity: MED,
    message: 'Use "I" not "myself" as a subject. "Myself" reflects back to an earlier "I".',
    fix: (m) => m.replace(/myself/i, 'I') },

  // ── lead / led (past tense) ──
  { id: 'lead-past', pattern: /\b(?:I|we|you|he|she|they|who)\s+lead\s+(?:them|us|me|him|her|the\s+\w+|to\s+\w+)/gi,
    type: 'confusable', severity: MED,
    message: 'Past tense of "lead" (to guide) is "led". Use "led" if this is past.',
    fix: (m) => m.replace(/\blead\b/i, 'led') },
  { id: 'leaded', pattern: /\bleaded\b/gi,
    type: 'grammar', severity: HIGH,
    message: '"leaded" is not the past of "lead" (to guide). Use "led".',
    fix: () => 'led' },

  // ── Apostrophe-on-plural (greengrocer's apostrophe) ──
  { id: 'plural-apostrophe-decade', pattern: /\b(?:19|20)\d0's\b/g,
    type: 'punctuation', severity: HIGH,
    message: 'Decades take no apostrophe. "1990s", not "1990\'s".',
    fix: (m) => m.replace(/'s/, 's') },
  { id: 'plural-apostrophe-noun', pattern: /\b(?:CD|DVD|MP3|TV|GP|MP|UK|US|USA|MA|PhD)'s\b/g,
    type: 'punctuation', severity: MED,
    message: 'For plural acronyms, no apostrophe is needed. "CDs", "DVDs".',
    fix: (m) => m.replace(/'s/, 's') },

  // ── Whom misuse / who misuse ──
  // "whom is" / "whom are" — whom is the object form, not subject
  { id: 'whom-subject', pattern: /\bwhom\s+(?:is|are|was|were|has|have|will|would|can|could|should|might|may|do|does|did)\b/gi,
    type: 'grammar', severity: MED,
    message: '"Whom" is the object form. As a subject use "who".',
    fix: (m) => m.replace(/whom/i, 'who') },

  // ── Try and / try to ──
  { id: 'try-and', pattern: /\btry\s+and\s+(?:do|find|see|get|make|help|understand|learn|work|finish|start|stop|win|reach|achieve)\b/gi,
    type: 'style', severity: LOW,
    message: 'Formal English prefers "try to" over "try and".',
    fix: (m) => m.replace(/try\s+and/i, 'try to') },

  // ── If I was / If I were (subjunctive) — formal contexts ──
  { id: 'were-subjunctive', pattern: /\bif\s+I\s+was\b/gi,
    type: 'grammar', severity: MED,
    message: 'For hypotheticals, formal English uses "if I were" (subjunctive).',
    fix: (m) => m.replace(/was/i, 'were') },
  { id: 'were-subjunctive-he', pattern: /\bif\s+(?:he|she|it)\s+was\b/gi,
    type: 'grammar', severity: LOW,
    message: 'In formal hypotheticals, use "were" — "if she were here".',
    fix: (m) => m.replace(/was/i, 'were') },

  // ── In comparison / by contrast / on contrary ──
  { id: 'on-contrary', pattern: /\bon\s+contrary\b/gi,
    type: 'grammar', severity: HIGH,
    message: 'Standard form is "on the contrary".',
    fix: () => 'on the contrary' },
  { id: 'in-other-words', pattern: /\bin\s+other\s+word\b/gi,
    type: 'grammar', severity: HIGH,
    message: 'Standard form is "in other words" (plural).',
    fix: () => 'in other words' },
]

// Apostrophe-missing contractions — extremely common student error.
// Pattern: a bare "wont/cant/dont/didnt/etc." standing as a verb. We
// only flag the bare form when it appears in a verb position (after
// a pronoun or noun, before a verb / adjective). False positives are
// rare because none of these are valid English words.
const MISSING_CONTRACTIONS = new Map([
  ['dont',     "don't"],
  ['doesnt',   "doesn't"],
  ['didnt',    "didn't"],
  ['wont',     "won't"],
  ['cant',     "can't"],
  ['couldnt',  "couldn't"],
  ['shouldnt', "shouldn't"],
  ['wouldnt',  "wouldn't"],
  ['isnt',     "isn't"],
  ['arent',    "aren't"],
  ['wasnt',    "wasn't"],
  ['werent',   "weren't"],
  ['hasnt',    "hasn't"],
  ['havent',   "haven't"],
  ['hadnt',    "hadn't"],
  ['mustnt',   "mustn't"],
  ['shant',    "shan't"],
  ['lets',     "let's"],   // borderline — "lets" is also 3rd-person verb;
                           // we only flag in specific positions below.
])

function detectMissingContractions(text) {
  const out = []
  // Standalone bare contractions (excluding "lets" which we handle separately).
  for (const [bad, good] of MISSING_CONTRACTIONS) {
    if (bad === 'lets') continue
    const re = new RegExp('\\b' + bad + '\\b', 'gi')
    let m
    while ((m = re.exec(text)) !== null) {
      out.push(makeFinding({
        id: 'contraction-missing',
        type: 'spelling',
        severity: HIGH,
        start: m.index, end: m.index + m[0].length, text,
        message: `Missing apostrophe in "${m[0]}".`,
        suggestion: /^[A-Z]/.test(m[0]) ? good.charAt(0).toUpperCase() + good.slice(1) : good,
      }))
    }
  }
  // "lets" used as imperative ("lets go", "lets see") — only flag in clearly
  // imperative positions where "let us" makes sense.
  const reLets = /\blets\s+(?:go|see|try|do|talk|begin|start|stop|think|consider|imagine|hope|pray|wait|move|continue|focus|examine|explore|discuss|review|read|write|finish)\b/gi
  let m
  while ((m = reLets.exec(text)) !== null) {
    out.push(makeFinding({
      id: 'lets-imperative',
      type: 'spelling',
      severity: HIGH,
      start: m.index, end: m.index + 4, text,
      message: '"lets" needs an apostrophe when it means "let us". Use "let\'s".',
      suggestion: /^L/.test(text.slice(m.index, m.index + 1)) ? "Let's" : "let's",
    }))
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Curated common misspellings (NOT a full spellchecker — we only flag
// words that are commonly mistyped to a non-word. Adding rare
// tech terms or names here is forbidden.)
// ────────────────────────────────────────────────────────────────────

const MISSPELLINGS = new Map([
  ['accomodate', 'accommodate'], ['acheive', 'achieve'], ['acheived', 'achieved'],
  ['accross', 'across'], ['agressive', 'aggressive'], ['alot', 'a lot'],
  ['alright', 'all right'], ['arguement', 'argument'], ['athiest', 'atheist'],
  ['basicly', 'basically'], ['becuase', 'because'], ['becasue', 'because'],
  ['beleive', 'believe'], ['beleived', 'believed'], ['begining', 'beginning'],
  ['beleif', 'belief'], ['benifit', 'benefit'], ['benifits', 'benefits'],
  ['buisness', 'business'], ['calender', 'calendar'], ['catagory', 'category'],
  ['cemetary', 'cemetery'], ['changable', 'changeable'], ['cheif', 'chief'],
  ['collegue', 'colleague'], ['colum', 'column'], ['comming', 'coming'],
  ['commited', 'committed'], ['commitee', 'committee'], ['completly', 'completely'],
  ['concious', 'conscious'], ['concience', 'conscience'], ['definately', 'definitely'],
  ['definatly', 'definitely'], ['diffrent', 'different'], ['dilemna', 'dilemma'],
  ['dissapear', 'disappear'], ['dissapoint', 'disappoint'], ['ecstacy', 'ecstasy'],
  ['embarass', 'embarrass'], ['embarrasing', 'embarrassing'], ['enviroment', 'environment'],
  ['existance', 'existence'], ['experiance', 'experience'], ['experianced', 'experienced'],
  ['familar', 'familiar'], ['finaly', 'finally'], ['florescent', 'fluorescent'],
  ['foriegn', 'foreign'], ['freind', 'friend'], ['freinds', 'friends'],
  ['fullfil', 'fulfil'], ['gaurd', 'guard'], ['goverment', 'government'],
  ['grammer', 'grammar'], ['greatful', 'grateful'], ['gaurantee', 'guarantee'],
  ['happend', 'happened'], ['harras', 'harass'], ['harrass', 'harass'],
  ['heigth', 'height'], ['hieght', 'height'], ['humerous', 'humorous'],
  ['iland', 'island'], ['imediate', 'immediate'], ['immediatly', 'immediately'],
  ['independant', 'independent'], ['independance', 'independence'],
  ['intresting', 'interesting'], ['knowlege', 'knowledge'], ['leasure', 'leisure'],
  ['liason', 'liaison'], ['libary', 'library'], ['liesure', 'leisure'],
  ['lonelyness', 'loneliness'], ['mispell', 'misspell'], ['mispelled', 'misspelled'],
  ['millenium', 'millennium'], ['miniscule', 'minuscule'], ['mischievious', 'mischievous'],
  ['neccessary', 'necessary'], ['neccesary', 'necessary'], ['negociate', 'negotiate'],
  ['niether', 'neither'], ['noticable', 'noticeable'], ['occassion', 'occasion'],
  ['occassionally', 'occasionally'], ['occured', 'occurred'], ['occuring', 'occurring'],
  ['occurence', 'occurrence'], ['ommit', 'omit'], ['oppurtunity', 'opportunity'],
  ['paralell', 'parallel'], ['pasttime', 'pastime'], ['perserverance', 'perseverance'],
  ['persistant', 'persistent'], ['posession', 'possession'], ['posessions', 'possessions'],
  ['posses', 'possess'], ['potatos', 'potatoes'], ['preceeding', 'preceding'],
  ['prefered', 'preferred'], ['priviledge', 'privilege'], ['probaly', 'probably'],
  ['probly', 'probably'], ['prominant', 'prominent'], ['promiss', 'promise'],
  ['pronounciation', 'pronunciation'], ['publically', 'publicly'], ['quaters', 'quarters'],
  ['quizes', 'quizzes'], ['recieve', 'receive'], ['recieved', 'received'],
  ['reccomend', 'recommend'], ['recomend', 'recommend'], ['refered', 'referred'],
  ['relevent', 'relevant'], ['religous', 'religious'], ['repitition', 'repetition'],
  ['restraunt', 'restaurant'], ['rythm', 'rhythm'], ['rhythem', 'rhythm'],
  ['secratary', 'secretary'], ['seperate', 'separate'], ['sieze', 'seize'],
  ['similiar', 'similar'], ['sincerly', 'sincerely'], ['speach', 'speech'],
  ['succesful', 'successful'], ['successfull', 'successful'], ['supercede', 'supersede'],
  ['suprise', 'surprise'], ['suprised', 'surprised'], ['tatoo', 'tattoo'],
  ['teh', 'the'], ['threshhold', 'threshold'], ['tommorow', 'tomorrow'],
  ['tommorrow', 'tomorrow'], ['truely', 'truly'], ['twelth', 'twelfth'],
  ['tyrany', 'tyranny'], ['underate', 'underrate'], ['untill', 'until'],
  ['useable', 'usable'], ['vaccum', 'vacuum'], ['vehical', 'vehicle'],
  ['vegitable', 'vegetable'], ['villian', 'villain'], ['wether', 'whether'],
  ['wierd', 'weird'], ['withold', 'withhold'], ['writting', 'writing'],
  ['yatch', 'yacht'], ['yeild', 'yield'],
  // Frequent IGCSE student typos
  ['guidence', 'guidance'], ['benificial', 'beneficial'], ['disipline', 'discipline'],
  ['oppertunity', 'opportunity'], ['responsibilty', 'responsibility'],
  ['responsiblity', 'responsibility'], ['enviornment', 'environment'],
  ['exersice', 'exercise'], ['excercise', 'exercise'], ['concious', 'conscious'],
  ['descision', 'decision'], ['acommodate', 'accommodate'], ['advertisment', 'advertisement'],
  ['agressively', 'aggressively'], ['tendancy', 'tendency'], ['arguements', 'arguments'],
  ['atheletes', 'athletes'], ['athelete', 'athlete'], ['attendence', 'attendance'],
  ['carrer', 'career'], ['carefull', 'careful'], ['chocholate', 'chocolate'],
  ['comparision', 'comparison'], ['curiousity', 'curiosity'], ['disasterous', 'disastrous'],
  ['eigth', 'eighth'], ['embarassed', 'embarrassed'], ['equiped', 'equipped'],
  ['guage', 'gauge'], ['hieroglyphics', 'hieroglyphics'], ['hipocrite', 'hypocrite'],
  ['ignorence', 'ignorance'], ['imediately', 'immediately'], ['incidently', 'incidentally'],
  ['knowledgable', 'knowledgeable'], ['liesurely', 'leisurely'], ['lisense', 'license'],
  ['mantain', 'maintain'], ['memmory', 'memory'], ['mischievious', 'mischievous'],
  ['oftenly', 'often'], ['parralel', 'parallel'], ['percieve', 'perceive'],
  ['perminant', 'permanent'], ['perseverence', 'perseverance'], ['priviledged', 'privileged'],
  ['recurr', 'recur'], ['rediculous', 'ridiculous'], ['refering', 'referring'],
  ['saftey', 'safety'], ['seperation', 'separation'], ['sergent', 'sergeant'],
  ['shedule', 'schedule'], ['simultanously', 'simultaneously'], ['speciall', 'special'],
  ['strenght', 'strength'], ['successfuly', 'successfully'], ['thier', 'their'],
  ['untill', 'until'], ['vaccuum', 'vacuum'], ['wellfare', 'welfare'],
  // More high-frequency student typos
  // NOTE: "everyday" is NOT here — it is a valid adjective ("everyday life").
  // Only "everytime" (never a word) stays (adversarial review #3).
  ['alright', 'all right'], ['everytime', 'every time'],
  ['infront', 'in front'], ['eachother', 'each other'], ['atleast', 'at least'],
  ['aswell', 'as well'], ['nowadays', 'nowadays'], ['inspite', 'in spite'],
  ['becuase', 'because'], ['abour', 'about'], ['becausa', 'because'],
  ['bilieve', 'believe'], ['theough', 'through'], ['thrugh', 'through'],
  ['thier', 'their'], ['allright', 'all right'], ['alot', 'a lot'],
  ['cancelling', 'cancelling'], ['concious', 'conscious'], ['suposed', 'supposed'],
  ['supposingly', 'supposedly'], ['orientated', 'oriented'], ['greatfull', 'grateful'],
  ['responsable', 'responsible'], ['independance', 'independence'],
  ['comparitive', 'comparative'], ['acquantance', 'acquaintance'],
  ['accomodation', 'accommodation'], ['accross', 'across'],
  ['posession', 'possession'], ['proffesional', 'professional'],
  ['proffesor', 'professor'], ['embarras', 'embarrass'],
  ['recieved', 'received'], ['untill', 'until'], ['runing', 'running'],
  ['stoped', 'stopped'], ['planed', 'planned'], ['hoped', 'hoped'],
  ['preffered', 'preferred'], ['offen', 'often'],
  ['quitely', 'quietly'], ['niether', 'neither'], ['nieghbour', 'neighbour'],
  ['niegbour', 'neighbour'], ['suceed', 'succeed'], ['suceeded', 'succeeded'],
  ['succeded', 'succeeded'], ['necesary', 'necessary'], ['proffessional', 'professional'],
  ['absense', 'absence'], ['accidently', 'accidentally'],
  ['acquired', 'acquired'], ['acquit', 'acquit'], ['amatuer', 'amateur'],
  ['apparant', 'apparent'], ['aquire', 'acquire'], ['arctic', 'arctic'],
  ['avaliable', 'available'], ['ballance', 'balance'], ['begginning', 'beginning'],
  ['cemetary', 'cemetery'], ['certian', 'certain'], ['conected', 'connected'],
  ['copywright', 'copyright'], ['curiousity', 'curiosity'], ['cusion', 'cushion'],
  ['cuting', 'cutting'], ['decieve', 'deceive'], ['defendant', 'defendant'],
  ['definate', 'definite'], ['definately', 'definitely'], ['discription', 'description'],
  ['endevour', 'endeavour'], ['equivelant', 'equivalent'], ['exilerate', 'exhilarate'],
  ['existance', 'existence'], ['fasinate', 'fascinate'], ['februery', 'February'],
  ['firey', 'fiery'], ['foriegner', 'foreigner'], ['glamourous', 'glamorous'],
  ['greivance', 'grievance'], ['hierachy', 'hierarchy'], ['hipocrisy', 'hypocrisy'],
  ['hygenic', 'hygienic'], ['idiosyncracy', 'idiosyncrasy'],
  ['immitate', 'imitate'], ['inate', 'innate'], ['indispensible', 'indispensable'],
  ['inflamation', 'inflammation'], ['inocent', 'innocent'], ['innevitable', 'inevitable'],
  ['intelectual', 'intellectual'], ['intresting', 'interesting'],
  ['jelous', 'jealous'], ['judgemental', 'judgemental'],
  ['jugement', 'judgement'], ['lazyness', 'laziness'],
  ['liesure', 'leisure'], ['liason', 'liaison'], ['litterature', 'literature'],
  ['maintainance', 'maintenance'], ['marshmellow', 'marshmallow'],
  ['mathmatics', 'mathematics'], ['millenium', 'millennium'],
  ['mispell', 'misspell'], ['monestary', 'monastery'],
  ['necesarily', 'necessarily'], ['neccesarily', 'necessarily'],
  ['nieghbor', 'neighbor'], ['noticable', 'noticeable'],
  ['nuisence', 'nuisance'], ['ocassion', 'occasion'],
  ['ommision', 'omission'], ['ommit', 'omit'],
  ['parliment', 'parliament'], ['pasttime', 'pastime'],
  ['payed', 'paid'], ['perseverance', 'perseverance'],
  ['playright', 'playwright'], ['posses', 'possess'],
  ['preceed', 'precede'], ['preceeding', 'preceding'],
  ['priveledge', 'privilege'], ['priviledge', 'privilege'],
  ['publically', 'publicly'], ['questionaire', 'questionnaire'],
  ['readible', 'readable'], ['rediculous', 'ridiculous'],
  ['refered', 'referred'], ['refering', 'referring'],
  ['religous', 'religious'], ['relevent', 'relevant'],
  ['reminescence', 'reminiscence'], ['repitition', 'repetition'],
  ['resistence', 'resistance'], ['restaraunt', 'restaurant'],
  ['rythmn', 'rhythm'], ['sacreligious', 'sacrilegious'],
  ['safty', 'safety'], ['saturday', 'Saturday'],
  ['scissors', 'scissors'], ['secratery', 'secretary'],
  ['sieze', 'seize'], ['similiar', 'similar'],
  ['sissor', 'scissor'], ['sissors', 'scissors'],
  ['speach', 'speech'], ['stationary', 'stationary'],
  ['strenght', 'strength'], ['suceed', 'succeed'],
  ['superceed', 'supersede'], ['supercede', 'supersede'],
  ['suprize', 'surprise'], ['suprise', 'surprise'],
  ['tendancy', 'tendency'], ['threshhold', 'threshold'],
  ['tomatos', 'tomatoes'], ['tomorrows', "tomorrow's"],
  ['truely', 'truly'], ['tuesday', 'Tuesday'],
  ['underate', 'underrate'], ['unforseen', 'unforeseen'],
  ['unfortunatly', 'unfortunately'], ['unnessasary', 'unnecessary'],
  ['vegies', 'veggies'], ['vehicule', 'vehicle'],
  ['versus', 'versus'], ['weild', 'wield'],
  ['wether', 'whether'], ['woudl', 'would'],
  ['writeable', 'writable'], ['yatch', 'yacht'],
  // Common past-tense / participle typos
  ['tryed', 'tried'], ['flyed', 'flew'], ['runned', 'ran'],
  ['catched', 'caught'], ['breaked', 'broke'], ['breaken', 'broken'],
  ['knowed', 'knew'], ['drived', 'drove'], ['slided', 'slid'],
  ['becomed', 'became'], ['holded', 'held'], ['leaved', 'left'],
  ['hided', 'hid'], ['spreaded', 'spread'], ['costed', 'cost'],
  ['hurted', 'hurt'], ['putted', 'put'], ['shutted', 'shut'],
])

function detectMisspellings(text) {
  const out = []
  for (const w of iterWords(text)) {
    const fix = MISSPELLINGS.get(w.lower)
    // `fix !== w.word` guards case-only entries (e.g. saturday→Saturday): the
    // already-correct "Saturday" must NOT be flagged just because it differs
    // from the lowercased lookup key (adversarial review #2).
    if (fix && fix !== w.lower && fix !== w.word) {
      // Preserve leading capitalisation
      const correct = /^[A-Z]/.test(w.word) ? fix.charAt(0).toUpperCase() + fix.slice(1) : fix
      out.push(makeFinding({
        id: 'spell-' + w.lower,
        type: 'spelling',
        severity: HIGH,
        start: w.start, end: w.end, text,
        message: `"${w.word}" is a common misspelling.`,
        suggestion: correct,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Confusable rule executor
// ────────────────────────────────────────────────────────────────────

function detectConfusables(text) {
  const out = []
  for (const rule of CONFUSABLES) {
    if (!rule.type) continue // disabled
    const re = new RegExp(rule.pattern.source, rule.pattern.flags)
    let m
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) { re.lastIndex++; continue }
      const start = m.index
      const end = start + m[0].length
      const fixed = rule.fix ? rule.fix(m[0]) : null
      out.push(makeFinding({
        id: rule.id,
        type: rule.type,
        severity: rule.severity,
        start, end, text,
        message: rule.message,
        suggestion: fixed,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Article (a/an) — vowel-sound heuristic
// ────────────────────────────────────────────────────────────────────

function detectArticleErrors(text) {
  const out = []
  const re = /\b(a|an|A|An)\s+([A-Za-z][A-Za-z'-]*)/g
  let m
  while ((m = re.exec(text)) !== null) {
    const article = m[1]
    const word = m[2]
    // Acronyms/initialisms (MP, NGO, X-ray, F) are read letter-by-letter, so the
    // vowel-LETTER heuristic misjudges them: "an MP" is CORRECT because M is said
    // "em" (a vowel sound). We cannot reliably separate initialisms (an MP) from
    // word-acronyms read as words (a NASA, a SIM), so we skip the article check
    // for all-caps tokens rather than emit a confident-wrong correction — prefer a
    // missed error to a false one (adversarial review #4; conservative bias).
    const isAcronym = /^[A-Z]$/.test(word) || /^[A-Z][A-Z0-9-]/.test(word)
    if (isAcronym) continue
    const isAn = /^an$/i.test(article)
    const needsAn = STARTS_VOWEL_SOUND(word)
    const wordStart = m.index + m[0].lastIndexOf(word)
    if (isAn && !needsAn) {
      out.push(makeFinding({
        id: 'an-before-consonant',
        type: 'grammar',
        severity: HIGH,
        start: m.index, end: m.index + m[0].length, text,
        message: `Use "a" before a consonant sound. "${article} ${word}" → "${article === 'An' ? 'A' : 'a'} ${word}".`,
        suggestion: (article === 'An' ? 'A' : 'a') + ' ' + word,
      }))
    } else if (!isAn && needsAn) {
      out.push(makeFinding({
        id: 'a-before-vowel',
        type: 'grammar',
        severity: HIGH,
        start: m.index, end: m.index + m[0].length, text,
        message: `Use "an" before a vowel sound. "${article} ${word}" → "${article === 'A' ? 'An' : 'an'} ${word}".`,
        suggestion: (article === 'A' ? 'An' : 'an') + ' ' + word,
      }))
    }
    // suppress "wordStart" lint warning
    void wordStart
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Repeated words (the the, of of)
// ────────────────────────────────────────────────────────────────────

const SAFE_REPEATS = new Set(['that', 'had', 'is', 'so', 'no'])

function detectRepeatedWords(text) {
  const out = []
  const re = /\b(\w+)\s+\1\b/gi
  let m
  while ((m = re.exec(text)) !== null) {
    const w = m[1].toLowerCase()
    if (SAFE_REPEATS.has(w)) continue   // "the report that that he wrote" etc — skip
    out.push(makeFinding({
      id: 'repeated-word',
      type: 'grammar',
      severity: HIGH,
      start: m.index, end: m.index + m[0].length, text,
      message: `Word "${m[1]}" appears twice in a row.`,
      suggestion: m[1],
    }))
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Capitalization after sentence-ending punctuation
// ────────────────────────────────────────────────────────────────────

function detectCapitalization(text) {
  const out = []
  // First letter of the essay
  const firstLetter = text.match(/[A-Za-z]/)
  if (firstLetter && /[a-z]/.test(firstLetter[0])) {
    const idx = text.indexOf(firstLetter[0])
    out.push(makeFinding({
      id: 'cap-first',
      type: 'punctuation',
      severity: MED,
      start: idx, end: idx + 1, text,
      message: 'Start the essay with a capital letter.',
      suggestion: firstLetter[0].toUpperCase(),
    }))
  }
  // After period/!/?, expect uppercase
  const re = /[.!?]\s+([a-z])/g
  let m
  while ((m = re.exec(text)) !== null) {
    const letterIdx = m.index + m[0].length - 1
    out.push(makeFinding({
      id: 'cap-sentence',
      type: 'punctuation',
      severity: HIGH,
      start: letterIdx, end: letterIdx + 1, text,
      message: 'Capitalise the first letter of each sentence.',
      suggestion: m[1].toUpperCase(),
    }))
  }
  // Pronoun "i" alone
  const reI = /(^|[^A-Za-z])i([^A-Za-z]|$)/g
  let im
  while ((im = reI.exec(text)) !== null) {
    const idx = im.index + im[1].length
    if (text[idx] === 'i') {
      out.push(makeFinding({
        id: 'cap-i',
        type: 'punctuation',
        severity: HIGH,
        start: idx, end: idx + 1, text,
        message: 'The pronoun "I" must be capitalised.',
        suggestion: 'I',
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Spacing — double spaces, space-before-punct, missing-space-after-punct
// ────────────────────────────────────────────────────────────────────

function detectSpacing(text) {
  const out = []
  // Multiple spaces
  const reMulti = /  +/g
  let m
  while ((m = reMulti.exec(text)) !== null) {
    out.push(makeFinding({
      id: 'spacing-multi',
      type: 'punctuation',
      severity: LOW,
      start: m.index, end: m.index + m[0].length, text,
      message: 'Multiple spaces in a row.',
      suggestion: ' ',
    }))
  }
  // Space before . , ; : ! ?
  const rePre = / +([,.;:!?])/g
  while ((m = rePre.exec(text)) !== null) {
    out.push(makeFinding({
      id: 'spacing-before-punct',
      type: 'punctuation',
      severity: MED,
      start: m.index, end: m.index + m[0].length, text,
      message: `Don't put a space before "${m[1]}".`,
      suggestion: m[1],
    }))
  }
  // Missing space after . , ; : (but not in numbers / abbreviations)
  const rePost = /([.,;:!?])([A-Za-z])/g
  while ((m = rePost.exec(text)) !== null) {
    // Allow common abbreviations
    const before = text.slice(Math.max(0, m.index - 4), m.index + 1).toLowerCase()
    if (/(?:e\.g|i\.e|etc|mr|mrs|dr|jr|st|no)\.$/.test(before)) continue
    if (/^\d/.test(text[m.index - 1] || '')) continue   // numeric like "3,000" or "1.5"
    out.push(makeFinding({
      id: 'spacing-after-punct',
      type: 'punctuation',
      severity: HIGH,
      start: m.index, end: m.index + m[0].length, text,
      message: `Add a space after "${m[1]}".`,
      suggestion: m[1] + ' ' + m[2],
    }))
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Comma splice — independent clause, comma, independent clause
// (without a coordinating conjunction). Heuristic: a "comma + capital
// pronoun/determiner that starts a clause" is suspicious. Only fires
// for the most confident patterns.
// ────────────────────────────────────────────────────────────────────

const COMMA_SPLICE_STARTERS = [
  'I', 'We', 'They', 'He', 'She', 'It', 'You',
  'This', 'That', 'These', 'Those',
  'My', 'Our', 'Their', 'His', 'Her', 'Its', 'Your',
  'There',
]

// Words that signal the segment before a comma is NOT an independent
// clause (so it cannot create a comma splice). Includes transitional
// adverbs, common letter-greeting tokens, and a handful of subordinators.
const COMMA_SPLICE_SKIP_WORDS = new Set([
  // letter / address tokens
  'sir', 'madam', 'sirs', 'dear', 'mr', 'mrs', 'ms', 'dr', 'prof',
  // transitions / sentence adverbs (the comma follows the adverb itself)
  'however', 'furthermore', 'moreover', 'nevertheless', 'consequently',
  'therefore', 'additionally', 'meanwhile', 'similarly', 'likewise',
  'firstly', 'secondly', 'thirdly', 'finally', 'next', 'instead',
  'indeed', 'undoubtedly', 'naturally', 'obviously', 'clearly',
  'fortunately', 'unfortunately', 'incidentally', 'ultimately',
  'subsequently', 'eventually', 'admittedly', 'generally', 'usually',
  'normally', 'occasionally', 'rarely', 'frequently', 'often',
  // closing transitionals (the WHOLE phrase ends with these)
  'conclusion', 'addition', 'contrast', 'fact', 'short', 'summary',
  'instance', 'example', 'particular', 'general', 'turn', 'reality',
  // subordinators that mark dependent clauses ending at the comma
  'although', 'though', 'because', 'since', 'while', 'whereas',
  'unless', 'until', 'whenever', 'wherever', 'as', 'if', 'when',
  'after', 'before', 'whether',
])

function detectCommaSplices(text) {
  const out = []
  // pattern: ", I/We/.../Subject + verb"
  const starters = COMMA_SPLICE_STARTERS.join('|')
  const re = new RegExp(`(\\w+),\\s+(${starters})\\s+(\\w+)`, 'g')
  let m
  while ((m = re.exec(text)) !== null) {
    // Skip if a paragraph break sits between the comma and the subject.
    // Re-extract the actual whitespace block from the source text.
    const wsStart = m.index + m[1].length + 1   // index of char after comma
    const wsEnd = m.index + m[0].length - m[2].length - m[3].length - 1
    const ws = text.slice(wsStart, Math.max(wsStart, wsEnd))
    if (/\n\s*\n/.test(ws)) continue
    // Skip if the word BEFORE the comma is on the safe-list (transitional
    // phrase, letter greeting, or subordinator).
    if (COMMA_SPLICE_SKIP_WORDS.has(m[1].toLowerCase())) continue
    // Skip if the comma is the first comma of the sentence and the
    // segment before it is short (≤ 4 words) — usually an intro phrase
    // like "In conclusion," or "On the other hand," or "After lunch,".
    const sentStart = lastSentenceStart(text, m.index)
    const segBefore = text.slice(sentStart, m.index).trim()
    const wordsBefore = segBefore.split(/\s+/).filter(Boolean).length
    if (wordsBefore <= 4) continue
    // Skip if any earlier comma in the segment-before exists — likely
    // a list, not a clause boundary we care about.
    if (segBefore.includes(',')) continue
    // The next word after the comma must look like a verb to be a clause.
    const second = m[3].toLowerCase()
    const isLikelyVerb = /(?:ed|es|en|ing)$/.test(second) ||
      /^(am|is|are|was|were|be|been|being|have|has|had|do|does|did|can|could|will|would|may|might|shall|should|must|need|seem|feel|felt|think|thought|know|knew|see|saw|go|went|come|came|take|took|give|gave|run|ran|find|found|tell|told|say|said|get|got|make|made|let|put|stop|start|begin|begun|hate|hated|love|loved|live|lived|wait|waited|want|wanted|like|liked|need|needed|try|tried|turn|turned|look|looked|wonder|wondered|notice|noticed|realise|realised|realize|realized|understand|understood)$/.test(second)
    if (!isLikelyVerb) continue
    if (isInsideQuotes(text, m.index)) continue
    out.push(makeFinding({
      id: 'comma-splice',
      type: 'grammar',
      severity: HIGH,
      start: m.index, end: m.index + m[0].length, text,
      message: 'Possible comma splice — two independent clauses joined by only a comma. Use a full stop, semicolon, or "and/but/so".',
      suggestion: null,
    }))
  }
  return out
}

function lastSentenceStart(text, idx) {
  // Walk backward to find the previous sentence-ending punctuation
  // or the start of the text.
  for (let i = idx - 1; i > 0; i--) {
    const c = text[i]
    if (c === '.' || c === '!' || c === '?' || c === '\n') {
      // Skip whitespace immediately after
      let j = i + 1
      while (j < text.length && /\s/.test(text[j])) j++
      return j
    }
  }
  return 0
}

// ────────────────────────────────────────────────────────────────────
// Run-on / overly long sentences
// ────────────────────────────────────────────────────────────────────

function detectRunOns(text, sentenceSpans) {
  const out = []
  for (const s of sentenceSpans) {
    const wordCount = s.text.trim().split(/\s+/).filter(Boolean).length
    if (wordCount >= 45) {
      out.push(makeFinding({
        id: 'sentence-too-long',
        type: 'style',
        severity: MED,
        start: s.start, end: s.end, text,
        message: `Sentence is ${wordCount} words. Consider splitting into two for clarity.`,
        suggestion: null,
      }))
    } else if (wordCount >= 35) {
      out.push(makeFinding({
        id: 'sentence-long',
        type: 'style',
        severity: LOW,
        start: s.start, end: s.end, text,
        message: `Long sentence (${wordCount} words). Check that the structure stays controlled.`,
        suggestion: null,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Sentence fragments — sentences with no main verb / very short
// ────────────────────────────────────────────────────────────────────

const VERB_HINTS = new RegExp(
  '\\b(?:' +
  // Auxiliaries
  'am|is|are|was|were|be|been|being|have|has|had|do|does|did|' +
  'can|could|will|would|may|might|shall|should|must|' +
  // Verb-y suffixes
  '\\w+ed|\\w+ing|\\w+es|\\w+ies|\\w+s|' +
  // Common bare-form verbs
  'go|come|take|give|run|find|tell|say|get|make|let|put|stop|start|' +
  'know|see|hear|feel|think|want|need|wish|hope|try|fall|fell|' +
  // Irregular-past forms
  'eat|ate|drink|drank|sleep|slept|read|write|wrote|spoke|saw|ran|came|gave|took|stood|sat|hold|held|sing|sang|drive|drove|swim|swam|fight|fought|bring|brought|catch|caught|teach|taught|buy|bought|build|built|leave|left|meet|met|win|won|lose|lost|grow|grew|throw|threw|pay|paid|sell|sold|send|sent|spend|spent|tell|told|went|did|done|made|got|gotten|kept|felt|heard|broke|broken|chose|chosen|drew|drawn|flew|flown|knew|known|spoke|spoken|stole|stolen|woke|woken|hid|hidden|fed|fed|led|lit|lit|met|met|shot|shot|hurt|hurt|cost|cost|cut|cut|hit|hit|put|put|set|set|bet|bet|let|let|shut|shut|spread|spread|burst|burst|cast|cast|forecast|forecast|hurt|hurt|quit|quit|rid|rid|split|split|thrust|thrust|wed|wed|' +
  // Additional bare-form verbs commonly missed
  'look|wait|expect|consider|reflect|continue|prefer|ask|answer|share|join|cause|focus|return|enjoy|use|live|play|rest|talk|walk|work|study|stay|move|change|carry|open|close|raise|push|pull|reach|seem|appear|exist|remain|happen|matter|differ|agree|argue|believe|claim|mean|wonder|notice|realise|realize|understand|imagine|remember|recall|forget|recognise|recognize|describe|explain|introduce|present|prepare|provide|offer|accept|reject|refuse|admit|deny|prove|suggest|recommend|hate|love|like|dislike|rely|depend|insist|require|allow|enable|prevent|avoid|deserve|appreciate|create|develop|design|discover|invent|destroy|burn|melt|freeze|boil|cook|wash|clean|fix|repair|paint|cut|tear|break|drop|add|remove|increase|decrease|reduce|lower|expand|shrink|attend|miss|pass|fail|succeed|attempt|visit|call|text|email|inform|announce|publish|broadcast|report|capture|protect|guard|attack|defend|settle|decide|hesitate|relax|wake|rise|stand|lie|kneel|bend|stretch|jump|skip|dance|laugh|cry|smile|frown' +
  ')\\b',
  'i'
)

function detectFragments(text, sentenceSpans) {
  const out = []
  for (const s of sentenceSpans) {
    const trimmed = s.text.trim().replace(/[.!?]+$/, '').trim()
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length
    if (wordCount < 3) continue              // too short to judge confidently
    if (wordCount > 30) continue              // long sentences usually have verbs
    // Skip if starts with a question word (How/What/Why/When/Where) — common rhetorical
    if (/^(how|what|why|when|where|who|which)\b/i.test(trimmed)) continue
    // Skip sentences ending in ! — exclamatory fragments are stylistically allowed
    if (/!$/.test(s.text.trim())) continue
    // Skip sentences inside quotes (dialogue)
    if (isInsideQuotes(text, s.start)) continue
    if (!VERB_HINTS.test(trimmed)) {
      out.push(makeFinding({
        id: 'fragment',
        type: 'grammar',
        severity: MED,
        start: s.start, end: s.end, text,
        message: 'Possible sentence fragment — no clear verb. Every sentence needs a subject and a verb.',
        suggestion: null,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Subject-verb agreement (very common patterns only)
// ────────────────────────────────────────────────────────────────────

// Word immediately before he/she/it that licenses the subjunctive "were", so the
// indicative-agreement rule must stay silent. Mirrors SVA_BARE_BLOCK_BEFORE below.
const SUBJUNCTIVE_WERE_BEFORE = new Set([
  'if', 'only', 'though', 'whether', 'that', 'unless',
  'wish', 'wishes', 'wished', 'suppose', 'supposing', 'imagine',
])

function detectSubjectVerbAgreement(text) {
  const out = []
  const rules = [
    { re: /\b(everyone|everybody|someone|somebody|anyone|anybody|no one|nobody|each|either|neither)\s+(are|have|were|do)\b/gi,
      msg: '"everyone/everybody/anyone/each/either/neither" takes a singular verb.',
      fix: (m) => m.replace(/\b(are|have|were|do)\b/i, (v) => ({ are: 'is', have: 'has', were: 'was', do: 'does' }[v.toLowerCase()])) },
    { re: /\bthere\s+is\s+(many|several|few|two|three|four|five|six|seven|eight|nine|ten|hundreds|thousands|millions|some|various)\b/gi,
      msg: 'Use "there are" with plural countables.',
      fix: (m) => m.replace(/there\s+is/i, 'there are') },
    { re: /\bone\s+of\s+the\s+(\w+s)\s+(are|have|were)\b/gi,
      msg: '"One of the X" takes a singular verb (the subject is "one").',
      fix: (m) => m.replace(/\b(are|have|were)\b/i, (v) => ({ are: 'is', have: 'has', were: 'was' }[v.toLowerCase()])) },
    { re: /\bthe\s+(list|number|quality|set|group|amount|range|series|variety)\s+of\s+\w+\s+(are|have|were)\b/gi,
      msg: 'The subject is the head noun (singular). Use "is/has/was".',
      fix: (m) => m.replace(/\b(are|have|were)\b/i, (v) => ({ are: 'is', have: 'has', were: 'was' }[v.toLowerCase()])) },
    { re: /\b(he|she|it)\s+(don't|do not|have not|haven't)\b/gi,
      msg: 'With he/she/it, use "doesn\'t / does not / hasn\'t / has not".',
      fix: null },
    // "were" is split off: after he/she/it it is the SUBJUNCTIVE ("If he were
    // rich…", "I wish she were here") — correct English that IGCSE 0500/0510
    // teaches as the second conditional. Only the dialectal indicative
    // ("He were at the party") is an error, so a subjunctive trigger
    // immediately before the pronoun voids the rule.
    { re: /\b(he|she|it)\s+were\b/gi,
      msg: 'With he/she/it, the past tense is "was" ("he was", not "he were").',
      fix: null, blockBefore: SUBJUNCTIVE_WERE_BEFORE },
    { re: /\b(I|we|they|you)\s+(doesn't|does not|has not|hasn't)\b/gi,
      msg: 'With I/we/they/you, use "don\'t / do not / haven\'t / have not".',
      fix: null },
    // "was" is split off and restricted to we/they/you: "I was" is the CORRECT
    // first-person singular past. Bundling "I" in here flagged every past-tense
    // narrative sentence HIGH and told the student to write "I were".
    { re: /\b(we|they|you)\s+was\b/gi,
      msg: 'With we/they/you, the past tense is "were" ("we were", not "we was").',
      fix: null },
  ]
  for (const r of rules) {
    let m
    while ((m = r.re.exec(text)) !== null) {
      if (r.blockBefore) {
        const before = text.slice(0, m.index).match(/([A-Za-z']+)\s*$/)
        if (before && r.blockBefore.has(before[1].toLowerCase())) continue
      }
      const fixed = r.fix ? r.fix(m[0]) : null
      out.push(makeFinding({
        id: 'subject-verb',
        type: 'grammar',
        severity: HIGH,
        start: m.index, end: m.index + m[0].length, text,
        message: r.msg,
        suggestion: fixed,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Subject-verb agreement, 2: he/she + bare verb ("he go" → "he goes").
//
// CONSERVATIVE by construction. We only fire when:
//   • the subject is the pronoun "he" or "she" (NOT "it" — "let it go",
//     "make it work", dummy-subject "it rain[s]" are false-positive magnets);
//   • the verb is in a curated high-frequency list whose bare form after
//     he/she is almost always an agreement slip, EXCLUDING verbs whose bare
//     form is also a valid past tense (put/cut/read/hit/let/set/cost…) — those
//     would make "he put the book down" a correct past clause.
// Plus guards: skip subjunctive triggers ("I suggest he go home"), compound
// subjects ("the boy and she go"), relative clauses ("the girl who sit"), and
// dialogue. Plural-/noun-subject agreement ("the teachers gives") is harder to
// do without a parser and is left to the BYOK tutor.
// ────────────────────────────────────────────────────────────────────

const SVA_BARE_VERBS = new Set([
  'go', 'come', 'make', 'take', 'want', 'need', 'like', 'love', 'hate', 'know',
  'think', 'feel', 'say', 'tell', 'live', 'work', 'play', 'study', 'eat', 'run',
  'walk', 'talk', 'help', 'look', 'seem', 'stay', 'give', 'get', 'find', 'keep',
  'hope', 'wish', 'try', 'use', 'call', 'believe', 'enjoy', 'prefer', 'learn',
  'teach', 'speak', 'sleep', 'dream', 'smile', 'cry', 'laugh', 'sing', 'dance',
  'drive', 'cook', 'clean', 'watch', 'listen', 'understand', 'remember',
  'forget', 'decide', 'agree', 'refuse', 'become', 'remain', 'continue',
  'begin', 'finish', 'start', 'stop', 'return', 'arrive', 'leave', 'move',
  'travel', 'visit', 'meet', 'win', 'lose', 'build', 'buy', 'sell', 'pay',
  'spend', 'save', 'grow', 'follow', 'bring', 'catch', 'hold', 'stand', 'sit',
  'fall', 'rise', 'ride', 'send', 'wear', 'choose', 'throw',
])

// Word immediately before the pronoun that voids the rule (subjunctive trigger,
// compound subject, relative clause, or SUBJECT-AUXILIARY INVERSION).
//
// Inversion is the big one: English puts the BARE verb after the pronoun in every
// question and after every modal — "Did he go?", "Can she swim?", "Hasn't he
// come?" — never "Did he goes?". Without this the rule flagged correct questions
// HIGH and "corrected" them to something ungrammatical.
// Wh-words are deliberately absent: in "Why does he study" the word immediately
// before the pronoun is already "does", which the lookback reads.
// `has/have/had` matter because several curated verbs are their own past
// participle ("Has he come home?", "Has she become a doctor?").
const SVA_BARE_BLOCK_BEFORE = new Set([
  'and', 'or', 'nor', 'who', 'which', 'that', 'to', 'lest', '&',
  // auxiliaries + modals (subject-auxiliary inversion)
  'do', 'does', 'did', 'has', 'have', 'had',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
  // …and their negated contractions
  "don't", "doesn't", "didn't", "hasn't", "haven't", "hadn't",
  "won't", "wouldn't", "shan't", "shouldn't", "can't", "couldn't",
  "mightn't", "mustn't",
  'suggest', 'suggests', 'suggested', 'recommend', 'recommends', 'recommended',
  'insist', 'insists', 'insisted', 'demand', 'demands', 'demanded',
  'request', 'requests', 'requested', 'propose', 'proposes', 'proposed',
  'require', 'requires', 'required', 'ask', 'asks', 'asked',
  'advise', 'advises', 'advised', 'prefer', 'prefers', 'preferred',
  'important', 'essential', 'vital', 'crucial', 'necessary', 'imperative', 'mandatory',
])

function thirdPersonSingular(verb) {
  const v = verb.toLowerCase()
  if (/(?:s|x|z|ch|sh|o)$/.test(v)) return v + 'es'        // go→goes, watch→watches
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies'  // study→studies
  return v + 's'
}

function detectSubjectVerbBareVerb(text) {
  const out = []
  const re = /\b(he|she)\s+([a-z]+)\b/gi
  let m
  while ((m = re.exec(text)) !== null) {
    const verb = m[2].toLowerCase()
    if (!SVA_BARE_VERBS.has(verb)) continue
    if (isInsideQuotes(text, m.index)) continue            // dialect inside dialogue — leave it
    // Curly apostrophes are normalised here (only here): a missed match on a
    // DETECTION rule is a safe false negative, but a missed match on this BLOCK
    // list re-opens the false positive it exists to prevent.
    const before = text.slice(0, m.index).match(/([A-Za-z'’]+)\s*$/)
    if (before && SVA_BARE_BLOCK_BEFORE.has(before[1].toLowerCase().replace(/’/g, "'"))) continue
    const pronoun = m[1]
    const correct = thirdPersonSingular(verb)
    out.push(makeFinding({
      id: 'subject-verb-bare',
      type: 'grammar',
      severity: HIGH,
      start: m.index, end: m.index + m[0].length, text,
      message: `"${pronoun} ${verb}" — a singular subject takes the -s form. Use "${pronoun} ${correct}".`,
      suggestion: `${pronoun} ${correct}`,
    }))
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Subject-verb agreement, 3: determiner-anchored agreement.
//
// A determiner fixes the NUMBER of its head noun, so the verb's number is
// catchable WITHOUT a parser and at near-zero false-positive risk:
//   • "every / each (+adj) NOUN + are/have/were/do" → the noun is singular, so
//     the verb must be is/has/was/does ("every teenager have" → "has").
//   • "many / several / few / both / numerous (+adj) PLURAL-NOUN + is/was/has/does"
//     → the noun is plural, so the verb must be are/have/were/do
//     ("many students is" → "are").
// Conservative guards (bias = DON'T flag when unsure; misses go to BYOK):
//   • "many a NOUN is" is a CORRECT singular idiom — skip when "a/an" follows the
//     determiner.
//   • collective "this/that NOUN are" is valid British usage — those determiners
//     are simply absent from both sets.
//   • singular nouns that merely END in -s (news/physics/series/species…) and
//     measure/duration nouns ("ten years is a long time") are excluded from the
//     plural branch, so "is" is never forced to "are".
//   • the head noun must be a content word, not a function word — skips relative
//     clauses ("every student that are…") and "every one of the X are"; the gap is
//     capped at one adjective so compound subjects ("every effort and resource
//     are") never match.
//   • the plural branch additionally REQUIRES a plural-looking head noun (ends in
//     a non-{ss,us,is,ous} -s, or a known irregular plural).
// Bare-noun-subject SVA without a determiner ("the teachers gives") still needs a
// parser and is left to the BYOK tutor.
// ────────────────────────────────────────────────────────────────────

const SVA_DET_PLURAL_VERB_FIX = { are: 'is', have: 'has', were: 'was', do: 'does' }
const SVA_DET_SINGULAR_VERB_FIX = { is: 'are', was: 'were', has: 'have', does: 'do' }

// As the head-noun slot, any of these means the determiner is NOT the verb's
// subject (relative pronouns, conjunctions, prepositions, articles, auxiliaries).
const SVA_DET_FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'nor', 'but', 'of', 'in', 'on', 'to', 'for',
  'with', 'as', 'at', 'by', 'that', 'who', 'which', 'whom', 'whose', 'when',
  'where', 'while', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'has',
  'have', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'shall',
  'should', 'may', 'might', 'must', 'not', 'no', 'so', 'too', 'very', 'more',
  'most', 'such',
])

// End in -s but grammatically singular — never forced to a plural verb.
const SVA_DET_SINGULAR_S_NOUNS = new Set([
  'news', 'physics', 'mathematics', 'maths', 'economics', 'politics', 'statistics',
  'ethics', 'athletics', 'gymnastics', 'series', 'species', 'means', 'crossroads',
  'headquarters', 'barracks',
])

// Measure / duration / quantity nouns that frequently take a notional singular
// ("ten years is a long time") — excluded from the plural branch.
const SVA_DET_MEASURE_NOUNS = new Set([
  'years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'decades',
  'centuries', 'dollars', 'pounds', 'euros', 'cents', 'miles', 'kilometres',
  'kilometers', 'metres', 'meters', 'kilograms', 'kilos', 'litres', 'liters',
  'degrees', 'percent',
])

// Irregular plurals that don't end in -s but ARE plural (valid plural-branch heads).
const SVA_DET_IRREGULAR_PLURALS = new Set([
  'people', 'children', 'men', 'women', 'police',
])

// Swap the agreement verb inside the matched phrase, preserving its capitalisation.
function svaSwapVerb(phrase, verbRe, fix) {
  return phrase.replace(verbRe, (v) =>
    /^[A-Z]/.test(v) ? fix.charAt(0).toUpperCase() + fix.slice(1) : fix,
  )
}

function detectDeterminerAgreement(text) {
  const out = []

  // ── Singular branch: every/each (+adj) NOUN + plural verb → singular ──
  const reSing = /\b(every|each)\s+([a-z]+)(?:\s+([a-z]+))?\s+(are|have|were|do)\b/gi
  let m
  while ((m = reSing.exec(text)) !== null) {
    if (isInsideQuotes(text, m.index)) continue
    const adj = m[3] ? m[2].toLowerCase() : null
    const noun = (m[3] || m[2]).toLowerCase()
    if (SVA_DET_FUNCTION_WORDS.has(noun)) continue        // relative clause / "every one of…"
    if (adj && SVA_DET_FUNCTION_WORDS.has(adj)) continue   // compound subject / preposition gap
    const verb = m[4].toLowerCase()
    const fix = SVA_DET_PLURAL_VERB_FIX[verb]
    out.push(makeFinding({
      id: 'subject-verb-determiner',
      type: 'grammar',
      severity: HIGH,
      start: m.index, end: m.index + m[0].length, text,
      message: `"${m[1].toLowerCase()} ${noun}" is singular — use "${fix}", not "${verb}".`,
      suggestion: svaSwapVerb(m[0], /\b(are|have|were|do)\b/i, fix),
    }))
  }

  // ── Plural branch: many/several/few/both/numerous (+adj) PLURAL-NOUN + singular verb → plural ──
  const rePlural = /\b(many|several|few|both|numerous)\s+([a-z]+)(?:\s+([a-z]+))?\s+(is|was|has|does)\b/gi
  while ((m = rePlural.exec(text)) !== null) {
    if (isInsideQuotes(text, m.index)) continue
    const det = m[1].toLowerCase()
    const firstWord = m[2].toLowerCase()
    if (det === 'many' && (firstWord === 'a' || firstWord === 'an')) continue  // "many a NOUN is" — correct singular
    const adj = m[3] ? m[2].toLowerCase() : null
    const noun = (m[3] || m[2]).toLowerCase()
    if (SVA_DET_FUNCTION_WORDS.has(noun)) continue
    if (adj && SVA_DET_FUNCTION_WORDS.has(adj)) continue
    if (SVA_DET_SINGULAR_S_NOUNS.has(noun)) continue       // news/physics/series… stay singular
    if (SVA_DET_MEASURE_NOUNS.has(noun)) continue          // "many years is" — notional singular
    const looksPlural = (/s$/.test(noun) && !/(ss|us|is|ous)$/.test(noun)) ||
      SVA_DET_IRREGULAR_PLURALS.has(noun)
    if (!looksPlural) continue                             // require a plural head noun
    const verb = m[4].toLowerCase()
    const fix = SVA_DET_SINGULAR_VERB_FIX[verb]
    out.push(makeFinding({
      id: 'subject-verb-determiner',
      type: 'grammar',
      severity: HIGH,
      start: m.index, end: m.index + m[0].length, text,
      message: `"${det} ${noun}" is plural — use "${fix}", not "${verb}".`,
      suggestion: svaSwapVerb(m[0], /\b(is|was|has|does)\b/i, fix),
    }))
  }

  return out
}

// ────────────────────────────────────────────────────────────────────
// Uncountable nouns wrongly pluralised ("informations", "advices").
// Curated — every entry is a word that is NEVER a valid plural AND never a
// verb form, so a flag carries essentially no false-positive risk. Ambiguous
// words ("researches"/"works"/"staffs" — all valid verbs/plurals) are excluded.
// ────────────────────────────────────────────────────────────────────

const UNCOUNTABLE_PLURALS = new Map([
  ['informations', 'information'], ['advices', 'advice'],
  ['furnitures', 'furniture'], ['equipments', 'equipment'],
  ['luggages', 'luggage'], ['homeworks', 'homework'],
  ['softwares', 'software'], ['knowledges', 'knowledge'],
])

function detectUncountablePlurals(text) {
  const out = []
  for (const w of iterWords(text)) {
    const fix = UNCOUNTABLE_PLURALS.get(w.lower)
    if (!fix) continue
    const correct = /^[A-Z]/.test(w.word) ? fix.charAt(0).toUpperCase() + fix.slice(1) : fix
    out.push(makeFinding({
      id: 'uncountable-plural',
      type: 'grammar',
      severity: HIGH,
      start: w.start, end: w.end, text,
      message: `"${w.word}" is uncountable — it has no plural form. Use "${correct}".`,
      suggestion: correct,
    }))
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Double comparative / superlative ("more better", "most happiest").
//
// A double comparison is NEVER correct: "more" / "most" before a word that is
// ALREADY comparative (-er) or superlative (-est) is always wrong. We match a
// CURATED set of unambiguous comparative/superlative forms — NOT a generic
// -er/-est match, which would false-positive on nouns ("more teachers", "most
// interest") and on base adjectives that merely end in -er ("more eager", "more
// clever"). The correct periphrastic forms — "more important", "most beautiful"
// (more/most + a BASE adjective) — are absent from the set, so they stay
// unflagged. Noun homographs (lighter, cooler) are deliberately omitted.
// ────────────────────────────────────────────────────────────────────

const COMPARATIVE_FORMS = new Set([
  // irregular
  'better', 'worse', 'further', 'farther',
  // common -er comparatives (base differs; never a base adjective or noun)
  'bigger', 'smaller', 'larger', 'cheaper', 'stronger', 'weaker', 'faster',
  'slower', 'older', 'younger', 'sooner', 'later', 'harder', 'easier', 'higher',
  'lower', 'taller', 'shorter', 'longer', 'wider', 'deeper', 'richer', 'poorer',
  'happier', 'prettier', 'busier', 'heavier', 'brighter', 'darker', 'warmer',
  'colder', 'hotter', 'kinder', 'nicer', 'safer', 'cleaner', 'closer', 'greater',
  'simpler', 'braver', 'calmer', 'smarter', 'angrier', 'friendlier', 'healthier',
  'wealthier', 'luckier', 'lazier', 'noisier', 'scarier', 'fancier',
])

const SUPERLATIVE_FORMS = new Set([
  // irregular
  'best', 'worst', 'furthest', 'farthest',
  // common -est superlatives
  'biggest', 'smallest', 'largest', 'cheapest', 'strongest', 'weakest',
  'fastest', 'slowest', 'oldest', 'youngest', 'soonest', 'latest', 'hardest',
  'easiest', 'highest', 'lowest', 'tallest', 'shortest', 'longest', 'widest',
  'deepest', 'richest', 'poorest', 'happiest', 'prettiest', 'busiest',
  'heaviest', 'brightest', 'darkest', 'warmest', 'coldest', 'hottest', 'kindest',
  'nicest', 'safest', 'cleanest', 'closest', 'greatest', 'simplest', 'bravest',
  'calmest', 'smartest', 'cleverest', 'angriest', 'friendliest', 'healthiest',
  'wealthiest', 'luckiest', 'noisiest', 'scariest', 'fanciest', 'finest',
  'rarest', 'wisest',
])

function detectDoubleComparatives(text) {
  const out = []
  const re = /\b(more|most)\b\s+([a-z]+)\b/gi
  let m
  while ((m = re.exec(text)) !== null) {
    const head = m[1].toLowerCase()
    const word = m[2].toLowerCase()
    const isSuper = SUPERLATIVE_FORMS.has(word)
    const isComp = COMPARATIVE_FORMS.has(word)
    if (!isSuper && !isComp) continue
    if (isInsideQuotes(text, m.index)) continue
    const kind = isSuper ? 'superlative' : 'comparative'
    // Fix: drop "more"/"most" and keep the inflected form (preserve a leading
    // capital if "More"/"Most" began the sentence).
    const keep = /^[A-Z]/.test(m[1]) ? m[2].charAt(0).toUpperCase() + m[2].slice(1) : m[2]
    out.push(makeFinding({
      id: 'double-comparative',
      type: 'grammar',
      severity: HIGH,
      start: m.index, end: m.index + m[0].length, text,
      message: `"${head} ${word}" is a double ${kind} — "${word}" is already ${kind}. Use "${word}" on its own.`,
      suggestion: keep,
    }))
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// "much" + countable plural noun ("much people" → "many people").
//
// "much" quantifies UNCOUNTABLE nouns (much time, much money, much water); a
// plural countable noun takes "many". We use a CURATED list of unambiguously
// countable plural nouns (mirrors the "less + countable" rule), so uncountable
// nouns after "much" stay correctly unflagged. Only the DIRECT "much NOUN"
// collision is caught; "much good friends" (an adjective between) is left to BYOK.
// ────────────────────────────────────────────────────────────────────

const MUCH_COUNTABLE_NOUNS = new Set([
  'people', 'students', 'pupils', 'teachers', 'parents', 'children', 'men',
  'women', 'friends', 'books', 'cars', 'things', 'items', 'ideas', 'hours',
  'minutes', 'days', 'weeks', 'months', 'years', 'opportunities', 'options',
  'choices', 'reasons', 'differences', 'places', 'countries', 'cities',
  'schools', 'houses', 'problems', 'questions', 'mistakes', 'words', 'languages',
  'subjects', 'lessons', 'exams', 'animals', 'shops', 'computers', 'phones',
  'games', 'songs', 'pictures', 'photos', 'letters', 'emails', 'messages',
  'members', 'customers', 'players', 'teams', 'jobs', 'tasks', 'projects',
  'meetings', 'events', 'activities', 'hobbies', 'skills', 'dreams', 'goals',
  'plans', 'rules', 'examples', 'tools', 'buildings', 'rooms',
])

function detectMuchCountable(text) {
  const out = []
  const re = /\bmuch\s+([a-z]+)\b/gi
  let m
  while ((m = re.exec(text)) !== null) {
    const noun = m[1].toLowerCase()
    if (!MUCH_COUNTABLE_NOUNS.has(noun)) continue
    if (isInsideQuotes(text, m.index)) continue
    const many = /^[A-Z]/.test(m[0]) ? 'Many' : 'many'
    out.push(makeFinding({
      id: 'much-countable',
      type: 'grammar',
      severity: HIGH,
      start: m.index, end: m.index + m[0].length, text,
      message: `"much ${noun}" — use "many" for countable plural nouns ("much" is for uncountable nouns like time or money).`,
      suggestion: `${many} ${m[1]}`,
    }))
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Do-support + past tense ("didn't went" → "didn't go").
//
// After do-support (did / didn't / do / don't / does / doesn't) the main verb
// must be the BASE form, never a past tense. We use a CURATED map of irregular
// pasts whose base form DIFFERS and which carry no base-verb / noun homograph in
// this slot. Excluded for safety (left to BYOK): invariant verbs whose past ==
// base (put/cut/read/set/let/hit/cost/hurt/shut/spread/bet/quit) and ambiguous
// words that are valid base verbs or nouns after do-support (saw, found, left,
// felt, fell, rose). Regular "-ed" pasts are not listed — "didn't walked" is a
// clear slip, but "-ed" overlaps adjectives/participles, so it stays BYOK. The
// leading "did/do/does" is safe even as a main verb because the SECOND word must
// be in the curated past map ("did my homework" never matches).
// ────────────────────────────────────────────────────────────────────

const IRREGULAR_PAST_TO_BASE = new Map([
  ['went', 'go'], ['ate', 'eat'], ['came', 'come'], ['took', 'take'],
  ['gave', 'give'], ['made', 'make'], ['knew', 'know'], ['said', 'say'],
  ['told', 'tell'], ['wrote', 'write'], ['ran', 'run'], ['drove', 'drive'],
  ['spoke', 'speak'], ['bought', 'buy'], ['brought', 'bring'], ['caught', 'catch'],
  ['taught', 'teach'], ['built', 'build'], ['sold', 'sell'], ['sent', 'send'],
  ['spent', 'spend'], ['kept', 'keep'], ['held', 'hold'], ['fought', 'fight'],
  ['sang', 'sing'], ['swam', 'swim'], ['threw', 'throw'], ['broke', 'break'],
  ['chose', 'choose'], ['woke', 'wake'], ['slept', 'sleep'], ['began', 'begin'],
  ['grew', 'grow'], ['flew', 'fly'], ['drank', 'drink'], ['stood', 'stand'],
  ['sat', 'sit'], ['understood', 'understand'], ['won', 'win'], ['lost', 'lose'],
  ['met', 'meet'], ['paid', 'pay'], ['heard', 'hear'], ['thought', 'think'],
  ['got', 'get'], ['became', 'become'], ['rode', 'ride'], ['rang', 'ring'],
  ['wore', 'wear'], ['shook', 'shake'], ['stole', 'steal'],
])

function detectDoSupportPast(text) {
  const out = []
  // Longest/most-specific auxiliaries first so "did" never shadows "didn't".
  const re = /\b(didn['']?t|did not|did|doesn['']?t|does not|does|don['']?t|do not|do)\s+([a-z]+)\b/gi
  let m
  while ((m = re.exec(text)) !== null) {
    const aux = m[1]
    const verb = m[2].toLowerCase()
    const base = IRREGULAR_PAST_TO_BASE.get(verb)
    if (!base) continue
    if (isInsideQuotes(text, m.index)) continue
    out.push(makeFinding({
      id: 'do-support-past',
      type: 'grammar',
      severity: HIGH,
      start: m.index, end: m.index + m[0].length, text,
      message: `After "${aux.toLowerCase()}", use the base form: "${aux} ${base}", not "${aux} ${verb}".`,
      suggestion: `${aux} ${base}`,
    }))
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Double negatives
// ────────────────────────────────────────────────────────────────────

function detectDoubleNegatives(text) {
  const out = []
  const re = /\b(don't|doesn't|didn't|won't|can't|cannot|couldn't|shouldn't|wouldn't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|never|not)\s+(?:\w+\s+){0,3}?(no|none|nobody|no one|nothing|never|neither|nowhere|hardly|barely|scarcely)\b/gi
  let m
  while ((m = re.exec(text)) !== null) {
    out.push(makeFinding({
      id: 'double-negative',
      type: 'grammar',
      severity: MED,
      start: m.index, end: m.index + m[0].length, text,
      message: 'Double negative — in formal English use one negative ("anything", "anyone", etc.) with the negative verb.',
      suggestion: null,
    }))
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Wrong / informal preposition collocations
// ────────────────────────────────────────────────────────────────────

const PREPOSITION_FIXES = [
  { re: /\bdiscuss\s+about\b/gi,        fix: 'discuss',                msg: '"Discuss" doesn\'t take "about" in formal English. Just "discuss X".' },
  { re: /\bmention\s+about\b/gi,        fix: 'mention',                msg: 'Drop "about" — say "mention X".' },
  { re: /\bemphasi[sz]e\s+on\b/gi,      fix: 'emphasise',              msg: '"Emphasise X", not "emphasise on X". (Or use "place emphasis on X".)' },
  { re: /\bcomprises\s+of\b/gi,         fix: 'comprises',              msg: '"Comprises X" or "consists of X" — not "comprises of".' },
  { re: /\bconsist\s+from\b/gi,         fix: 'consist of',             msg: '"Consist of X".' },
  { re: /\bdifferent\s+than\b/gi,       fix: 'different from',         msg: 'Standard British English uses "different from".' },
  { re: /\bdifferent\s+to\b/gi,         fix: 'different from',         msg: 'In formal writing prefer "different from" over "different to".' },
  { re: /\bbored\s+of\b/gi,             fix: 'bored with',             msg: '"Bored with" or "bored by" is preferred.' },
  { re: /\bin\s+regards\s+to\b/gi,      fix: 'with regard to',         msg: 'The standard form is "with regard to" / "regarding".' },
  { re: /\bcope\s+up\s+with\b/gi,       fix: 'cope with',              msg: '"Cope with X" — drop the "up".' },
  { re: /\breply\s+back\b/gi,           fix: 'reply',                  msg: '"Reply" already implies returning — drop "back".' },
  { re: /\brevert\s+back\b/gi,          fix: 'revert',                 msg: '"Revert" already means going back.' },
  { re: /\breturn\s+back\b/gi,          fix: 'return',                 msg: '"Return" already means going back.' },
  { re: /\bregardless\s+to\b/gi,        fix: 'regardless of',          msg: '"Regardless of X".' },
  { re: /\bin\s+lieu\s+to\b/gi,         fix: 'in lieu of',             msg: '"In lieu of X" (= instead of).' },
  { re: /\bcapable\s+to\b/gi,           fix: 'capable of',             msg: '"Capable of doing X" — not "capable to do".' },
  { re: /\bmarried\s+with\s+(?:my|his|her|their|a|an|the)\b/gi, fix: null, msg: '"Married to", not "married with" — "she married him" / "she is married to him".' },
  { re: /\bexplained\s+me\b/gi,         fix: 'explained to me',        msg: '"Explain TO someone" — "she explained to me".' },
  { re: /\bexplained\s+(?:him|her|them|us)\b/gi, fix: null,            msg: '"Explain TO someone" — add "to".' },
  { re: /\bsuggested\s+me\b/gi,         fix: 'suggested to me',        msg: '"Suggest TO someone" — add "to".' },
  { re: /\bdescribed\s+(?:me|him|her|us|them)\s+(?:about|the)\b/gi, fix: null, msg: '"Describe X to someone" — "she described it to me".' },
  { re: /\bask\s+from\s+(?:me|him|her|them|us)\b/gi, fix: null,        msg: '"Ask someone for X" — drop "from".' },
  { re: /\bnear\s+to\s+the\b/gi,        fix: 'near the',               msg: '"Near the X" — drop "to".' },
  { re: /\boutside\s+of\s+the\b/gi,     fix: 'outside the',            msg: 'Drop "of" after "outside".' },
  { re: /\binside\s+of\s+the\b/gi,      fix: 'inside the',             msg: 'Drop "of" after "inside".' },
  { re: /\boff\s+of\b/gi,               fix: 'off',                    msg: '"Off the table", not "off of the table".' },
  { re: /\bequally\s+as\b/gi,           fix: 'equally',                msg: '"Equally good", not "equally as good".' },
  { re: /\bfocus\s+upon\b/gi,           fix: 'focus on',               msg: '"Focus on" is the standard collocation.' },
  { re: /\bbased\s+of\b/gi,             fix: 'based on',               msg: '"Based on", not "based of".' },
  { re: /\binterested\s+about\b/gi,     fix: 'interested in',          msg: '"Interested in", not "interested about".' },
  { re: /\bdepend(?:s|ed|ing)?\s+of\b/gi, fix: null,                   msg: '"Depend on" (or "dependent on") — not "depend of".' },
  { re: /\baccording\s+with\b/gi,       fix: 'according to',           msg: '"According to", not "according with".' },
  { re: /\bmade\s+from\s+(?:wood|metal|plastic|glass|paper|stone|cotton|wool|leather)\b/gi, fix: null, msg: 'Some materials take "made of" rather than "made from" — "made of wood" if the material is recognisable in the product.' },
]

function detectPrepositionErrors(text) {
  const out = []
  for (const r of PREPOSITION_FIXES) {
    let m
    while ((m = r.re.exec(text)) !== null) {
      out.push(makeFinding({
        id: 'preposition',
        type: 'grammar',
        severity: MED,
        start: m.index, end: m.index + m[0].length, text,
        message: r.msg,
        suggestion: r.fix,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Weak / filler / vague words — stylistic nudges
// ────────────────────────────────────────────────────────────────────

const WEAK_WORDS = [
  { word: 'very', msg: 'Replace "very + adjective" with a stronger single word (very tired → exhausted).' },
  { word: 'really', msg: '"Really" is a filler. Pick a precise word or remove it.' },
  { word: 'just', msg: '"Just" is often filler. Cut it unless it means "only" or "fairly".' },
  { word: 'basically', msg: '"Basically" rarely adds meaning. Cut it.' },
  { word: 'literally', msg: '"Literally" is informal and often misused. In formal writing, cut it.' },
  { word: 'totally', msg: '"Totally" is informal. Use "completely" or cut.' },
  { word: 'kind of', msg: '"Kind of" is vague and informal. Pick a precise word.' },
  { word: 'sort of', msg: '"Sort of" is vague and informal. Pick a precise word.' },
  { word: 'a lot of', msg: '"A lot of" is informal. Try "many", "numerous", "a great deal of".' },
  { word: 'lots of', msg: '"Lots of" is informal. Try "many" or "numerous".' },
  { word: 'stuff', msg: '"Stuff" is too vague — name what you mean.' },
  { word: 'things', msg: 'Try a precise noun in place of "things".' },
  { word: 'nice', msg: '"Nice" is bland — pick a sharper adjective.' },
  { word: 'good', msg: '"Good" is bland in essays. Be specific (effective / convincing / refreshing / sound).' },
  { word: 'bad', msg: '"Bad" is bland — try harmful, careless, ineffective, distressing.' },
  { word: 'thing', msg: 'Replace "thing" with the actual noun.' },
  { word: 'got', msg: '"Got" is informal. Use "received", "obtained", "have".' },
]

function detectWeakWords(text) {
  const out = []
  for (const w of WEAK_WORDS) {
    const escaped = w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')
    const re = new RegExp('\\b' + escaped + '\\b', 'gi')
    let m
    while ((m = re.exec(text)) !== null) {
      out.push(makeFinding({
        id: 'weak-word',
        type: 'style',
        severity: LOW,
        start: m.index, end: m.index + m[0].length, text,
        message: w.msg,
        suggestion: null,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Cliches — stylistic nudges
// ────────────────────────────────────────────────────────────────────

const CLICHES = [
  'at the end of the day',
  'in this day and age',
  'in today\'s society',
  'in today\'s world',
  'last but not least',
  'first and foremost',
  'each and every',
  'few and far between',
  'when all is said and done',
  'time and time again',
  'in a nutshell',
  'as we all know',
  'as a matter of fact',
  'needless to say',
  'it goes without saying',
  'the fact of the matter is',
  'tip of the iceberg',
  'every coin has two sides',
  'two sides of the same coin',
]

function detectCliches(text) {
  const out = []
  for (const c of CLICHES) {
    const re = new RegExp('\\b' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+') + '\\b', 'gi')
    let m
    while ((m = re.exec(text)) !== null) {
      out.push(makeFinding({
        id: 'cliche',
        type: 'style',
        severity: LOW,
        start: m.index, end: m.index + m[0].length, text,
        message: `"${c}" is a cliche — examiners notice. Try a fresher phrasing.`,
        suggestion: null,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Wordy / redundant phrases
// ────────────────────────────────────────────────────────────────────

const WORDY_FIXES = [
  { re: /\bdue\s+to\s+the\s+fact\s+that\b/gi, fix: 'because' },
  { re: /\bin\s+order\s+to\b/gi,              fix: 'to' },
  { re: /\bin\s+spite\s+of\s+the\s+fact\s+that\b/gi, fix: 'although' },
  { re: /\bdespite\s+the\s+fact\s+that\b/gi,  fix: 'although' },
  { re: /\bat\s+this\s+point\s+in\s+time\b/gi, fix: 'now' },
  { re: /\bat\s+the\s+present\s+time\b/gi,    fix: 'now' },
  { re: /\bin\s+the\s+event\s+that\b/gi,      fix: 'if' },
  { re: /\bfor\s+the\s+purpose\s+of\b/gi,     fix: 'to' },
  { re: /\bin\s+the\s+near\s+future\b/gi,     fix: 'soon' },
  { re: /\ba\s+large\s+number\s+of\b/gi,      fix: 'many' },
  { re: /\ba\s+majority\s+of\b/gi,            fix: 'most' },
  { re: /\bin\s+a\s+timely\s+manner\b/gi,     fix: 'promptly' },
  { re: /\bend\s+result\b/gi,                 fix: 'result' },
  { re: /\bfinal\s+outcome\b/gi,              fix: 'outcome' },
  { re: /\bfree\s+gift\b/gi,                  fix: 'gift' },
  { re: /\bpast\s+history\b/gi,               fix: 'history' },
  { re: /\bunexpected\s+surprise\b/gi,        fix: 'surprise' },
  { re: /\bmutual\s+cooperation\b/gi,         fix: 'cooperation' },
  { re: /\bnew\s+innovation\b/gi,             fix: 'innovation' },
  { re: /\bunknown\s+stranger\b/gi,           fix: 'stranger' },
  { re: /\b(reason\s+(?:why|is\s+because))\b/gi, fix: 'reason that' },
]

function detectWordy(text) {
  const out = []
  for (const r of WORDY_FIXES) {
    let m
    while ((m = r.re.exec(text)) !== null) {
      out.push(makeFinding({
        id: 'wordy',
        type: 'style',
        severity: LOW,
        start: m.index, end: m.index + m[0].length, text,
        message: `"${m[0]}" is wordy or redundant. Use "${r.fix}".`,
        suggestion: r.fix,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Tense shift within a sentence — flag sentences that mix past + present
// indicative VERBS strongly. Heuristic and conservative.
// ────────────────────────────────────────────────────────────────────

// Action verbs only — auxiliaries (be/have/do) are excluded because they
// frequently appear in perfect tenses ("has had", "have been") that are
// NOT tense shifts. Including them caused false positives.
const PAST_ACTION_VERBS = /\b(went|came|saw|said|told|heard|felt|thought|knew|got|made|gave|took|left|found|wrote|ran|drove|spoke|stood|sat|brought|caught|taught|bought|built|sold|sent|spent|kept|held|fought|sang|swam|threw|broke|chose|drew|rose|woke|slept|dreamt|fell|began|grew|threw|knew|flew|drank|ate|put|hit|cut)\b/gi
const PRESENT_ACTION_VERBS = /\b(goes|comes|sees|says|tells|hears|feels|thinks|knows|gets|makes|gives|takes|leaves|finds|writes|runs|drives|speaks|stands|sits|brings|catches|teaches|buys|builds|sells|sends|spends|keeps|holds|fights|sings|swims|throws|breaks|chooses|draws|rises|wakes|sleeps|dreams|reads|falls|begins|grows|flies|drinks|eats|puts|hits|cuts)\b/gi

// Past-tense regular verbs (-ed) and -s present-tense verbs are too
// noisy to use without context, so we stick to irregular forms above
// where the past/present surface is unambiguous.

function detectTenseShifts(text, sentenceSpans) {
  const out = []
  for (const s of sentenceSpans) {
    const past = s.text.match(PAST_ACTION_VERBS) || []
    const pres = s.text.match(PRESENT_ACTION_VERBS) || []
    if (past.length >= 1 && pres.length >= 1) {
      const wordCount = s.text.trim().split(/\s+/).filter(Boolean).length
      if (wordCount >= 8) {
        out.push(makeFinding({
          id: 'tense-shift',
          type: 'grammar',
          severity: MED,
          start: s.start, end: s.end, text,
          message: `Possible tense shift in this sentence: past forms (${past.slice(0, 3).join(', ')}) and present forms (${pres.slice(0, 3).join(', ')}). Pick one tense and stay with it.`,
          suggestion: null,
        }))
      }
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Contractions in formal writing
// ────────────────────────────────────────────────────────────────────

// "cannot" is the full formal form — exclude it from this list.
const CONTRACTION_RE = /\b(don't|doesn't|didn't|won't|can't|couldn't|shouldn't|wouldn't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|I'm|you're|we're|they're|he's|she's|it's|I've|you've|we've|they've|I'd|you'd|we'd|they'd|I'll|you'll|we'll|they'll)\b/gi

const FORMAL_FORMATS = new Set(['eng-letter-formal', 'eng-report', 'eng-article', 'eng-discursive', 'eng-speech'])

function detectContractions(text, formatId) {
  if (!formatId || !FORMAL_FORMATS.has(formatId)) return []
  CONTRACTION_RE.lastIndex = 0
  const out = []
  let m
  while ((m = CONTRACTION_RE.exec(text)) !== null) {
    if (isInsideQuotes(text, m.index)) continue
    out.push(makeFinding({
      id: 'contraction-formal',
      type: 'style',
      severity: LOW,
      start: m.index, end: m.index + m[0].length, text,
      message: 'Contractions are informal — formal writing prefers the full form.',
      suggestion: null,
    }))
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

export function findIssues(text, { formatId = null } = {}) {
  if (!text || text.trim().length === 0) return []
  const sentenceSpans = splitSentenceSpans(text)
  const findings = []

  pushAll(findings, detectMisspellings(text))
  pushAll(findings, detectMissingContractions(text))
  pushAll(findings, detectConfusables(text))
  pushAll(findings, detectArticleErrors(text))
  pushAll(findings, detectRepeatedWords(text))
  pushAll(findings, detectCapitalization(text))
  pushAll(findings, detectSpacing(text))
  pushAll(findings, detectCommaSplices(text))
  pushAll(findings, detectRunOns(text, sentenceSpans))
  pushAll(findings, detectFragments(text, sentenceSpans))
  pushAll(findings, detectSubjectVerbAgreement(text))
  pushAll(findings, detectSubjectVerbBareVerb(text))
  pushAll(findings, detectDeterminerAgreement(text))
  pushAll(findings, detectUncountablePlurals(text))
  pushAll(findings, detectDoubleComparatives(text))
  pushAll(findings, detectMuchCountable(text))
  pushAll(findings, detectDoSupportPast(text))
  pushAll(findings, detectDoubleNegatives(text))
  pushAll(findings, detectPrepositionErrors(text))
  pushAll(findings, detectWeakWords(text))
  pushAll(findings, detectCliches(text))
  pushAll(findings, detectWordy(text))
  // Tense-shift detection requires clause-level parsing; without it
  // the rule generates false positives on grammatical generic-present
  // clauses inside past-tense narration. Delegated to the LLM tutor.
  void detectTenseShifts
  pushAll(findings, detectContractions(text, formatId))

  // Sort by start position
  findings.sort((a, b) => a.start - b.start || a.end - b.end)

  // Deduplicate exact-overlap findings of the same type
  const seen = new Set()
  const deduped = []
  for (const f of findings) {
    const key = `${f.type}:${f.start}:${f.end}:${f.id}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(f)
  }
  return deduped
}

export function summariseIssues(findings) {
  const counts = { high: 0, medium: 0, low: 0, total: findings.length }
  const byType = {}
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1
    byType[f.type] = (byType[f.type] || 0) + 1
  }
  return { counts, byType }
}

export const ERROR_TYPES = ['spelling', 'grammar', 'confusable', 'punctuation', 'style']

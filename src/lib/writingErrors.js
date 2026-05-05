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

const STARTS_VOWEL_SOUND = (word) => {
  // Heuristic for "a/an": treat words starting with vowel letter as vowel-sound,
  // but handle a few well-known exceptions.
  const w = word.toLowerCase()
  if (!w) return false
  // Words beginning with silent h
  if (/^(hour|honest|honou?r|heir)/.test(w)) return true
  // Words beginning with u that sound like "you" — consonant sound
  if (/^(uni|use|user|ubiquit|unique|unit|usage|usual|european|one|once)/.test(w)) return false
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
  { id: 'your-areerror', pattern: /\byour\s+(?:going|coming|being|getting|making|doing|the\s+(?:best|worst|one)|a\s+\w+er\b|so\s+\w+|right|wrong|absolutely|probably|definitely|welcome\b)/gi,
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
  { id: 'there-possessive-2', pattern: /\bthere\s+(?:opinion|view|feelings|behaviour|behavior|grades|results|interests|values|culture|future|hopes|fears|dreams|education|attention|thoughts|argument|response|action|actions|decision|decisions|problem|problems)\b/gi,
    type: 'confusable', severity: HIGH,
    message: '"there" is a place. Use "their" for possession.',
    fix: (m) => m.replace(/there/i, 'their') },

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
])

function detectMisspellings(text) {
  const out = []
  for (const w of iterWords(text)) {
    const fix = MISSPELLINGS.get(w.lower)
    if (fix && fix !== w.lower) {
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
  'eat|ate|drink|drank|sleep|slept|read|write|wrote|spoke|saw|ran|came|gave|took|stood|sat|hold|held|sing|sang|drive|drove|swim|swam|fight|fought|bring|brought|catch|caught|teach|taught|buy|bought|build|built|leave|left|meet|met|win|won|lose|lost|grow|grew|throw|threw|pay|paid|sell|sold|send|sent|spend|spent|tell|told' +
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
    { re: /\b(he|she|it)\s+(don't|do not|have not|haven't|were)\b/gi,
      msg: 'With he/she/it, use "doesn\'t / does not / hasn\'t / has not / was".',
      fix: null },
    { re: /\b(I|we|they|you)\s+(doesn't|does not|has not|hasn't|was)\b/gi,
      msg: 'With I/we/they/you, use "don\'t / do not / haven\'t / have not / were".',
      fix: null },
  ]
  for (const r of rules) {
    let m
    while ((m = r.re.exec(text)) !== null) {
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
  { re: /\bbored\s+of\b/gi,             fix: 'bored with',             msg: '"Bored with" or "bored by" is preferred.' },
  { re: /\bin\s+regards\s+to\b/gi,      fix: 'with regard to',         msg: 'The standard form is "with regard to" / "regarding".' },
  { re: /\bcope\s+up\s+with\b/gi,       fix: 'cope with',              msg: '"Cope with X" — drop the "up".' },
  { re: /\breply\s+back\b/gi,           fix: 'reply',                  msg: '"Reply" already implies returning — drop "back".' },
  { re: /\brevert\s+back\b/gi,          fix: 'revert',                 msg: '"Revert" already means going back.' },
  { re: /\breturn\s+back\b/gi,          fix: 'return',                 msg: '"Return" already means going back.' },
  { re: /\bregardless\s+to\b/gi,        fix: 'regardless of',          msg: '"Regardless of X".' },
  { re: /\bin\s+lieu\s+to\b/gi,         fix: 'in lieu of',             msg: '"In lieu of X" (= instead of).' },
  { re: /\bcapable\s+to\b/gi,           fix: 'capable of',             msg: '"Capable of doing X" — not "capable to do".' },
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

const CONTRACTION_RE = /\b(don't|doesn't|didn't|won't|can't|cannot|couldn't|shouldn't|wouldn't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|I'm|you're|we're|they're|he's|she's|it's|I've|you've|we've|they've|I'd|you'd|we'd|they'd|I'll|you'll|we'll|they'll)\b/gi

const FORMAL_FORMATS = new Set(['eng-letter-formal', 'eng-report', 'eng-article', 'eng-discursive'])

function detectContractions(text, formatId) {
  if (!formatId || !FORMAL_FORMATS.has(formatId)) return []
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

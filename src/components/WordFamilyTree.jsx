import { useState, useRef, useEffect, useMemo } from 'react'
import { Volume2, Plus, Check } from 'lucide-react'
import { speakWithBoundaries, hasSpeechSynthesis } from '../lib/speech'
import { layoutTree, bezierPath, POS_STYLE, POS_ORDER } from '../lib/wordFamilyLayout'
import useStore from '../store/useStore'
import DictionaryIcon from './DictionaryIcon'

// SVG canvas size — viewBox makes it responsive; the actual rendered
// size adapts to the page width. Centre placed at (250, 250) keeps the
// root visually centred with room for outermost labels to breathe.
const CANVAS = 500
const CENTRE = CANVAS / 2
const RADIUS = 175
const ROOT_R = 44
const NODE_R = 32

// Interactive radial tree visualisation for a single Malay root word
// and its imbuhan-derived forms.
//
// Design choices (UDL Principle 2 — Multiple Means of Representation):
// - Radial branching so the root is the visual anchor and forms read as
//   children at a glance — supports learners who think visually.
// - POS-coded paths + node borders (verbs=blue, nouns=green, adj=purple)
//   so the *shape* of a root's productivity is legible even before the
//   labels are read.
// - High-contrast paths via `var(--color-*)` tokens so the existing
//   `.contrast-high` overlay reskins it for WCAG-AAA mode for free.
// - No idle animations. The only motion is a brief pulsing ring on the
//   node being read aloud — explicit user-triggered, ADHD-safe.
// - Click any node to hear the word; speakWithBoundaries onStart/onEnd
//   gates the pulse so the visual stays locked to actual TTS playback.
export default function WordFamilyTree({ family }) {
  const [speakingId, setSpeakingId] = useState(null)
  const speakerRef = useRef(null)

  const addCard = useStore(s => s.addCard)
  const cards = useStore(s => s.cards)

  const addedWords = useMemo(() => {
    const set = new Set()
    for (const c of cards) if (c.t === 'Word Families') set.add(c.m)
    return set
  }, [cards])

  // Positions are pure functions of the form list — memo to avoid
  // recomputing every render. (Family changes are rare; this is mostly
  // a clarity win, not a perf one.)
  const nodes = useMemo(
    () => layoutTree(family.forms, { cx: CENTRE, cy: CENTRE, r: RADIUS }),
    [family.forms],
  )

  // Tear down any in-flight TTS when the tree unmounts or the family
  // switches — same pattern as Roleplay / CikguBot.
  useEffect(() => () => {
    try { speakerRef.current?.cancel?.() } catch { /* ignore */ }
    speakerRef.current = null
  }, [])

  const speakNode = (id, word) => {
    if (!hasSpeechSynthesis()) return
    try { speakerRef.current?.cancel?.() } catch { /* ignore */ }
    setSpeakingId(id)
    const finish = () => {
      speakerRef.current = null
      setSpeakingId(curr => (curr === id ? null : curr))
    }
    speakerRef.current = speakWithBoundaries({
      text: word,
      lang: 'ms-MY',
      rate: 0.85,
      onEnd: finish,
      onError: finish,
    })
  }

  const handleAdd = (form) => {
    if (addedWords.has(form.word)) return
    addCard({
      m: form.word,
      e: form.meaning,
      t: 'Word Families',
      p: form.pos,
      ex: `${form.word} (${form.type}) — from root "${family.root}"`,
      mn: '',
    })
  }

  // POS counts — drives the legend strip below the SVG so the student
  // can see "this root makes 4 verbs, 2 nouns, 1 adjective" at a glance.
  const counts = POS_ORDER.reduce((acc, pos) => {
    acc[pos] = family.forms.filter(f => f.pos === pos).length
    return acc
  }, { verb: 0, noun: 0, adj: 0 })

  return (
    <div className="rounded-2xl p-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      {/* POS legend — communicates the colour code before the eye hits the SVG */}
      <div className="flex items-center justify-center gap-3 mb-1 flex-wrap">
        {POS_ORDER.map(pos => counts[pos] > 0 && (
          <span key={pos} className="flex items-center gap-1.5 text-[10px] font-semibold">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: POS_STYLE[pos].color }} />
            <span style={{ color: POS_STYLE[pos].color }}>{POS_STYLE[pos].label}</span>
            <span style={{ color: 'var(--color-dim)' }}>×{counts[pos]}</span>
          </span>
        ))}
      </div>

      <div className="relative w-full" style={{ maxWidth: 520, margin: '0 auto' }}>
        <svg
          viewBox={`0 0 ${CANVAS} ${CANVAS}`}
          className="block w-full h-auto"
          role="img"
          aria-label={`Word family tree for root ${family.root}`}
        >
          {/* Paths first so nodes paint on top */}
          {nodes.map(({ form, x, y, cp1, cp2 }) => {
            const style = POS_STYLE[form.pos] || POS_STYLE.verb
            const active = speakingId === form.word
            return (
              <path
                key={`path-${form.word}`}
                d={bezierPath(CENTRE, CENTRE, { x, y, cp1, cp2 })}
                fill="none"
                stroke={style.color}
                strokeWidth={active ? 3 : 1.75}
                strokeOpacity={active ? 1 : 0.55}
                strokeLinecap="round"
              />
            )
          })}

          {/* Root node — clickable, speaks the root */}
          <g
            onClick={() => speakNode(family.root, family.root)}
            style={{ cursor: 'pointer' }}
            aria-label={`Speak root ${family.root}`}
          >
            <circle
              cx={CENTRE}
              cy={CENTRE}
              r={ROOT_R + (speakingId === family.root ? 6 : 0)}
              fill="var(--color-card2)"
              stroke="var(--color-accent)"
              strokeWidth={speakingId === family.root ? 4 : 2.5}
              className={speakingId === family.root ? 'animate-pulse' : ''}
            />
            <foreignObject
              x={CENTRE - ROOT_R + 4}
              y={CENTRE - ROOT_R + 4}
              width={(ROOT_R - 4) * 2}
              height={(ROOT_R - 4) * 2}
            >
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <DictionaryIcon word={family.root} meaning={family.meaning} size={40} />
              </div>
            </foreignObject>
            <text
              x={CENTRE}
              y={CENTRE + ROOT_R + 18}
              textAnchor="middle"
              fontSize="15"
              fontWeight="700"
              fill="var(--color-text)"
            >
              {family.root}
            </text>
            <text
              x={CENTRE}
              y={CENTRE + ROOT_R + 32}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-dim)"
            >
              {family.meaning}
            </text>
          </g>

          {/* Form nodes — each clickable to hear the derived word */}
          {nodes.map(({ form, x, y, angle }) => {
            const style = POS_STYLE[form.pos] || POS_STYLE.verb
            const active = speakingId === form.word
            const added = addedWords.has(form.word)
            // Push label OUTSIDE the node along the same radial vector so
            // labels never collide with the node circle. Sin/cos signs map
            // angle → which side of the node to anchor.
            const labelDx = Math.cos(angle) * (NODE_R + 6)
            const labelDy = Math.sin(angle) * (NODE_R + 6)
            const labelAnchor = Math.cos(angle) > 0.25 ? 'start' : Math.cos(angle) < -0.25 ? 'end' : 'middle'
            return (
              <g key={`node-${form.word}`}>
                <g onClick={() => speakNode(form.word, form.word)} style={{ cursor: 'pointer' }}>
                  <circle
                    cx={x}
                    cy={y}
                    r={NODE_R + (active ? 4 : 0)}
                    fill={style.soft}
                    stroke={style.color}
                    strokeWidth={active ? 3 : 2}
                    className={active ? 'animate-pulse' : ''}
                  />
                  <foreignObject
                    x={x - NODE_R + 4}
                    y={y - NODE_R + 4}
                    width={(NODE_R - 4) * 2}
                    height={(NODE_R - 4) * 2}
                  >
                    <div
                      xmlns="http://www.w3.org/1999/xhtml"
                      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <DictionaryIcon word={form.word} meaning={form.meaning} size={28} />
                    </div>
                  </foreignObject>
                  {/* Speaker affordance — small Volume2 icon in the node's lower-right */}
                  <circle cx={x + NODE_R * 0.65} cy={y + NODE_R * 0.65} r="9" fill={style.color} />
                  <foreignObject x={x + NODE_R * 0.65 - 7} y={y + NODE_R * 0.65 - 7} width="14" height="14">
                    <div
                      xmlns="http://www.w3.org/1999/xhtml"
                      style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
                    >
                      <Volume2 size={10} />
                    </div>
                  </foreignObject>
                </g>

                {/* Label — radial-outward */}
                <text
                  x={x + labelDx}
                  y={y + labelDy + 4}
                  textAnchor={labelAnchor}
                  fontSize="12"
                  fontWeight="700"
                  fill="var(--color-text)"
                >
                  {form.word}
                </text>
                <text
                  x={x + labelDx}
                  y={y + labelDy + 18}
                  textAnchor={labelAnchor}
                  fontSize="9"
                  fill={style.color}
                  fontFamily="monospace"
                >
                  {form.type}
                </text>

                {/* Add-to-deck affordance — top-right of the node circle */}
                <g
                  onClick={(e) => { e.stopPropagation(); handleAdd(form) }}
                  style={{ cursor: added ? 'default' : 'pointer' }}
                  aria-label={added ? `${form.word} already in deck` : `Add ${form.word} to flashcards`}
                >
                  <circle
                    cx={x - NODE_R * 0.65}
                    cy={y - NODE_R * 0.65}
                    r="9"
                    fill={added ? 'var(--color-green)' : 'var(--color-card)'}
                    stroke={added ? 'var(--color-green)' : style.color}
                    strokeWidth="1.5"
                  />
                  <foreignObject
                    x={x - NODE_R * 0.65 - 7}
                    y={y - NODE_R * 0.65 - 7}
                    width="14"
                    height="14"
                  >
                    <div
                      xmlns="http://www.w3.org/1999/xhtml"
                      style={{ color: added ? '#000' : style.color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
                    >
                      {added ? <Check size={10} /> : <Plus size={10} />}
                    </div>
                  </foreignObject>
                </g>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Form-detail strip — shows the meaning of the currently-speaking
          node (or of every form, condensed) below the SVG. Pure text,
          screen-reader-friendly, fills the accessibility gap that pure
          SVG labels can leave. */}
      <div className="mt-2 pt-2 border-t text-[11px] space-y-1" style={{ borderColor: 'var(--color-border)' }}>
        {family.forms.map(form => {
          const style = POS_STYLE[form.pos] || POS_STYLE.verb
          const active = speakingId === form.word
          return (
            <div
              key={form.word}
              className="flex items-center gap-2 px-2 py-1 rounded"
              style={{
                background: active ? style.soft : 'transparent',
                color: 'var(--color-text)',
              }}
            >
              <span className="font-bold" style={{ color: style.color, minWidth: 72 }}>{form.type}</span>
              <span className="font-bold">{form.word}</span>
              <span style={{ color: 'var(--color-dim)' }}>— {form.meaning}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

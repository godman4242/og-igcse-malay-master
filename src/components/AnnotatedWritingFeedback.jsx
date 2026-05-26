// Two-layer annotated writing feedback. Pure presentational component, lazy-
// imported from Writing.jsx, no store reads. See
// docs/2026-05-26-adaptive-scaffolding-design.md §5 for the contract.
//
// The pure helpers in src/lib/annotationView.js carry the testable logic; this
// file owns the rendering decisions only. React.memo wraps the export so a
// stable `data` ref from the parent avoids re-renders on unrelated state.

import { memo, useMemo, useState } from 'react'
import { Eye, EyeOff, RotateCcw, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import {
  scaffoldChipLabel,
  shouldHideRewriteByDefault,
  partitionSpansByActiveGroup,
  labelForCategory,
} from '../lib/annotationView.js'

// Unicode dingbat numbered circles, U+2776..U+277F (negative). Fall back to
// "(n)" past 10 — well above the v2 prompt's group cap.
const PILL_GLYPHS = ['❶', '❷', '❸', '❹', '❺', '❻', '❼', '❽', '❾', '❿']
function pillGlyph(n) {
  return PILL_GLYPHS[n - 1] || `(${n})`
}

function GroupPill({ id, size = 11 }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-full font-bold align-middle"
      style={{
        width: size + 6,
        height: size + 6,
        fontSize: size,
        lineHeight: 1,
        background: 'var(--color-annot-pill-bg)',
        color: 'var(--color-annot-pill-fg)',
        marginInline: 2,
      }}
    >
      {pillGlyph(id)}
    </span>
  )
}

function HighlightedSpan({ span, lang, suppressed }) {
  if (suppressed || span.groupId == null) {
    return <span>{span.text}</span>
  }
  const label = labelForCategory(span.category, lang)
  const note = span.note || ''
  return (
    <mark
      tabIndex={0}
      aria-label={`Group ${span.groupId}, ${label}${note ? ': ' + note : ''}`}
      title={note ? `${label}: ${note}` : label}
      style={{
        background: 'var(--color-annot-yellow)',
        color: 'inherit',
        padding: '0.05em 0.2em',
        borderRadius: 4,
        opacity: span.dimmed ? 0.35 : 1,
      }}
    >
      <GroupPill id={span.groupId} />
      <span>{span.text}</span>
      <GroupPill id={span.groupId} />
    </mark>
  )
}

function AnnotatedWritingFeedback({ data, lang = 'ms', onRetry }) {
  const [activeGroupId, setActiveGroupId] = useState(null)
  const [showRewrite, setShowRewrite] = useState(
    () => !shouldHideRewriteByDefault(data?.scaffoldLevelApplied),
  )

  const partitioned = useMemo(
    () => partitionSpansByActiveGroup(data?.studentText?.spans || [], activeGroupId),
    [data?.studentText?.spans, activeGroupId],
  )

  if (!data) return null

  const {
    band,
    overall,
    scaffoldLevelApplied,
    studentText,
    modelRewrite,
    strengths = [],
    fixes = [],
    nextStep,
  } = data

  const groups = studentText?.groups || []

  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-2xl font-extrabold leading-none" style={{ color: 'var(--color-accent)' }}>
            Band {band}
          </div>
          <span
            className="text-[11px] uppercase tracking-wide font-semibold px-2 py-1 rounded-full"
            style={{
              background: 'var(--color-card2)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            title="Scaffold tuned to your recent activity"
          >
            {scaffoldChipLabel(scaffoldLevelApplied)}
          </span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
            style={{
              background: 'var(--color-card2)',
              color: 'var(--color-dim)',
              border: '1px solid var(--color-border)',
            }}
            aria-label="Re-run AI feedback"
          >
            <RotateCcw size={12} /> Retry
          </button>
        )}
      </header>

      {overall && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
          {overall}
        </p>
      )}

      <section aria-labelledby="annot-your-writing">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h3
            id="annot-your-writing"
            className="text-[11px] uppercase tracking-wide font-semibold"
            style={{ color: 'var(--color-dim)' }}
          >
            Your writing
          </h3>
          <div className="flex gap-1" role="group" aria-label="Highlight filter">
            <FilterChip active={activeGroupId === null} onClick={() => setActiveGroupId(null)}>
              All
            </FilterChip>
            <FilterChip active={activeGroupId === 'none'} onClick={() => setActiveGroupId('none')}>
              None
            </FilterChip>
          </div>
        </div>
        <div
          className="rounded-xl p-3"
          style={{
            background: 'var(--color-card2)',
            border: '1px solid var(--color-border)',
            lineHeight: 1.8,
          }}
        >
          {partitioned.map((s, i) => (
            <HighlightedSpan key={i} span={s} lang={lang} suppressed={s.suppressed} />
          ))}
        </div>
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => setActiveGroupId(g.id)}
                aria-pressed={activeGroupId === g.id}
                className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{
                  background: activeGroupId === g.id ? 'var(--color-accent-subtle)' : 'var(--color-card2)',
                  color: 'var(--color-text)',
                  border: '1px solid ' + (activeGroupId === g.id ? 'var(--color-accent)' : 'var(--color-border)'),
                }}
              >
                <GroupPill id={g.id} size={10} />
                <span>{g.label || labelForCategory(g.category, lang)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {modelRewrite?.spans?.length > 0 && (
        <section aria-labelledby="annot-rewrite">
          <div className="flex items-center justify-between mb-2">
            <h3
              id="annot-rewrite"
              className="text-[11px] uppercase tracking-wide font-semibold"
              style={{ color: 'var(--color-dim)' }}
            >
              Model rewrite
            </h3>
            <button
              onClick={() => setShowRewrite(v => !v)}
              className="text-[11px] inline-flex items-center gap-1.5 px-2 py-1 rounded-lg"
              aria-expanded={showRewrite}
              style={{
                background: 'var(--color-card2)',
                color: 'var(--color-dim)',
                border: '1px solid var(--color-border)',
              }}
            >
              {showRewrite ? <EyeOff size={11} /> : <Eye size={11} />}
              {showRewrite ? 'Hide' : 'Show'}
            </button>
          </div>
          {showRewrite && (
            <div
              className="rounded-xl p-3 text-sm"
              style={{
                background: 'var(--color-card2)',
                border: '1px solid var(--color-border)',
                lineHeight: 1.8,
              }}
            >
              {modelRewrite.spans.map((s, i) =>
                s.isKey ? (
                  <mark
                    key={i}
                    title={s.lift || ''}
                    style={{
                      background: 'transparent',
                      color: 'var(--color-annot-rewrite-key)',
                      fontWeight: 700,
                    }}
                  >
                    {s.text}
                  </mark>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )}
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {strengths.length > 0 && (
          <FooterCard
            icon={<CheckCircle2 size={13} style={{ color: 'var(--color-annot-green)' }} />}
            title="Strengths"
          >
            <ul className="space-y-1 text-xs">
              {strengths.map((s, i) => (
                <li key={i} style={{ color: 'var(--color-text)' }}>· {s}</li>
              ))}
            </ul>
          </FooterCard>
        )}
        {fixes.length > 0 && (
          <FooterCard
            icon={<AlertCircle size={13} style={{ color: 'var(--color-annot-orange)' }} />}
            title="Fixes"
          >
            <ul className="space-y-1.5 text-xs">
              {fixes.map((f, i) => (
                <li key={i} style={{ color: 'var(--color-text)' }}>
                  {f.groupId != null && <GroupPill id={f.groupId} size={9} />}
                  <span className="font-semibold">{f.issue}</span>
                  <span style={{ color: 'var(--color-dim)' }}> — {f.fix}</span>
                </li>
              ))}
            </ul>
          </FooterCard>
        )}
        {nextStep && (
          <FooterCard
            icon={<ArrowRight size={13} style={{ color: 'var(--color-accent)' }} />}
            title="Next"
          >
            <p className="text-xs" style={{ color: 'var(--color-text)' }}>{nextStep}</p>
          </FooterCard>
        )}
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="text-[11px] px-2 py-1 rounded-md font-semibold"
      style={{
        background: active ? 'var(--color-accent)' : 'var(--color-card2)',
        color: active ? '#fff' : 'var(--color-dim)',
        border: '1px solid ' + (active ? 'var(--color-accent)' : 'var(--color-border)'),
      }}
    >
      {children}
    </button>
  )
}

function FooterCard({ icon, title, children }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'var(--color-card2)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h4 className="text-[11px] uppercase tracking-wide font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-dim)' }}>
        {icon} {title}
      </h4>
      {children}
    </div>
  )
}

export default memo(AnnotatedWritingFeedback)

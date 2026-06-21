import { Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import useStore from './store/useStore'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import { TheaterModeProvider } from './contexts/TheaterModeProvider'
import PWAUpdateToast from './components/PWAUpdateToast'
import AuthGuard from './components/AuthGuard'
import AuthModal from './components/AuthModal'
import { lazyWithRetry } from './lib/lazyWithRetry'

// Heavy / rarely-first-visit routes are split off the main bundle. Dashboard
// stays eager because every cold load lands on it. lazyWithRetry recovers a
// stale chunk (e.g. a tab open across a redeploy — this app ships on every
// build-loop commit) by reloading once instead of dumping the user on the
// ErrorBoundary. See src/lib/lazyWithRetry.js.
const Study = lazyWithRetry(() => import('./pages/Study'), 'Study')
const Roleplay = lazyWithRetry(() => import('./pages/Roleplay'), 'Roleplay')
const Grammar = lazyWithRetry(() => import('./pages/Grammar'), 'Grammar')
const Writing = lazyWithRetry(() => import('./pages/Writing'), 'Writing')
const Import = lazyWithRetry(() => import('./pages/Import'), 'Import')
const Settings = lazyWithRetry(() => import('./pages/Settings'), 'Settings')
const MistakeJournal = lazyWithRetry(() => import('./pages/MistakeJournal'), 'MistakeJournal')
const WordFamilies = lazyWithRetry(() => import('./pages/WordFamilies'), 'WordFamilies')
const CikguBot = lazyWithRetry(() => import('./pages/CikguBot'), 'CikguBot')
const Comprehension = lazyWithRetry(() => import('./pages/Comprehension'), 'Comprehension')
const PDFReader = lazyWithRetry(() => import('./pages/PDFReader'), 'PDFReader')
const Speaking = lazyWithRetry(() => import('./pages/Speaking'), 'Speaking')
const ExamRehearsal = lazyWithRetry(() => import('./pages/ExamRehearsal'), 'ExamRehearsal')
const Listening = lazyWithRetry(() => import('./pages/Listening'), 'Listening')
const Dictation = lazyWithRetry(() => import('./pages/Dictation'), 'Dictation')
const ClozeListening = lazyWithRetry(() => import('./pages/ClozeListening'), 'ClozeListening')
const SmartStudy = lazyWithRetry(() => import('./pages/SmartStudy'), 'SmartStudy')
const Practice = lazyWithRetry(() => import('./pages/Practice'), 'Practice')
const SavedWordCloze = lazyWithRetry(() => import('./pages/SavedWordCloze'), 'SavedWordCloze')
const ForYou = lazyWithRetry(() => import('./pages/ForYou'), 'ForYou')

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-dim)' }} />
    </div>
  )
}

// Phase 4 — page transitions. Keying the wrapper on location.pathname forces
// React to unmount/remount on navigation, which re-fires the .page-transition
// CSS keyframe. Wrapping INSIDE Suspense means the loading spinner doesn't
// animate — only the resolved route content does. See src/index.css and
// docs/sessions/2026-05-27-phase4-page-transitions.md for the framer-motion
// tradeoff write-up.
function AnimatedRoutes() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-transition">
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/study" element={<Study />} />
        <Route path="/roleplay" element={<Roleplay />} />
        <Route path="/grammar" element={<Grammar />} />
        <Route path="/writing" element={<Writing />} />
        <Route path="/import" element={<Import />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/mistakes" element={<MistakeJournal />} />
        <Route path="/word-families" element={<WordFamilies />} />
        <Route path="/cikgu" element={<CikguBot />} />
        <Route path="/comprehension" element={<Comprehension />} />
        <Route path="/pdf-reader" element={<PDFReader />} />
        <Route path="/speaking" element={<Speaking />} />
        <Route path="/exam-rehearsal" element={<ExamRehearsal />} />
        <Route path="/listening" element={<Listening />} />
        <Route path="/dictation" element={<Dictation />} />
        <Route path="/cloze-listening" element={<ClozeListening />} />
        <Route path="/smart-study" element={<SmartStudy />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/saved-cloze" element={<SavedWordCloze />} />
        <Route path="/for-you" element={<ForYou />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  )
}

export default function App() {
  const theme = useStore(s => s.theme)
  const dyslexicFont = useStore(s => s.dyslexicFont)
  const highContrast = useStore(s => s.highContrast)

  const rootClass = [
    theme === 'light' ? 'light' : '',
    dyslexicFont ? 'font-dyslexic' : '',
    highContrast ? 'contrast-high' : '',
  ].filter(Boolean).join(' ')

  return (
    // Re-anchor `color` on the themed wrapper so inherited text (bare headings
    // without an explicit color) re-resolves --color-text under the active
    // theme. Without this, `color` is anchored on <body> (outside this .light
    // subtree) and computes once to the dark token, leaving inherited text
    // near-white on light-mode card surfaces. Dark mode is unaffected.
    <div className={rootClass} style={{ color: 'var(--color-text)' }}>
      <AuthGuard>
      <TheaterModeProvider>
        <Layout>
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <AnimatedRoutes />
            </Suspense>
          </ErrorBoundary>
        </Layout>
        <ErrorBoundary>
          <PWAUpdateToast />
        </ErrorBoundary>
        <AuthModal />
      </TheaterModeProvider>
      </AuthGuard>
    </div>
  )
}

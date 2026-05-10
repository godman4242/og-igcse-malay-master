import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import useStore from './store/useStore'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import { TheaterModeProvider } from './contexts/TheaterModeProvider'

// Heavy / rarely-first-visit routes are split off the main bundle. Dashboard
// stays eager because every cold load lands on it.
const Study = lazy(() => import('./pages/Study'))
const Roleplay = lazy(() => import('./pages/Roleplay'))
const Grammar = lazy(() => import('./pages/Grammar'))
const Writing = lazy(() => import('./pages/Writing'))
const Import = lazy(() => import('./pages/Import'))
const Settings = lazy(() => import('./pages/Settings'))
const MistakeJournal = lazy(() => import('./pages/MistakeJournal'))
const WordFamilies = lazy(() => import('./pages/WordFamilies'))
const CikguBot = lazy(() => import('./pages/CikguBot'))
const Comprehension = lazy(() => import('./pages/Comprehension'))
const PDFReader = lazy(() => import('./pages/PDFReader'))
const Speaking = lazy(() => import('./pages/Speaking'))
const ExamRehearsal = lazy(() => import('./pages/ExamRehearsal'))
const Listening = lazy(() => import('./pages/Listening'))
const SmartStudy = lazy(() => import('./pages/SmartStudy'))

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-dim)' }} />
    </div>
  )
}

export default function App() {
  const theme = useStore(s => s.theme)

  return (
    <div className={theme === 'light' ? 'light' : ''}>
      <TheaterModeProvider>
        <Layout>
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
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
              <Route path="/smart-study" element={<SmartStudy />} />
              <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </Layout>
      </TheaterModeProvider>
    </div>
  )
}

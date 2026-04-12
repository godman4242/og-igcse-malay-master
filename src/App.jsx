import { Routes, Route, Navigate } from 'react-router-dom'
import useStore from './store/useStore'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import Study from './pages/Study'
import Roleplay from './pages/Roleplay'
import Grammar from './pages/Grammar'
import Writing from './pages/Writing'
import Import from './pages/Import'
import Settings from './pages/Settings'

export default function App() {
  const theme = useStore(s => s.theme)

  return (
    <div className={theme === 'light' ? 'light' : ''}>
      <Layout>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/study" element={<Study />} />
            <Route path="/roleplay" element={<Roleplay />} />
            <Route path="/grammar" element={<Grammar />} />
            <Route path="/writing" element={<Writing />} />
            <Route path="/import" element={<Import />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </ErrorBoundary>
      </Layout>
    </div>
  )
}

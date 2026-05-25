import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { Analytics } from '@vercel/analytics/react'

// Service-worker registration lives inside <App /> via
// `virtual:pwa-register/react`'s `useRegisterSW` hook — that gives us
// the update-toast lifecycle (`needRefresh` / `updateServiceWorker`)
// instead of a fire-and-forget `navigator.serviceWorker.register`.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Analytics />
    </BrowserRouter>
  </StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import { lazy, Suspense } from 'react'
import '@/index.css'

// Apply saved accent color on boot
const savedAccent = localStorage.getItem('commhub_accent_color');
if (savedAccent) {
  document.documentElement.style.setProperty('--accent', savedAccent);
  document.documentElement.style.setProperty('--ring', savedAccent);
  document.documentElement.style.setProperty('--primary', savedAccent);
}

const modboardEntry = location.hostname === 'modboard.ing' || /^\/modboard\/?$/.test(location.pathname)
const Modboard = lazy(() => import('@/pages/Modboard'))
ReactDOM.createRoot(document.getElementById('root')).render(
  modboardEntry ? <Suspense fallback={<p role="status">Opening Modboarding…</p>}><Modboard /></Suspense> : <App />
)

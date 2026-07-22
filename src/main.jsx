import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { applyExperiencePreferences } from '@/lib/experiencePreferences'

// Apply saved accent color on boot
const savedAccent = localStorage.getItem('commhub_accent_color');
if (savedAccent) {
  document.documentElement.style.setProperty('--accent', savedAccent);
  document.documentElement.style.setProperty('--ring', savedAccent);
  document.documentElement.style.setProperty('--primary', savedAccent);
}

applyExperiencePreferences()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

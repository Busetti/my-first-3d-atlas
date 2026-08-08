import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Voices load lazily in most browsers; touching the list early means the very
// first "Listen" tap already has a friendly voice to use.
window.speechSynthesis?.getVoices()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

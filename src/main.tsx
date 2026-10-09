import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'

// Offline support. With autoUpdate, a newly published version installs in the background
// and the page reloads itself onto it, so the live link never leaves anyone on an old
// build. A tab left open for a long session also checks hourly. Fails quietly where
// service workers are unavailable (the Tauri app, file://).
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration) setInterval(() => void registration.update(), 60 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
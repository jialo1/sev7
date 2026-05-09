import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './lib/supabase' // initialise le singleton Supabase au boot
import { router } from './router'
import './index.css'

// En dev, on désinscrit tout service worker qui traînerait d'une session
// précédente (PWA build) pour éviter qu'il serve un ancien bundle JS.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister())
  })
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

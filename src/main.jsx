import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Register service worker untuk PWA (dilakukan otomatis oleh vite-plugin-pwa)
// tapi kita bisa tambah listener untuk update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Cek update tersedia
    navigator.serviceWorker.ready.then(reg => {
      reg.addEventListener('updatefound', () => {
        console.log('[PWA] Update tersedia, mengunduh...')
      })
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

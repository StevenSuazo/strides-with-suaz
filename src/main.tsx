import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider'
import { LoginGate } from './auth/LoginGate'
import { createSupabaseAuth } from './auth/supabase'
import { registerServiceWorker } from './pwa/register'
import { SupabaseStorageProvider } from './storage/SupabaseStorageProvider'

const auth = createSupabaseAuth()

if (import.meta.env.DEV) {
  void import('./devTools').then((tools) => tools.installDevTools())
}

window.addEventListener('load', () => void registerServiceWorker())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider auth={auth}>
      <LoginGate>
        <SupabaseStorageProvider>
          <App />
        </SupabaseStorageProvider>
      </LoginGate>
    </AuthProvider>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSessionExpiredHandler } from './features/auth/sessionEvents'

// Expiración pasiva de sesión: un 401 del server (api()) emite el evento y
// este handler limpia el token y manda a /login. El logout explícito del
// usuario vive en Layout (useNavigate); este es el único mecanismo del 401.
registerSessionExpiredHandler()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

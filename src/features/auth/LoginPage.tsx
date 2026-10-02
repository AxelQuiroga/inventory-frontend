import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Button, Card, Input } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { authApi } from './authApi'
import { saveToken } from './tokenStore'
import styles from './LoginPage.module.css'

// Credenciales públicas del portafolio (vitrina de solo lectura). No son un
// secreto: se muestran a propósito. La password del admin jamás está acá.
const DEMO_EMAIL = 'demo@inventory.com'
const DEMO_PASSWORD = 'demo1234'
const COPIED_FEEDBACK_MS = 2000

// Autoría del portfolio (vitrina pública). La URL de GitHub es AxelQuiroga,
// verificada contra la API: los repos del portfolio viven en esa cuenta
// ("AlexQuiroga" existe pero está vacía — no apuntar ahí).
const AUTHOR_NAME = 'Sebastián Quiroga'
const AUTHOR_GITHUB_URL = 'https://github.com/AxelQuiroga'
const AUTHOR_LINKEDIN_URL = 'https://www.linkedin.com/in/sebasti%C3%A1n-quiroga-a273611a9/'
const TAGLINE = 'Inventario simple para tu negocio'

// Íconos de marca inline (sin dependencias). aria-hidden: el nombre visible
// del link es el texto accesible; el ícono es decorativo.
function GithubIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.authorIcon}>
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  )
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.authorIcon}>
      <path
        fill="currentColor"
        d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V5.169H2.542v8.225h2.401zm-1.2-9.347c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.539-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 9.347V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.215-1.183-3.247-2.759-3.247-1.287 0-1.852.708-2.17 1.205v.032h-.016v-1.07H7.551c.028.726 0 8.224 0 8.224h2.401z"
      />
    </svg>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimer.current !== null) clearTimeout(copiedTimer.current)
    }
  }, [])

  // El clipboard puede fallar en contexto no seguro (http:// sin localhost) o
  // sin permiso del usuario; por eso el valor del <code> sigue siendo
  // seleccionable a mano (user-select: all vive SOLO en el valor).
  async function handleCopyCredential(field: 'email' | 'password') {
    const value = field === 'email' ? DEMO_EMAIL : DEMO_PASSWORD
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      return
    }
    setCopiedField(field)
    if (copiedTimer.current !== null) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopiedField(null), COPIED_FEEDBACK_MS)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { token } = await authApi.login({ email, password })
      saveToken(token)
      navigate('/products')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        {/* Columna izquierda: branding de la vitrina. La marca del login es la
            misma del sidebar (Inventory ERP) — coherencia de identidad. */}
        <section className={styles.brand} aria-label="Acerca del sistema">
          <div className={styles.brandIdentity}>
            <img src="/logoinventario.png" alt="" className={styles.brandLogo} />
            <span className={styles.brandName}>Inventory ERP</span>
          </div>
          <p className={styles.tagline}>{TAGLINE}</p>
        </section>

        <Card>
          <h1 className={styles.title}>Iniciar sesión</h1>

          {/* Cuenta pública del portfolio: la password es demo1234 a propósito
              (cuenta de solo lectura para explorar el sistema sin pedir datos).
              NO es un secreto — es la vitrina. La del admin jamás se muestra. */}
          <aside className={styles.demoPanel} aria-label="Cuenta de demostración">
            <p className={styles.demoTitle}>Cuenta de demostración</p>
            <div className={styles.demoCredential}>
              <span className={styles.demoCredentialLabel}>email</span>
              <code className={styles.demoCredentialValue}>{DEMO_EMAIL}</code>
              <button
                type="button"
                className={styles.demoCopyButton}
                aria-label="Copiar email de demostración"
                onClick={() => handleCopyCredential('email')}
              >
                {copiedField === 'email' ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
            <div className={styles.demoCredential}>
              <span className={styles.demoCredentialLabel}>password</span>
              <code className={styles.demoCredentialValue}>{DEMO_PASSWORD}</code>
              <button
                type="button"
                className={styles.demoCopyButton}
                aria-label="Copiar contraseña de demostración"
                onClick={() => handleCopyCredential('password')}
              >
                {copiedField === 'password' ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
            <p className={styles.demoNote}>Solo lectura — podés explorar sin modificar nada.</p>
          </aside>

          <form onSubmit={handleSubmit} className={styles.form}>
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
            />

            <Input
              id="password"
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={submitting}
            />

            {error && <Alert tone="error">{error}</Alert>}

            <Button type="submit" loading={submitting}>
              Iniciar sesión
            </Button>
          </form>
        </Card>

        {/* Autoría "a un costado": logo + nombre, cada uno clickeable a su
            perfil. En desktop vive bajo el branding (columna izquierda); en
            mobile baja debajo de la card. */}
        <footer className={styles.author} aria-label="Autor del proyecto">
          <p className={styles.authorLabel}>Desarrollado por</p>
          <a
            href={AUTHOR_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.authorLink}
          >
            <GithubIcon />
            AxelQuiroga
          </a>
          <a
            href={AUTHOR_LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.authorLink}
          >
            <LinkedinIcon />
            {AUTHOR_NAME}
          </a>
        </footer>
      </div>
    </div>
  )
}
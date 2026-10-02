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
    </div>
  )
}

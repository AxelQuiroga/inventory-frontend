import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Button, Card, Input } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { authApi } from './authApi'
import { saveToken } from './tokenStore'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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

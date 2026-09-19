import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '../../shared/api/api'
import { authApi } from './authApi'
import { saveToken } from './tokenStore'

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
    <form onSubmit={handleSubmit}>
      <h1>Iniciar sesión</h1>

      <label htmlFor="email">Email</label>
      <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

      <label htmlFor="password">Contraseña</label>
      <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

      {error && (
        <p role="alert" style={{ color: 'red' }}>{error}</p>
      )}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Ingresando...' : 'Iniciar sesión'}
      </button>
    </form>
  )
}

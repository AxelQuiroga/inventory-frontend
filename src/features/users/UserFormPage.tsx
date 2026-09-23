import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Alert, Badge, Button, Card, Input, PageHeader } from '../../shared/ui'
import { ApiError } from '../../shared/api/api'
import { usersApi, type ManagedUser } from './usersApi'
import { generatePassword } from './password'
import './users-page.css'

type FieldErrors = Record<string, string | null>

function extractFieldErrors(error: unknown): FieldErrors | null {
  if (!(error instanceof ApiError) || !error.fieldErrors) return null
  const result: FieldErrors = {}
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    result[field] = messages[0] ?? null
  }
  return result
}

const emptyForm = {
  name: '',
  email: '',
  role: 'OPERATOR' as 'OPERATOR' | 'VIEWER',
  password: '',
}

// Creación de usuario interno (USERS_POLICY.MD): rol OPERATOR | VIEWER. La
// contraseña se muestra en claro UNA sola vez; el backend la guarda hasheada
// (bcrypt) y nunca la devuelve: si se pierde, se desactiva y se crea otro.
export function UserFormPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  // Credenciales recién creadas: SOLO en memoria del componente. Al navegar
  // fuera se pierden (nada persiste la password por diseño).
  const [created, setCreated] = useState<{ user: ManagedUser; password: string } | null>(null)
  const inFlight = useRef(false)

  function set(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (inFlight.current) return
    inFlight.current = true

    setError(null)
    setFieldErrors({})
    setSubmitting(true)

    try {
      const user = await usersApi.create({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password,
      })
      // La pantalla de credenciales usa la password enviada (el server nunca
      // la devuelve). Se conserva en memoria hasta navegar.
      setCreated({ user, password: form.password })
    } catch (err) {
      const fields = extractFieldErrors(err)
      if (fields) setFieldErrors(fields)
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  // Pantalla única de credenciales: se ve inmediatamente después de crear.
  if (created) {
    const { user, password } = created
    return (
      <>
        <PageHeader title="Usuario creado" description="Guardá estas credenciales ahora" />

        <Card className="UserForm-card">
          <Alert tone="success">
            El usuario <strong>{user.name}</strong> se creó correctamente.
          </Alert>

          <dl className="UserForm-creds">
            <div className="UserForm-credsItem">
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="UserForm-credsItem">
              <dt>Rol</dt>
              <dd>{user.role === 'OPERATOR' ? 'Operador' : 'Lector'}</dd>
            </div>
            <div className="UserForm-credsItem UserForm-credsItem--password">
              <dt>
                Contraseña
                <Badge tone="warning">Una sola vez</Badge>
              </dt>
              <dd className="UserForm-credsPassword">{password}</dd>
            </div>
          </dl>

          <p className="UserForm-notice">
            Esta contraseña <strong>no se puede volver a ver</strong> al cerrar esta pantalla: el
            sistema la guarda cifrada de forma irreversible. Si la perdés, desactivá la cuenta y
            creá otra.
          </p>

          <div className="UserForm-actions">
            <Button onClick={() => navigate('/users')}>Listo, volver a usuarios</Button>
          </div>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Nuevo usuario"
        description="Cuenta interna de OPERATOR o VIEWER (el ADMIN único no se crea desde acá)"
      />

      <Card className="UserForm-card">
        <form onSubmit={handleSubmit} className="UserForm-form" noValidate>
          <fieldset className="UserForm-fieldset">
            <legend className="UserForm-legend">Datos de la cuenta</legend>
            <div className="UserForm-grid">
              <Input
                id="name"
                label="Nombre"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                error={fieldErrors.name ?? undefined}
                required
              />

              <Input
                id="email"
                label="Email (es el usuario de login)"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                error={fieldErrors.email ?? undefined}
                required
              />

              <div>
                <label className="Input-label" htmlFor="role">Rol</label>
                <select
                  id="role"
                  className="Input-field"
                  value={form.role}
                  onChange={(e) => set('role', e.target.value)}
                >
                  <option value="OPERATOR">Operador — registra stock y ventas</option>
                  <option value="VIEWER">Lector — solo ve información</option>
                </select>
                <p className="Input-helper">Solo OPERATOR y VIEWER: el ADMIN no se crea por este flujo.</p>
              </div>

              <div>
                <div className="UserForm-passwordRow">
                  <Input
                    id="password"
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    minLength={6}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    error={fieldErrors.password ?? undefined}
                    required
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => set('password', generatePassword())}
                  >
                    Generar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </Button>
                </div>
                <p className="Input-helper">
                  Generá una segura o usá el botón: sin caracteres ambiguos (0, O, 1, l).
                </p>
              </div>
            </div>
          </fieldset>

          {error && <Alert tone="error">{error}</Alert>}

          <div className="UserForm-actions">
            <Button type="submit" loading={submitting}>
              Crear usuario
            </Button>
            <Link to="/users">
              <Button variant="ghost">Cancelar</Button>
            </Link>
          </div>
        </form>
      </Card>
    </>
  )
}
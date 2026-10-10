import { ErrorPage } from './ErrorPage'

export function ForbiddenPage() {
  return (
    <ErrorPage
      code="403"
      title="No tenés permisos para entrar acá"
      description="Tu rol no tiene acceso a esta sección. Si creés que deberías poder ingresar, consultá con una persona administradora."
      actionLabel="Volver al inicio"
    />
  )
}

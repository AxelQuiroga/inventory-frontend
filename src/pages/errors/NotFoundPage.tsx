import { ErrorPage } from './ErrorPage'

export function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      title="No encontramos esa página"
      description="La dirección puede estar mal escrita o la página ya no existir. Podés volver al inicio y seguir desde ahí."
      actionLabel="Ir al inicio"
    />
  )
}

import { http, HttpResponse } from 'msw'
import type { SetupWorker } from 'msw/browser'

// Contratos según el backend real (auth-routes + auth-controller):
//   POST /auth/login → 200 { token } | 401 { message } | 400 { message, errors }
type LoginHandler = Parameters<SetupWorker['use']>[0]

export const loginHandlers: LoginHandler[] = [
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }

    if (body.email === 'admin@inventory.com' && body.password === 'admin123') {
      return HttpResponse.json({ token: 'jwt-de-prueba' }, { status: 200 })
    }
    // El backend valida email y password>=6 (zod). La validación nativa del
    // navegador ya cubre el formato de email, así que el contrato 400 se
    // ejercita con una password corta que la pasa pero falla en el server.
    if (body.password === '123') {
      return HttpResponse.json(
        { message: 'Invalid data', errors: { fieldErrors: { password: ['Password must be at least 6 characters'] } } },
        { status: 400 },
      )
    }
    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }),
]

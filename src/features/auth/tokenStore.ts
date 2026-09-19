// Persistencia del JWT de sesión. Módulo mínimo y testeable: el resto de
// la app nunca toca localStorage directamente, solo pasa por acá.
const TOKEN_KEY = 'inventory_token'

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

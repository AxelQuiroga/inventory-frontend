import type { BadgeProps } from '../../shared/ui'

// Nombres visibles de cada rol. Coinciden con los del alta de usuarios
// (OPERATOR = Operador, VIEWER = Lector) y suman el ADMIN, que no se gestiona
// desde la UI pero sí aparece en la sesión.
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  OPERATOR: 'Operador',
  VIEWER: 'Lector',
}

// Tono del badge por rol: azul = administración, neutro = operativo diario,
// ámbar = solo lectura. El color no reemplaza al texto: lo refuerza.
const ROLE_TONES: Record<string, BadgeProps['tone']> = {
  ADMIN: 'info',
  OPERATOR: 'neutral',
  VIEWER: 'warning',
}

// Rol desconocido (token manipulado/versión nueva): se muestra el valor crudo
// en vez de una etiqueta vacía, para no dejar el badge en blanco.
export function roleLabel(role: string | undefined): string {
  if (!role) return ''
  return ROLE_LABELS[role] ?? role
}

export function roleTone(role: string | undefined): BadgeProps['tone'] {
  if (!role) return 'neutral'
  return ROLE_TONES[role] ?? 'neutral'
}

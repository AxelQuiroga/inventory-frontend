// Generador de contraseñas fuertes para usuarios internos (USERS_POLICY.MD).
// Separado del componente: el export rompe el fast refresh de UserFormPage
// y además es testeable de forma aislada.

// Juegos de caracteres SIN ambiguos (0/O, 1/l/I): la persona va a leer la
// contraseña de la pantalla y tipearla a mano en el login.
const CHARACTER_CLASSES = [
  'ABCDEFGHJKMNPQRSTUVWXYZ', // sin I ni O
  'abcdefghjkmnpqrstuvwxyz', // sin l ni o
  '23456789', // sin 0 ni 1
  '!@#$%^&*_-+=?',
]

function randomCharFrom(charset: string): string {
  // crypto.getRandomValues es la fuente correcta; en entornos sin crypto
  // (tests muy viejos) cae a Math.random sin romper el contrato.
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint32Array(1)
    crypto.getRandomValues(bytes)
    return charset[bytes[0] % charset.length] ?? ''
  }
  return charset[Math.floor(Math.random() * charset.length)] ?? ''
}

// Password fuerte legible: garantiza una mayúscula, una minúscula, un dígito
// y un símbolo, sin caracteres ambiguos, y mezcla el resto (Fisher-Yates).
export function generatePassword(length = 14): string {
  const parts = CHARACTER_CLASSES.map((set) => randomCharFrom(set))
  for (let i = parts.length; i < length; i += 1) {
    parts.push(randomCharFrom(CHARACTER_CLASSES[i % CHARACTER_CLASSES.length] ?? CHARACTER_CLASSES[0]!))
  }
  for (let i = parts.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[parts[i], parts[j]] = [parts[j]!, parts[i]!]
  }
  return parts.join('')
}
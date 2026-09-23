import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getSessionUser } from './session'
import { getToken, saveToken } from './tokenStore'

// Helper: arma el payload de un JWT como lo firma jsonwebtoken (base64url:
// '-' por '+', '_' por '/', sin padding '='). Un token con bytes altos o con
// múltiplo de 3 genera caracteres que atob() crudo NO entiende.
function base64Url(json: unknown): string {
  const standard = btoa(JSON.stringify(json))
  return standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function tokenFor(payload: object): string {
  return `header.${base64Url(payload)}.firma`
}

const EXP_FUTURE = Math.floor(Date.now() / 1000) + 3600
const EXP_PAST = Math.floor(Date.now() / 1000) - 3600

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('getSessionUser — decode base64url (el atob crudo falla con tokens reales)', () => {
  it('lee el usuario de un payload base64url sin padding (formato real de firmas JWT)', () => {
    saveToken(tokenFor({ email: 'seb@inventory.com', role: 'ADMIN', exp: EXP_FUTURE }))

    expect(getToken()).toBeTruthy()
    expect(getSessionUser()).toEqual({ email: 'seb@inventory.com', role: 'ADMIN' })
  })

  it('soporta tokens cuyo payload base64url contiene "-" y "_"', () => {
    // "naïve@mail.com" en UTF-8 genera bytes altos → base64url con guiones.
    const payload = { email: 'naïve@mail.com', role: 'VIEWER', exp: EXP_FUTURE }
    const header = { alg: 'HS256', typ: 'JWT' }
    saveToken(`${base64Url(header)}.${base64Url(payload)}.firma`)

    expect(getSessionUser()?.email).toBe('naïve@mail.com')
    expect(getSessionUser()?.role).toBe('VIEWER')
  })

  it('token o payload corrupto devuelve null (sin excepción)', () => {
    saveToken('no-es-un-jwt')
    expect(getSessionUser()).toBeNull()

    saveToken('a.b.c')
    expect(getSessionUser()).toBeNull()
  })
})

describe('getSessionUser — expiración (exp)', () => {
  it('token sin exp: la sesión es válida (payload mínimo del contrato)', () => {
    saveToken(tokenFor({ email: 'a@b.c', role: 'OPERATOR' }))
    expect(getSessionUser()).toEqual({ email: 'a@b.c', role: 'OPERATOR' })
  })

  it('token con exp en el futuro: sesión válida', () => {
    saveToken(tokenFor({ email: 'a@b.c', role: 'OPERATOR', exp: EXP_FUTURE }))
    expect(getSessionUser()).not.toBeNull()
  })

  it('token con exp en el pasado: sesión expirada → null (el server la rechazaría igual)', () => {
    saveToken(tokenFor({ email: 'a@b.c', role: 'OPERATOR', exp: EXP_PAST }))
    expect(getSessionUser()).toBeNull()
  })

  it('payload sin email (ignorado por getSessionUser) sigue siendo inválido', () => {
    saveToken(tokenFor({ role: 'ADMIN', exp: EXP_FUTURE }))
    expect(getSessionUser()).toBeNull()
  })
})
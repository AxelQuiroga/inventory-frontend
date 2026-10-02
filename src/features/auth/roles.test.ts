import { describe, it, expect } from 'vitest'

import { roleLabel, roleTone } from './roles'

describe('roles — etiquetas y tonos del badge', () => {
  it('mapea cada rol a su etiqueta visible', () => {
    expect(roleLabel('ADMIN')).toBe('Admin')
    expect(roleLabel('OPERATOR')).toBe('Operador')
    expect(roleLabel('VIEWER')).toBe('Lector')
  })

  it('cae al valor crudo para un rol desconocido y a vacío cuando no hay rol', () => {
    expect(roleLabel('SUPERVISOR')).toBe('SUPERVISOR')
    expect(roleLabel(undefined)).toBe('')
  })

  it('asigna un tono por rol', () => {
    expect(roleTone('ADMIN')).toBe('info')
    expect(roleTone('OPERATOR')).toBe('neutral')
    expect(roleTone('VIEWER')).toBe('warning')
    expect(roleTone(undefined)).toBe('neutral')
  })
})

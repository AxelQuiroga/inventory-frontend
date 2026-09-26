import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('deshabilita Anterior en la primera página', () => {
    render(<Pagination page={1} total={5} pageSize={20} onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  })

  it('deshabilita Siguiente cuando el total no supera la página actual completa', () => {
    render(<Pagination page={1} total={20} pageSize={20} onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  it('habilita Siguiente cuando el total supera la página actual', () => {
    render(<Pagination page={1} total={21} pageSize={20} onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  })

  it('propaga el cambio de página con el número correcto', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={2} total={45} pageSize={20} onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(onPageChange).toHaveBeenCalledWith(1)

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('anuncia la página actual a lectores de pantalla (aria-live)', () => {
    render(<Pagination page={2} total={45} pageSize={20} onPageChange={vi.fn()} />)

    expect(screen.getByText('Página 2')).toHaveAttribute('aria-live', 'polite')
  })

  it('es una navegación accesible con nombre', () => {
    render(<Pagination page={1} total={5} pageSize={20} onPageChange={vi.fn()} />)

    expect(screen.getByRole('navigation', { name: 'Paginación' })).toBeInTheDocument()
  })
})
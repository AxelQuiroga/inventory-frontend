import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { Textarea } from './Textarea'

describe('Textarea', () => {
  it('asocia label y textarea mediante htmlFor/id', () => {
    render(<Textarea id="description" label="Descripción" value="" onChange={() => {}} />)

    expect(screen.getByLabelText('Descripción')).toBeInTheDocument()
    expect(screen.getByLabelText('Descripción').tagName).toBe('TEXTAREA')
  })

  it('propaga value y onChange al textarea nativo', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Textarea id="description" label="Descripción" value="Hola" onChange={onChange} />)

    const textarea = screen.getByLabelText('Descripción')
    expect(textarea).toHaveValue('Hola')

    await user.type(textarea, ' mundo')
    expect(onChange).toHaveBeenCalledTimes(6)
  })

  it('disabled deshabilita el campo', () => {
    render(<Textarea id="description" label="Descripción" value="" onChange={() => {}} disabled />)

    expect(screen.getByLabelText('Descripción')).toBeDisabled()
  })

  it('helper se asocia al campo por aria-describedby', () => {
    render(
      <Textarea id="description" label="Descripción" helper="Opcional" value="" onChange={() => {}} />,
    )

    expect(screen.getByText('Opcional')).toBeInTheDocument()
    expect(screen.getByLabelText('Descripción')).toHaveAccessibleDescription('Opcional')
  })

  it('error pinta estado inválido y gana sobre helper', () => {
    render(
      <Textarea
        id="description"
        label="Descripción"
        error="Qué pasha"
        helper="No se muestra con error"
        value=""
        onChange={() => {}}
      />,
    )

    const textarea = screen.getByLabelText('Descripción')
    expect(textarea).toBeInvalid()
    expect(textarea).toHaveAccessibleDescription('Qué pasha')
    expect(screen.queryByText('No se muestra con error')).not.toBeInTheDocument()
  })
})
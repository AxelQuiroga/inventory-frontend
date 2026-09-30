import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { Select } from './Select'

describe('Select', () => {
  it('asocia label y select mediante htmlFor/id', () => {
    render(
      <Select id="type" label="Tipo" value="" onChange={() => {}}>
        <option value="">Todos</option>
        <option value="IN">Entrada</option>
      </Select>,
    )

    expect(screen.getByLabelText('Tipo')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Entrada' })).toBeInTheDocument()
  })

  it('propaga value y onChange al select nativo', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Select id="type" label="Tipo" value="IN" onChange={onChange}>
        <option value="">Todos</option>
        <option value="IN">Entrada</option>
        <option value="OUT">Salida</option>
      </Select>,
    )

    const select = screen.getByLabelText('Tipo')
    expect(select).toHaveValue('IN')

    await user.selectOptions(select, ['OUT'])
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('disabled deshabilita el campo', () => {
    render(
      <Select id="type" label="Tipo" value="" onChange={() => {}} disabled>
        <option value="">Todos</option>
      </Select>,
    )

    expect(screen.getByLabelText('Tipo')).toBeDisabled()
  })

  it('helper se asocia al campo por aria-describedby', () => {
    render(
      <Select id="type" label="Tipo" helper="Solo dos opciones" value="" onChange={() => {}}>
        <option value="">Todos</option>
      </Select>,
    )

    expect(screen.getByText('Solo dos opciones')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo')).toHaveAccessibleDescription('Solo dos opciones')
  })

  it('error pinta estado inválido y gana sobre helper', () => {
    render(
      <Select
        id="type"
        label="Tipo"
        error="Elegí un tipo"
        helper="No se muestra con error"
        value=""
        onChange={() => {}}
      >
        <option value="">Todos</option>
      </Select>,
    )

    const select = screen.getByLabelText('Tipo')
    expect(select).toBeInvalid()
    expect(select).toHaveAccessibleDescription('Elegí un tipo')
    expect(screen.queryByText('No se muestra con error')).not.toBeInTheDocument()
  })
})
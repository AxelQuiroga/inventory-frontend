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
})
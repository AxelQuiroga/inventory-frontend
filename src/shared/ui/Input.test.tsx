import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import { Input, type InputProps } from './Input'

// Spec del PROTOCOLO de props del design system (el mismo que Select y
// Textarea siguen por construcción):
//   - el componente gobierna 'id' | 'className' | 'aria-invalid' | 'aria-describedby'
//   - {...rest} va ANTES del className gobernado, así ninguna prop del caller
//     puede pisar el estilo ni la asociación de error/helper.
// Estas aserciones existen para que un futuro refactor que revierta el orden
// del spread o el Omit<> falle acá y no en producción.

describe('Input — protocolo de props', () => {
  it('asocia label e input por htmlFor/id (el id del caller es el que manda)', () => {
    render(<Input id="sku" label="SKU" value="" onChange={() => {}} />)

    const label = screen.getByText('SKU')
    expect(label).toHaveAttribute('for', 'sku')
    expect(screen.getByLabelText('SKU')).toHaveAttribute('id', 'sku')
  })

  it('error tiene PRECEDENCIA sobre helper en aria-describedby', () => {
    render(
      <Input
        id="sku"
        label="SKU"
        value=""
        onChange={() => {}}
        helper="Identificador único"
        error="SKU is required"
      />,
    )

    const input = screen.getByLabelText('SKU')
    expect(input).toHaveAttribute('aria-describedby', 'sku-error')
    expect(input).toHaveAccessibleDescription('SKU is required')
    // El helper no se renderiza (ni se anuncia) mientras hay error
    expect(screen.queryByText('Identificador único')).not.toBeInTheDocument()
  })

  it('sin error, aria-describedby apunta al helper', () => {
    render(
      <Input id="sku" label="SKU" value="" onChange={() => {}} helper="Identificador único" />,
    )

    const input = screen.getByLabelText('SKU')
    expect(input).toHaveAttribute('aria-describedby', 'sku-helper')
    expect(input).not.toBeInvalid()
  })

  it('una prop REST sin tipar (maxLength/placeholder) llega al input nativo', () => {
    render(
      <Input
        id="name"
        label="Nombre"
        maxLength={120}
        placeholder="Ej: Lijadora"
        value=""
        onChange={() => {}}
      />,
    )

    const input = screen.getByLabelText('Nombre')
    expect(input).toHaveAttribute('maxlength', '120')
    expect(input).toHaveAttribute('placeholder', 'Ej: Lijadora')
  })

  it('un className colado por cast NO pisa la clase del design system', () => {
    // className está en el Omit<> de InputProps; un caller con tipado laxo (o un
    // `...rest` sin filtrar en un wrapper) igual puede colarlo. Si el spread
    // quedara DESPUÉS del className gobernado, esto rompería el estilo.
    const props = {
      id: 'name',
      label: 'Nombre',
      value: '',
      onChange: () => {},
      className: 'smuggled',
      'aria-describedby': 'mentira',
    } as unknown as InputProps

    render(<Input {...props} />)

    const input = screen.getByLabelText('Nombre')
    expect(input).toHaveClass('Input-field')
    expect(input).not.toHaveClass('smuggled')
    // Tampoco puede pisar la asociación de error/helper (no hay ninguno)
    expect(input).not.toHaveAttribute('aria-describedby')
  })

  it('hideLabel oculta el label visualmente pero conserva el nombre accesible', () => {
    render(<Input id="qty" label="Cantidad" hideLabel value="" onChange={() => {}} />)

    const label = screen.getByText('Cantidad')
    expect(label).toHaveClass('Input-label--srOnly')
    // Sigue siendo alcanzable por getByLabelText: el nombre accesible no se pierde
    const input = screen.getByLabelText('Cantidad')
    expect(input).toBeInTheDocument()
  })

  it('propaga value y onChange en circuito controlado real', async () => {
    const user = userEvent.setup()

    // Input controlado de verdad (value + onChange ligado a state): un spy
    // estático no probaría nada, porque React revierte el DOM si el state no
    // avanza. Si el componente no reenviara el value/evento, el DOM no avanzaría.
    function Controlled() {
      const [value, setValue] = useState('')
      return (
        <Input
          id="qty"
          label="Cantidad"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )
    }

    render(<Controlled />)

    const input = screen.getByLabelText('Cantidad')
    expect(input).toHaveValue('')

    await user.type(input, '12')
    expect(input).toHaveValue('12')
  })
})

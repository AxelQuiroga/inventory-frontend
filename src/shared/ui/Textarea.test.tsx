import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import { Textarea, type TextareaProps } from './Textarea'

describe('Textarea', () => {
  it('asocia label y textarea mediante htmlFor/id', () => {
    render(<Textarea id="description" label="Descripción" value="" onChange={() => {}} />)

    expect(screen.getByLabelText('Descripción')).toBeInTheDocument()
    expect(screen.getByLabelText('Descripción').tagName).toBe('TEXTAREA')
  })

  it('propaga value y onChange en circuito controlado real', async () => {
    const user = userEvent.setup()

    // Textarea controlado de verdad (value + onChange ligado a state): si el
    // componente no reenviara los eventos o el value, el DOM no avanzaría.
    function Controlled() {
      const [value, setValue] = useState('Hola')
      return (
        <Textarea
          id="description"
          label="Descripción"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )
    }

    render(<Controlled />)

    const textarea = screen.getByLabelText('Descripción')
    expect(textarea).toHaveValue('Hola')

    await user.type(textarea, ' mundo')
    expect(textarea).toHaveValue('Hola mundo')
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

  it('una prop REST sin tipar (maxLength/rows) llega al textarea nativo', () => {
    render(
      <Textarea
        id="description"
        label="Descripción"
        maxLength={500}
        rows={4}
        value=""
        onChange={() => {}}
      />,
    )

    const textarea = screen.getByLabelText('Descripción')
    expect(textarea.tagName).toBe('TEXTAREA')
    expect(textarea).toHaveAttribute('maxlength', '500')
    expect(textarea).toHaveAttribute('rows', '4')
  })

  it('un className colado por cast NO pisa la clase del design system', () => {
    // className está en el Omit<> de TextareaProps. Si el {...rest} quedara
    // DESPUÉS del className gobernado, este colado rompería el estilo.
    const { container: limpio } = render(
      <Textarea id="description" label="Descripción" value="" onChange={() => {}} />,
    )
    const classNameEsperada = limpio.querySelector('textarea')?.className

    const props = {
      id: 'description',
      label: 'Descripción',
      value: '',
      onChange: () => {},
      className: 'smuggled',
    } as unknown as TextareaProps

    const { container } = render(<Textarea {...props} />)

    const textarea = container.querySelector('textarea')
    expect(textarea).not.toBeNull()
    expect(textarea).not.toHaveClass('smuggled')
    // El colado no cambió NADA: la clase real del módulo sigue intacta
    expect(textarea?.className).toBe(classNameEsperada)
  })
})

import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('asocia label y checkbox mediante htmlFor/id', () => {
    render(<Checkbox id="lowStock" label="Solo stock bajo" checked={false} onChange={() => {}} />)

    expect(screen.getByLabelText('Solo stock bajo')).toBeInTheDocument()
  })

  it('refleja checked y propaga el toggle en circuito controlado real', async () => {
    const user = userEvent.setup()

    // Checkbox controlado de verdad (checked + onChange ligado a state): si el
    // componente no reenviara el evento, el estado no haría toggle.
    function Controlled() {
      const [checked, setChecked] = useState(false)
      return (
        <Checkbox
          id="lowStock"
          label="Solo stock bajo"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
      )
    }

    render(<Controlled />)

    const checkbox = screen.getByLabelText('Solo stock bajo')
    expect(checkbox).not.toBeChecked()

    await user.click(checkbox)
    expect(checkbox).toBeChecked()

    await user.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('aplica className extra al wrapper SIN perder la clase del design system', () => {
    // Sin className: esta es la clase que impone el módulo del design system.
    const { container: base } = render(
      <Checkbox id="lowStock" label="Solo stock bajo" checked={false} onChange={() => {}} />,
    )
    const claseDelDesignSystem = base.querySelector('div')?.className
    expect(claseDelDesignSystem).toBeTruthy()

    const { container } = render(
      <Checkbox id="lowStock" label="Solo stock bajo" checked={false} onChange={() => {}} className="extra" />,
    )

    const wrapper = container.querySelector('.extra')
    expect(wrapper).not.toBeNull()
    expect(wrapper?.querySelector('input')).not.toBeNull()
    // Fusión, no reemplazo: la clase del módulo + la del caller
    expect(wrapper?.className).toBe(`${claseDelDesignSystem} extra`)
  })

  it('una prop REST sin tipar (name/required) llega al checkbox nativo', () => {
    render(
      <Checkbox
        id="lowStock"
        label="Solo stock bajo"
        name="lowStock"
        required
        checked={false}
        onChange={() => {}}
      />,
    )

    const checkbox = screen.getByLabelText('Solo stock bajo')
    expect(checkbox).toHaveAttribute('name', 'lowStock')
    expect(checkbox).toBeRequired()
    expect(checkbox).toHaveAttribute('type', 'checkbox')
  })

  it('disabled no dispara onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox id="lowStock" label="Solo stock bajo" checked={false} onChange={onChange} disabled />)

    const checkbox = screen.getByLabelText('Solo stock bajo')
    expect(checkbox).toBeDisabled()

    await user.click(checkbox)
    expect(onChange).not.toHaveBeenCalled()
  })
})

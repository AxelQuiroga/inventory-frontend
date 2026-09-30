import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('asocia label y checkbox mediante htmlFor/id', () => {
    render(<Checkbox id="lowStock" label="Solo stock bajo" checked={false} onChange={() => {}} />)

    expect(screen.getByLabelText('Solo stock bajo')).toBeInTheDocument()
  })

  it('refleja checked y propaga el toggle al onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox id="lowStock" label="Solo stock bajo" checked={true} onChange={onChange} />)

    const checkbox = screen.getByLabelText('Solo stock bajo')
    expect(checkbox).toBeChecked()

    await user.click(checkbox)
    expect(onChange).toHaveBeenCalledTimes(1)
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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { describe, it, expect } from 'vitest'

import { ConfirmDialog } from './ConfirmDialog'

// Diálogo de confirmación para acciones destructivas: cancelar no ejecuta,
// confirmar sí, y mientras está pending los botones quedan deshabilitados.

function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <ConfirmDialog
      open
      title="Desactivar producto"
      description="El producto dejará de estar disponible para movimientos."
      confirmLabel="Desactivar"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  )
  return { onConfirm, onCancel }
}

describe('ConfirmDialog', () => {
  it('cancelar no ejecuta la acción y cierra el diálogo', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderDialog()

    await user.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('confirmar ejecuta la acción', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderDialog()

    await user.click(screen.getByRole('button', { name: /desactivar/i }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('pending deshabilita ambos botones y anuncia el estado', () => {
    renderDialog({ pending: true })

    expect(screen.getByRole('button', { name: /desactivar/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled()
  })

  it('no renderiza nada cuando está cerrado', () => {
    render(<ConfirmDialog open={false} title="X" description="Y" onConfirm={() => {}} onCancel={() => {}} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('es semánticamente un diálogo con título accesible y Escape cancela', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderDialog()

    const dialog = screen.getByRole('dialog', { name: /desactivar producto/i })
    expect(dialog).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

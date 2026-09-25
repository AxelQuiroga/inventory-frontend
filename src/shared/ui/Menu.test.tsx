import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, it, expect, vi } from 'vitest'

import { Menu } from './index'

function renderMenu(overrides: { disabled?: boolean } = {}) {
  return render(
    <MemoryRouter>
      <div>
        <Menu buttonLabel="Acciones de Martillo" disabled={overrides.disabled}>
          <Menu.Item to="/products/1/history">Ver historial</Menu.Item>
          <Menu.Item onSelect={() => {}}>Entrada</Menu.Item>
          <Menu.Item onSelect={() => {}}>Salida</Menu.Item>
        </Menu>
        <button type="button">Elemento externo</button>
      </div>
    </MemoryRouter>,
  )
}

function itemsInMenu(): HTMLElement[] {
  return within(screen.getByRole('menu')).getAllByRole('menuitem')
}

describe('Menu', () => {
  it('cerrado: el trigger declara aria-expanded=false y no hay menú en el DOM', () => {
    renderMenu()

    const trigger = screen.getByRole('button', { name: /acciones de martillo/i })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('abre al hacer click y enfoca el primer item', async () => {
    const user = userEvent.setup()
    renderMenu()

    const trigger = screen.getByRole('button', { name: /acciones de martillo/i })
    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(itemsInMenu()).toHaveLength(3)
    expect(itemsInMenu()[0]).toHaveFocus()
  })

  it('Escape cierra el menú y devuelve el foco al trigger', async () => {
    const user = userEvent.setup()
    renderMenu()
    const trigger = screen.getByRole('button', { name: /acciones de martillo/i })

    await user.click(trigger)
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('un click fuera del menú lo cierra', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.click(screen.getByRole('button', { name: /acciones de martillo/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Elemento externo' }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('ArrowDown/ArrowUp/Home/End mueven el foco entre items', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(screen.getByRole('button', { name: /acciones de martillo/i }))

    const items = itemsInMenu()

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(items[1]).toHaveFocus()

    fireEvent.keyDown(document.activeElement!, { key: 'End' })
    expect(items[2]).toHaveFocus()

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' })
    expect(items[1]).toHaveFocus()

    fireEvent.keyDown(document.activeElement!, { key: 'Home' })
    expect(items[0]).toHaveFocus()
  })

  it('seleccionar un item llama onSelect, cierra y restaura el foco', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <MemoryRouter>
        <Menu buttonLabel="Acciones">
          <Menu.Item onSelect={onSelect}>Entrada</Menu.Item>
        </Menu>
      </MemoryRouter>,
    )

    const trigger = screen.getByRole('button', { name: 'Acciones' })
    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'Entrada' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('un item con `to` es un link con el href correcto', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(screen.getByRole('button', { name: /acciones de martillo/i }))

    const linkItem = screen.getByRole('menuitem', { name: 'Ver historial' })
    expect(linkItem.tagName).toBe('A')
    expect(linkItem).toHaveAttribute('href', '/products/1/history')
  })

  it('trigger disabled no abre el menú', async () => {
    const user = userEvent.setup()
    renderMenu({ disabled: true })

    const trigger = screen.getByRole('button', { name: /acciones de martillo/i })
    expect(trigger).toBeDisabled()

    await user.click(trigger)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
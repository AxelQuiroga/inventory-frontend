import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

export interface MenuItemProps {
  children: React.ReactNode
  onSelect?: () => void
  // Item de navegación: renderiza un Link. Sin `to`, es un botón de acción.
  to?: string
  danger?: boolean
  disabled?: boolean
}

export interface MenuProps {
  // Nombre accesible del trigger (aria-label): la feature describe el
  // contexto (ej: "Acciones de Martillo").
  buttonLabel: string
  children: React.ReactNode
  disabled?: boolean
}

// Menú de acciones por fila (patrón ⋮): trigger con aria-haspopup/expanded y
// panel role=menu con items. El panel se posiciona con position:fixed relativo
// al viewport (getBoundingClientRect del trigger) con flip vertical/horizontal
// si no entra — así sobrevive al overflow-x del wrapper de las tablas, que
// recortaría un position:absolute.
const PANEL_GAP = 4
const VIEWPORT_MARGIN = 8

// close siempre devuelve focus al trigger (restoreFocus=true): el patrón de
// teclado requiere que el foco vuelva a su origen tras cerrar un menú.
const MenuContext = createContext<(() => void) | null>(null)

export function MenuItem({ children, onSelect, to, danger = false, disabled = false }: MenuItemProps) {
  const closeMenu = useContext(MenuContext)

  function handleSelect(event: React.MouseEvent<HTMLElement>) {
    if (disabled) {
      event.preventDefault()
      return
    }
    onSelect?.()
    closeMenu?.()
  }

  const className = `Menu-item${danger ? ' Menu-item--danger' : ''}`

  if (to) {
    return (
      <Link to={to} role="menuitem" className={className} aria-disabled={disabled || undefined} onClick={handleSelect}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" role="menuitem" className={className} disabled={disabled} onClick={handleSelect}>
      {children}
    </button>
  )
}

export function Menu({ buttonLabel, children, disabled = false }: MenuProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  // Posicionar el panel (flip vertical/horizontal contra el viewport).
  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const panel = panelRef.current
    if (!trigger || !panel) return

    const rect = trigger.getBoundingClientRect()
    const panelWidth = panel.offsetWidth || 200
    const panelHeight = panel.offsetHeight || 160

    let top = rect.bottom + PANEL_GAP
    if (top + panelHeight > window.innerHeight - VIEWPORT_MARGIN) {
      top = Math.max(VIEWPORT_MARGIN, rect.top - panelHeight - PANEL_GAP)
    }

    let left = rect.right - panelWidth
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - panelWidth - VIEWPORT_MARGIN))

    setPos({ top, left })
  }, [open])

  // Mientras el menú está abierto: foco al primer item, navegación con
  // flechas/Home/End, y cierre por Escape (restaura foco), click fuera,
  // scroll (capture: cubre el scroll interno de las tablas) y resize.
  useEffect(() => {
    if (!open) return

    panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()

    function items(): HTMLElement[] {
      return Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        close(true)
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return

      const list = items()
      if (list.length === 0) return
      const index = list.indexOf(document.activeElement as HTMLElement)
      let next: number
      if (event.key === 'Home') {
        next = 0
      } else if (event.key === 'End') {
        next = list.length - 1
      } else if (event.key === 'ArrowDown') {
        next = index === -1 ? 0 : (index + 1) % list.length
      } else {
        next = index === -1 ? list.length - 1 : (index - 1 + list.length) % list.length
      }
      event.preventDefault()
      list[next]!.focus()
    }

    function onPointerDown(event: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onScroll() {
      setOpen(false)
    }

    function onResize() {
      setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, close])

  return (
    <MenuContext.Provider value={() => close(true)}>
      <div className="Menu" ref={wrapperRef}>
        <button
          ref={triggerRef}
          type="button"
          className="Menu-trigger"
          aria-label={buttonLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
        >
          ⋮
        </button>
        {open && (
          <div
            id={panelId}
            ref={panelRef}
            role="menu"
            className="Menu-panel"
            style={{ top: pos.top, left: pos.left }}
          >
            {children}
          </div>
        )}
      </div>
    </MenuContext.Provider>
  )
}
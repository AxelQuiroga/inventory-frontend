import { useEffect, useRef } from 'react'
import { Button } from './Button'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// ConfirmDialog del design system para acciones destructivas: evita la acción
// inmediata accidental, permite cancelar y mantiene los botones fuera de
// servicio mientras la operación está en curso (pending). El foco entra por
// "Cancelar" (la opción segura) y Escape cancela.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // El foco entra por el primer botón (Cancelar, la opción segura).
    backdropRef.current?.querySelector('button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, pending, onCancel])

  if (!open) return null

  return (
    <div ref={backdropRef} className="ConfirmDialog-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="ConfirmDialog"
      >
        <h2 id="confirm-dialog-title" className="ConfirmDialog-title">{title}</h2>
        {description && <p className="ConfirmDialog-description">{description}</p>}
        <div className="ConfirmDialog-actions">
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

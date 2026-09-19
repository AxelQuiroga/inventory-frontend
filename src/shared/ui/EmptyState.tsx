export interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
}

// EmptyState del design system: estado vacío de colecciones, con acción
// opcional (no asume que siempre hay un botón).
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="EmptyState">
      <h3 className="EmptyState-title">{title}</h3>
      {description && <p className="EmptyState-description">{description}</p>}
      {action}
    </div>
  )
}

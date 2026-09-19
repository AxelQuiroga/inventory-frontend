export interface BadgeProps {
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  children: React.ReactNode
}

// Badge del design system: representa el estado; el texto lo aporta la
// feature (Activo, Stock bajo, etc.).
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={`Badge Badge--${tone}`}>{children}</span>
}

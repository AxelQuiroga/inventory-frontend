export interface AlertProps {
  tone?: 'info' | 'success' | 'warning' | 'error'
  children: React.ReactNode
}

// Alert del design system: mensajes de contexto. El tone error usa
// role=alert (anunciado por lectores de pantalla); los demás son regiones.
export function Alert({ tone = 'info', children }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`Alert Alert--${tone}`}
    >
      {children}
    </div>
  )
}

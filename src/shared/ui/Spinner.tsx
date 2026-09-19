export interface SpinnerProps {
  label?: string
  size?: 'small' | 'medium'
}

// Spinner accesible: role=status con nombre cuando se pasa label.
// El label vacío (uso dentro de Button) no anuncia nada extra.
export function Spinner({ label = 'Cargando', size = 'medium' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label || undefined} className={`Spinner Spinner--${size}`}>
      <span className="Spinner-circle" aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  )
}

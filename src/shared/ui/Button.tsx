import { Spinner } from './Spinner'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  loading?: boolean
}

// Button del design system: variantes + estado loading (deshabilita el botón
// y anuncia el estado via role=status para evitar doble submit).
export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`Button Button--${variant}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner size="small" label="" />}
      {children}
    </button>
  )
}

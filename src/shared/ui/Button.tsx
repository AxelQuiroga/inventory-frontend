import { Spinner } from './Spinner'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  loading?: boolean
}

// Button del design system: variantes + estado loading (deshabilita el botón
// y anuncia el estado via role=status para evitar doble submit).
//
// Button SÍ acepta className del caller (extensión legítima de layout), pero
// las clases del design system no se pueden perder: className sale del spread
// (queda destructureado arriba) y se fusiona explícitamente DESPUÉS del
// {...rest}. Con el orden inverso (`className` en el JSX y luego {...rest})
// un `<Button className="...">` —hoy ningún caller lo pasa— borraba
// "Button Button--<variant>" y dejaba el botón sin estilo (mismo bug que Card).
export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      {...rest}
      className={['Button', `Button--${variant}`, className].filter(Boolean).join(' ') || undefined}
    >
      {loading && <Spinner size="small" label="" />}
      {children}
    </button>
  )
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

// Card del design system: contenedor neutral para cualquier contenido.
export function Card({ children, ...rest }: CardProps) {
  return (
    <div className="Card" {...rest}>
      {children}
    </div>
  )
}

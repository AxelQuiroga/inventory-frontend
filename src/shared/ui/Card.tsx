export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

// Card del design system: contenedor neutral para cualquier contenido.
//
// Card SÍ acepta className del caller (extensión legítima de layout), pero la
// clase "Card" del design system no se puede perder: el spread va PRIMERO y
// la clase del design system se fusiona explícitamente DESPUÉS. Con el orden
// inverso, `<Card className={styles.card}>` reemplazaba la caja de ui.css y
// el producto se veía sin fondo ni borde (bug Round-2, 7 call sites vivos).
export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div {...rest} className={['Card', className].filter(Boolean).join(' ') || undefined}>
      {children}
    </div>
  )
}

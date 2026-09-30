import styles from './Checkbox.module.css'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> {
  id: string
  label: string
  /** Clase extra para el wrapper: útil para ajustar la alineación en
   *  contextos como filas de filtros (el input en sí lleva el estilo del
   *  design system vía módulo). */
  className?: string
}

// Checkbox del design system: checkbox nativo estilizado, con label asociado
// por htmlFor/id (el label nunca es opcional: el nombre accesible es parte
// del contrato del componente, igual que en Input/Select/Textarea).
export function Checkbox({ id, label, className, ...rest }: CheckboxProps) {
  return (
    <div className={`${styles.wrapper}${className ? ` ${className}` : ''}`}>
      <input id={id} type="checkbox" className={styles.input} {...rest} />
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
    </div>
  )
}
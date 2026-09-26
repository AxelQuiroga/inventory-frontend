import styles from './Select.module.css'

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id: string
  label: string
}

// Select del design system: label asociado por htmlFor/id (mismo contrato de
// accesibilidad que Input); las <option> son hijos nativos para que la
// feature declare exactamente sus opciones.
export function Select({ id, label, ...rest }: SelectProps) {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select id={id} className={styles.select} {...rest} />
    </div>
  )
}
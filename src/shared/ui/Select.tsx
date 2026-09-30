import styles from './Select.module.css'

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id: string
  label: string
  /** Mensaje de validación: borde en danger, aria-invalid y aria-describedby. */
  error?: string
  /** Texto de apoyo (se oculta si hay error): se asocia por aria-describedby. */
  helper?: string
}

// Select del design system: label asociado por htmlFor/id (mismo contrato de
// accesibilidad que Input), error/helper vía aria-describedby; las <option>
// son hijos nativos para que la feature declare exactamente sus opciones.
export function Select({ id, label, error, helper, ...rest }: SelectProps) {
  const describedBy = error ? `${id}-error` : helper ? `${id}-helper` : undefined

  return (
    <div className={`${styles.wrapper}${error ? ` ${styles.wrapperError}` : ''}`}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={styles.select}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      )}
      {!error && helper && (
        <p id={`${id}-helper`} className={styles.helper}>
          {helper}
        </p>
      )}
    </div>
  )
}
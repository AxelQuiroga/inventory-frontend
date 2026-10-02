import styles from './Textarea.module.css'

export interface TextareaProps
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    // className y aria-invalid/describedby los gobierna el componente: si
    // pasaran por el spread podrían pisar el estilo del design system y la
    // asociación de error/helper (bug latente heredado de Input/Select).
    'id' | 'className' | 'aria-invalid' | 'aria-describedby'
  > {
  id: string
  label: string
  error?: string
  helper?: string
  /** Oculta el label visualmente (sr-only): mismo contrato que Input. Nunca
   *  omitir concordancia label/aria. */
  hideLabel?: boolean
}

// Textarea del design system: gemelo de Input con el mismo protocolo de
// accesibilidad (label htmlFor/id, error y helper via aria-describedby).
export function Textarea({ id, label, error, helper, hideLabel, ...rest }: TextareaProps) {
  const describedBy = error ? `${id}-error` : helper ? `${id}-helper` : undefined

  return (
    <div className={`${styles.wrapper}${error ? ` ${styles.wrapperError}` : ''}`}>
      <label className={`${styles.label}${hideLabel ? ` ${styles.labelSrOnly}` : ''}`} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        {...rest}
        className={styles.field}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
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

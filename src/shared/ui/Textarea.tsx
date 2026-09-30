import styles from './Textarea.module.css'

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
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
    <div className={`Input-wrapper${error ? ' Input--error' : ''}`}>
      <label className={`Input-label${hideLabel ? ' Input-label--srOnly' : ''}`} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={styles.field}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="Input-error">
          {error}
        </p>
      )}
      {!error && helper && (
        <p id={`${id}-helper`} className="Input-helper">
          {helper}
        </p>
      )}
    </div>
  )
}
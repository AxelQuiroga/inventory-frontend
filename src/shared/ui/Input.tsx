export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  error?: string
  helper?: string
  /** Oculta el label visualmente (sr-only): útil para inputs inline donde el
   *  nombre accesible es obligatorio pero un label visible rompería el layout
   *  (ej: cantidad en una fila de venta). Nunca omitir concordancia label/aria. */
  hideLabel?: boolean
}

// Input del design system: label obligatoriamente asociado (htmlFor/id),
// error y helper anexados via aria-describedby para lectores de pantalla.
export function Input({ id, label, error, helper, hideLabel, ...rest }: InputProps) {
  const describedBy = error ? `${id}-error` : helper ? `${id}-helper` : undefined

  return (
    <div className={`Input-wrapper${error ? ' Input--error' : ''}`}>
      <label className={`Input-label${hideLabel ? ' Input-label--srOnly' : ''}`} htmlFor={id}>
        {label}
      </label>
      <input id={id} className="Input-field" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest} />
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

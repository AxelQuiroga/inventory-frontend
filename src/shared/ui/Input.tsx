export interface InputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    // className y aria-invalid/describedby los gobierna el componente: si
    // pasaran por el spread podrían pisar el estilo del design system y la
    // asociación de error/helper (ver review adversarial 2026-09-30).
    'id' | 'className' | 'aria-invalid' | 'aria-describedby'
  > {
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
      <input
        id={id}
        {...rest}
        className="Input-field"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
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

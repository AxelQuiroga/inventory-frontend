export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  error?: string
  helper?: string
}

// Input del design system: label obligatoriamente asociado (htmlFor/id),
// error y helper anexados via aria-describedby para lectores de pantalla.
export function Input({ id, label, error, helper, ...rest }: InputProps) {
  const describedBy = error ? `${id}-error` : helper ? `${id}-helper` : undefined

  return (
    <div className={`Input-wrapper${error ? ' Input--error' : ''}`}>
      <label className="Input-label" htmlFor={id}>
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

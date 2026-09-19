export interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

// PageHeader del design system: encabezado estándar de página del ERP.
// El contenido lo aporta cada feature; el componente solo estructura.
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="PageHeader">
      <div>
        <h1 className="PageHeader-title">{title}</h1>
        {description && <p className="PageHeader-description">{description}</p>}
      </div>
      {action}
    </header>
  )
}

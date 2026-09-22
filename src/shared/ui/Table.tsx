export interface TableProps {
  children: React.ReactNode
}

// Tabla semántica del design system: HTML nativo (table/thead/tbody) dentro
// de un wrapper con scroll horizontal para pantallas angostas.
// El namespace <Table.Head>/<Table.Row>... se compone en el barrel (index.ts)
// para mantener este archivo libre de exports no-componente (fast refresh).
export function TableBase({ children }: TableProps) {
  return (
    <div className="Table-wrapper">
      <table>{children}</table>
    </div>
  )
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}

export function TableRow({ children }: { children: React.ReactNode }) {
  return <tr>{children}</tr>
}

export function TableTh({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  // Mismo contrato que TableTd: un header numérico se alinea con sus celdas.
  return (
    <th scope="col" className={align === 'right' ? 'Table--align-right' : undefined}>
      {children}
    </th>
  )
}

export function TableTd({
  children,
  align,
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return <td className={align === 'right' ? 'Table--align-right' : undefined}>{children}</td>
}

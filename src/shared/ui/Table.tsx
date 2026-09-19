export interface TableProps {
  children: React.ReactNode
}

// Tabla semántica del design system: HTML nativo (table/thead/tbody) dentro
// de un wrapper con scroll horizontal para pantallas angostas.
// Los subcomponentes viven en el propio Table: <Table.Head>, <Table.Row>...
function TableBase({ children }: TableProps) {
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

export function TableTh({ children }: { children: React.ReactNode }) {
  return <th scope="col">{children}</th>
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

export const Table = Object.assign(TableBase, {
  Head: TableHead,
  Body: TableBody,
  Row: TableRow,
  Th: TableTh,
  Td: TableTd,
})

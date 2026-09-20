export { Button, type ButtonProps } from './Button'
export { Input, type InputProps } from './Input'
export { Card, type CardProps } from './Card'
export { Badge, type BadgeProps } from './Badge'
export { Alert, type AlertProps } from './Alert'
import { TableBase, TableHead, TableBody, TableRow, TableTh, TableTd } from './Table'

// Namespace <Table.Head>/<Table.Row>... compuesto aquí: el archivo del
// componente queda solo con exports de componentes (fast refresh).
export const Table = Object.assign(TableBase, {
  Head: TableHead,
  Body: TableBody,
  Row: TableRow,
  Th: TableTh,
  Td: TableTd,
})
export type { TableProps } from './Table'
export { EmptyState, type EmptyStateProps } from './EmptyState'
export { Spinner, type SpinnerProps } from './Spinner'
export { PageHeader, type PageHeaderProps } from './PageHeader'

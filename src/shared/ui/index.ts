export { Button, type ButtonProps } from './Button'
export { Input, type InputProps } from './Input'
export { Select, type SelectProps } from './Select'
export { Pagination, type PaginationProps } from './Pagination'
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
export { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog'
import { Menu as MenuBase, MenuItem } from './Menu'

// Namespace <Menu.Item> compuesto aquí (mismo patrón que Table): el archivo
// del componente queda solo con exports de componentes (fast refresh).
export const Menu = Object.assign(MenuBase, { Item: MenuItem })
export type { MenuProps, MenuItemProps } from './Menu'

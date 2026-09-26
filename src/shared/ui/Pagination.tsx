import { Button } from './Button'
import styles from './Pagination.module.css'

export interface PaginationProps {
  page: number
  /** Total exacto del contrato paginado (data/total): "Siguiente" se decide
   *  con el total real, no adivinando por tamaño de página. */
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

// Paginación del design system: dos botones + indicador de página (aria-live
// para lectores). La feature decide los labels? No: idioma y semántica fijos,
// la feature solo provee estado y navegación.
export function Pagination({ page, total, pageSize, onPageChange }: PaginationProps) {
  const hasNext = page * pageSize < total

  return (
    <nav className={styles.pagination} aria-label="Paginación">
      <Button variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        Anterior
      </Button>
      <span className={styles.indicator} aria-live="polite">
        Página {page}
      </span>
      <Button variant="secondary" onClick={() => onPageChange(page + 1)} disabled={!hasNext}>
        Siguiente
      </Button>
    </nav>
  )
}
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { describe, it, expect } from 'vitest'

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Spinner,
  Table,
} from './index'

describe('Button', () => {
  it('ejecuta la acción al hacer click', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Guardar</Button>)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('respeta el type submit', () => {
    render(<Button type="submit">Enviar</Button>)
    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveAttribute('type', 'submit')
  })

  it('disabled no ejecuta la acción', async () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Guardar
      </Button>,
    )

    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('loading deshabilita el botón y anuncia el estado', () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} loading>
        Guardar
      </Button>,
    )

    const button = screen.getByRole('button', { name: /guardar/i })
    expect(button).toBeDisabled()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('fusiona el className del caller SIN perder la clase del design system', () => {
    // Regresión: con `className` en el JSX antes de {...rest}, el className del
    // caller pisaba "Button Button--primary" y el botón quedaba sin estilo.
    render(<Button className="extra">Guardar</Button>)

    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button).toHaveClass('Button')
    expect(button).toHaveClass('Button--primary')
    expect(button).toHaveClass('extra')
  })

  it('respeta la variante y la combina con el className del caller', () => {
    render(
      <Button variant="danger" className="extra">
        Borrar
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Borrar' })
    expect(button).toHaveClass('Button--danger')
    expect(button).toHaveClass('extra')
  })
})

describe('Input', () => {
  it('asocia label e input mediante htmlFor/id', () => {
    render(<Input id="email" label="Email" value="" onChange={() => {}} />)

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('muestra el error asociado al campo (aria-describedby)', () => {
    render(
      <Input id="email" label="Email" value="" onChange={() => {}} error="Email inválido" />,
    )

    const input = screen.getByLabelText('Email')
    expect(input).toBeInvalid()
    expect(input).toHaveAccessibleDescription('Email inválido')
  })

  it('muestra el helper text cuando no hay error', () => {
    render(
      <Input id="sku" label="SKU" value="" onChange={() => {}} helper="Identificador único" />,
    )

    expect(screen.getByLabelText('SKU')).toHaveAccessibleDescription('Identificador único')
  })

  it('soporta type, placeholder, required y disabled', () => {
    render(
      <Input
        id="price"
        label="Precio"
        type="number"
        placeholder="0.00"
        required
        disabled
        value=""
        onChange={() => {}}
      />,
    )

    const input = screen.getByLabelText('Precio')
    expect(input).toHaveAttribute('type', 'number')
    expect(input).toHaveAttribute('placeholder', '0.00')
    expect(input).toBeRequired()
    expect(input).toBeDisabled()
  })
})

describe('Card', () => {
  it('renderiza su contenido como región identificable', () => {
    render(
      <Card>
        <p>contenido interno</p>
      </Card>,
    )

    expect(screen.getByText('contenido interno')).toBeInTheDocument()
  })

  it('fusiona el className del caller SIN perder la clase del design system', () => {
    // Regresión (bug Round-2): `<Card className={styles.card}>` reemplazaba la
    // caja de ui.css y el producto se veía sin fondo ni borde.
    render(
      <Card className="extra" data-testid="card">
        <p>contenido interno</p>
      </Card>,
    )

    const card = screen.getByTestId('card')
    expect(card.className).toContain('Card')
    expect(card.className).toContain('extra')
    expect(card).toHaveClass('Card')
    expect(card).toHaveClass('extra')
  })
})

describe('Badge', () => {
  it('renderiza el texto que la feature decide mostrar', () => {
    render(<Badge tone="success">Activo</Badge>)
    expect(screen.getByText('Activo')).toBeInTheDocument()
  })

  it('no asume contenido: cualquier tone acepta cualquier texto', () => {
    render(<Badge tone="danger">Stock bajo</Badge>)
    expect(screen.getByText('Stock bajo')).toBeInTheDocument()
  })
})

describe('Alert', () => {
  it('error es un alert accesible con su mensaje', () => {
    render(<Alert tone="error">Credenciales inválidas</Alert>)

    expect(screen.getByRole('alert')).toHaveTextContent('Credenciales inválidas')
  })

  it('info/success/warning renderizan el mensaje', () => {
    render(<Alert tone="info">Todo bien</Alert>)
    expect(screen.getByText('Todo bien')).toBeInTheDocument()
  })
})

describe('Table', () => {
  it('mantiene la estructura semántica de tabla', () => {
    render(
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.Th>SKU</Table.Th>
            <Table.Th>Stock</Table.Th>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Td>MAR-1</Table.Td>
            <Table.Td align="right">10</Table.Td>
          </Table.Row>
        </Table.Body>
      </Table>,
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'SKU' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'MAR-1' })).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('muestra título y descripción', () => {
    render(
      <EmptyState title="No hay productos" description="Creá el primero para empezar" />,
    )

    expect(screen.getByText('No hay productos')).toBeInTheDocument()
    expect(screen.getByText('Creá el primero para empezar')).toBeInTheDocument()
  })

  it('renderiza la acción opcional cuando se pasa', () => {
    render(
      <EmptyState
        title="No hay productos"
        action={<Button>Nuevo producto</Button>}
      />,
    )

    expect(screen.getByRole('button', { name: 'Nuevo producto' })).toBeInTheDocument()
  })

  it('sin acción no renderiza un botón vacío', () => {
    render(<EmptyState title="Sin datos" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('Spinner', () => {
  it('es un estado de carga accesible con nombre', () => {
    render(<Spinner label="Cargando productos" />)

    expect(screen.getByRole('status')).toHaveAccessibleName('Cargando productos')
  })
})

describe('PageHeader', () => {
  it('renderiza título y acciones', () => {
    render(
      <PageHeader title="Productos" action={<Button>Nuevo producto</Button>} />,
    )

    expect(screen.getByRole('heading', { name: 'Productos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nuevo producto' })).toBeInTheDocument()
  })

  it('renderiza la descripción opcional', () => {
    render(
      <PageHeader title="Productos" description="Gestioná el inventario" />,
    )
    expect(screen.getByText('Gestioná el inventario')).toBeInTheDocument()
  })
})

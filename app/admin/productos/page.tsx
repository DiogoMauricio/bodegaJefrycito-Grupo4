'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Power, PowerOff } from 'lucide-react'
import { useStore } from '@/lib/store'
import type { Product } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import { PageHeader } from '@/components/admin/page-header'
import { ProductFormDialog } from '@/components/admin/product-form-dialog'
import { ProductThumb } from '@/components/product-thumb'
import {
  ProductStatusBadge,
} from '@/components/status-badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function ProductsPage() {
  const { products, getStock, setProductStatus } = useStore()
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | undefined>(undefined)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.category.toLowerCase().includes(q),
    )
  }, [products, query])

  function openNew() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setFormOpen(true)
  }

  function toggleStatus(product: Product) {
    const next = product.status === 'activo' ? 'inactivo' : 'activo'
    setProductStatus(product.id, next)
    toast.success(
      next === 'inactivo'
        ? `"${product.name}" dado de baja (inactivo). No estará disponible para nuevas ventas.`
        : `"${product.name}" reactivado.`,
    )
  }

  return (
    <div>
      <PageHeader
        hu="HU-02 / HU-03"
        title="Productos"
        description="Registra nuevos productos maestro y gestiona su información comercial y estado. El stock no se edita desde aquí: se controla mediante entradas, ventas y ajustes."
        action={
          <Button onClick={openNew}>
            <Plus className="size-4" />
            Nuevo producto
          </Button>
        }
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, código o categoría"
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Stock mín.</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => {
                const stock = getStock(product.id)
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ProductThumb
                          src={product.image}
                          alt={product.name}
                          className="size-10"
                        />
                        <div className="min-w-0">
                          <p className="font-medium leading-tight">
                            {product.name}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {product.barcode}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.category}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(product.salePrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {product.minStock}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="tabular-nums font-medium">
                          {stock.available}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ProductStatusBadge status={product.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(product)}
                          aria-label={`Editar ${product.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleStatus(product)}
                          aria-label={
                            product.status === 'activo'
                              ? `Desactivar ${product.name}`
                              : `Activar ${product.name}`
                          }
                        >
                          {product.status === 'activo' ? (
                            <PowerOff className="size-4 text-red-500" />
                          ) : (
                            <Power className="size-4 text-primary" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No se encontraron productos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
      />
    </div>
  )
}

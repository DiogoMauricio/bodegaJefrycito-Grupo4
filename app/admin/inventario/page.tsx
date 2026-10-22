'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/admin/page-header'
import { ProductStatusBadge } from '@/components/status-badges'
import { ProductThumb } from '@/components/product-thumb'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function InventarioPage() {
  const { products, getStock } = useStore()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q),
    )
  }, [products, query])

  return (
    <div>
      <PageHeader
        hu="HU-07"
        title="Consultar stock actual"
        description="Visualiza las existencias físicas, reservadas y disponibles de cada producto. Regla: stock disponible = stock físico vigente − stock reservado. Las unidades vencidas no se consideran vendibles. (Las reservas se integran en Sprint 3.)"
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span><strong className="text-foreground">Físico:</strong> unidades existentes</span>
          <span><strong className="text-foreground">Reservado:</strong> comprometidas</span>
          <span><strong className="text-foreground">Disponible:</strong> vendibles</span>
        </div>
      </div>

      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Físico</TableHead>
                <TableHead className="text-right">Vencidas</TableHead>
                <TableHead className="text-right">Reservado</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead className="text-right">Stock mín.</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => {
                const s = getStock(product.id)
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ProductThumb
                          src={product.image}
                          alt={product.name}
                          className="size-9"
                        />
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.physical}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.expired > 0 ? (
                        <span className="text-red-600">{s.expired}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.reserved > 0 ? (
                        <span className="text-violet-600">{s.reserved}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {s.available}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {product.minStock}
                    </TableCell>
                    <TableCell>
                      <ProductStatusBadge status={product.status} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

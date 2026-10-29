'use client'

import { Suspense, useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { useStore, getAlertState } from '@/lib/store'
import { PageHeader } from '@/components/admin/page-header'
import { ProductStatusBadge, StockAlertBadge } from '@/components/status-badges'
import { ProductThumb } from '@/components/product-thumb'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type FilterEstado = 'todos' | 'agotado' | 'bajo' | 'optimo' | 'vencido' | 'reservas'

function InventarioContent() {
  const { products, getStock } = useStore()
  const searchParams = useSearchParams()
  const estadoParam = searchParams.get('estado') as FilterEstado | null

  const [query, setQuery] = useState('')
  const [filterEstado, setFilterEstado] = useState<FilterEstado>(
    estadoParam || 'todos',
  )

  useEffect(() => {
    if (estadoParam) {
      setFilterEstado(estadoParam)
    }
  }, [estadoParam])

  const counts = useMemo(() => {
    let agotados = 0
    let bajos = 0
    let optimos = 0
    let conVencidos = 0
    let conReservas = 0

    for (const p of products) {
      const s = getStock(p.id)
      const alert = getAlertState(s.available, p.minStock)
      if (alert === 'agotado') agotados++
      else if (alert === 'bajo') bajos++
      else optimos++
      if (s.expired > 0) conVencidos++
      if (s.reserved > 0) conReservas++
    }

    return {
      todos: products.length,
      agotados,
      bajos,
      optimos,
      conVencidos,
      conReservas,
    }
  }, [products, getStock])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      const matchText =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.category.toLowerCase().includes(q)

      if (!matchText) return false

      const s = getStock(p.id)
      const alert = getAlertState(s.available, p.minStock)

      if (filterEstado === 'agotado') return alert === 'agotado'
      if (filterEstado === 'bajo') return alert === 'bajo'
      if (filterEstado === 'optimo') return alert === 'ok'
      if (filterEstado === 'vencido') return s.expired > 0
      if (filterEstado === 'reservas') return s.reserved > 0
      return true
    })
  }, [products, query, filterEstado, getStock])

  return (
    <div>
      <PageHeader
        tag="Control de Existencias"
        title="Consulta de stock actual"
        description="Visualiza las existencias físicas, reservadas y disponibles de cada producto en tiempo real. Regla operativa: stock disponible = stock físico vigente − stock reservado. Las unidades vencidas quedan excluidas del stock vendible."
      />

      {/* Filtros por estado */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filterEstado === 'todos' ? 'default' : 'outline'}
          onClick={() => setFilterEstado('todos')}
        >
          Todos ({counts.todos})
        </Button>
        <Button
          size="sm"
          variant={filterEstado === 'agotado' ? 'destructive' : 'outline'}
          onClick={() => setFilterEstado('agotado')}
          className={
            filterEstado !== 'agotado' && counts.agotados > 0
              ? 'border-red-200 text-red-700 hover:bg-red-50'
              : ''
          }
        >
          Agotados ({counts.agotados})
        </Button>
        <Button
          size="sm"
          variant={filterEstado === 'bajo' ? 'default' : 'outline'}
          onClick={() => setFilterEstado('bajo')}
          className={
            filterEstado === 'bajo'
              ? 'bg-amber-600 text-white hover:bg-amber-700'
              : counts.bajos > 0
                ? 'border-amber-200 text-amber-800 hover:bg-amber-50'
                : ''
          }
        >
          Stock bajo ({counts.bajos})
        </Button>
        <Button
          size="sm"
          variant={filterEstado === 'optimo' ? 'default' : 'outline'}
          onClick={() => setFilterEstado('optimo')}
        >
          Óptimo ({counts.optimos})
        </Button>
        <Button
          size="sm"
          variant={filterEstado === 'vencido' ? 'outline' : 'outline'}
          onClick={() => setFilterEstado('vencido')}
          className={
            filterEstado === 'vencido'
              ? 'bg-red-700 text-white'
              : counts.conVencidos > 0
                ? 'border-red-200 text-red-700 hover:bg-red-50'
                : ''
          }
        >
          Con unidades vencidas ({counts.conVencidos})
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, código o categoría..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span><strong className="text-foreground">Físico:</strong> unidades existentes</span>
          <span><strong className="text-foreground">Reservado:</strong> comprometidas</span>
          <span><strong className="text-foreground">Disponible:</strong> vendibles vigentes</span>
        </div>
      </div>

      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Nivel Alerta</TableHead>
                <TableHead className="text-right">Físico</TableHead>
                <TableHead className="text-right">Vencidas</TableHead>
                <TableHead className="text-right">Reservado</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead className="text-right">Stock mín.</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    No se encontraron productos para el filtro seleccionado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((product) => {
                  const s = getStock(product.id)
                  const alert = getAlertState(s.available, product.minStock)
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <ProductThumb
                            src={product.image}
                            alt={product.name}
                            className="size-9"
                          />
                          <div>
                            <span className="font-medium">{product.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {product.category} · Código: {product.barcode}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StockAlertBadge alert={alert} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.physical}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.expired > 0 ? (
                          <span className="font-semibold text-red-600">
                            {s.expired}
                          </span>
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
                        {s.available <= 0 ? (
                          <span className="text-red-600">0</span>
                        ) : (
                          <span>{s.available}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {product.minStock}
                      </TableCell>
                      <TableCell>
                        <ProductStatusBadge status={product.status} />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

export default function InventarioPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-muted-foreground">
          Cargando inventario...
        </div>
      }
    >
      <InventarioContent />
    </Suspense>
  )
}

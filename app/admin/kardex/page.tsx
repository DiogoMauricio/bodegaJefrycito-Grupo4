'use client'

// =============================================================
// Gestock · HU-06: Consultar Kardex de movimientos
// Criterio 1: Historial cronológico de movimientos.
// Criterio 2: Fecha, tipo, producto, lote, entrada, salida y saldo.
// Criterio 3: Filtros por producto, tipo y rango de fechas (desde/hasta).
// Criterio 4: Identificar la operación origen de cada movimiento.
// =============================================================

import { Suspense, useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Filter,
  Info,
  Layers,
  Package,
  Printer,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { formatDateTime, formatDate } from '@/lib/format'
import { PageHeader } from '@/components/admin/page-header'
import { MovementBadge } from '@/components/status-badges'
import { ProductThumb } from '@/components/product-thumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Movement, MovementType } from '@/lib/types'

function KardexContent() {
  const { movements, products, lots, getProduct } = useStore()
  const searchParams = useSearchParams()
  const initialProductId = searchParams.get('producto') || 'todos'

  // Filtros
  const [selectedProduct, setSelectedProduct] = useState<string>(initialProductId)
  const [selectedType, setSelectedType] = useState<string>('todos')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc') // más recientes primero por defecto

  // Modal de detalle de movimiento (Criterio 4)
  const [detailMovement, setDetailMovement] = useState<Movement | null>(null)

  useEffect(() => {
    const p = searchParams.get('producto')
    if (p) setSelectedProduct(p)
  }, [searchParams])

  // Resetear filtros
  const handleResetFilters = () => {
    setSelectedProduct('todos')
    setSelectedType('todos')
    setDateFrom('')
    setDateTo('')
    setSearchQuery('')
  }

  const hasActiveFilters =
    selectedProduct !== 'todos' ||
    selectedType !== 'todos' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    searchQuery.trim() !== ''

  // Movimientos filtrados y ordenados
  const filteredMovements = useMemo(() => {
    return movements
      .filter((m) => {
        // Filtro por producto
        if (selectedProduct !== 'todos' && m.productId !== selectedProduct) {
          return false
        }
        // Filtro por tipo de movimiento
        if (selectedType !== 'todos' && m.type !== selectedType) {
          return false
        }
        // Filtro por rango de fechas (Desde)
        if (dateFrom) {
          const mDate = new Date(m.date).toISOString().slice(0, 10)
          if (mDate < dateFrom) return false
        }
        // Filtro por rango de fechas (Hasta)
        if (dateTo) {
          const mDate = new Date(m.date).toISOString().slice(0, 10)
          if (mDate > dateTo) return false
        }
        // Búsqueda por texto (referencia, código de lote, nombre producto)
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase()
          const product = getProduct(m.productId)
          const matchRef = m.reference.toLowerCase().includes(q)
          const matchLot = m.lotCode ? m.lotCode.toLowerCase().includes(q) : false
          const matchProd = product ? product.name.toLowerCase().includes(q) : false
          if (!matchRef && !matchLot && !matchProd) return false
        }
        return true
      })
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime()
        const timeB = new Date(b.date).getTime()
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
      })
  }, [movements, selectedProduct, selectedType, dateFrom, dateTo, searchQuery, sortOrder, getProduct])

  // Métricas del Kardex filtrado
  const metrics = useMemo(() => {
    let totalEntradas = 0
    let totalSalidas = 0
    for (const m of filteredMovements) {
      totalEntradas += m.in
      totalSalidas += m.out
    }
    return {
      count: filteredMovements.length,
      totalEntradas,
      totalSalidas,
      neto: totalEntradas - totalSalidas,
    }
  }, [filteredMovements])

  // Datos del producto y lote del movimiento seleccionado para el modal
  const detailData = useMemo(() => {
    if (!detailMovement) return null
    const product = getProduct(detailMovement.productId)
    const lot = detailMovement.lotId ? lots.find((l) => l.id === detailMovement.lotId) : null
    const previousBalance = detailMovement.in > 0 
      ? detailMovement.balance - detailMovement.in 
      : detailMovement.balance + detailMovement.out

    return { product, lot, previousBalance }
  }, [detailMovement, getProduct, lots])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          hu="HU-06"
          title="Kardex de movimientos"
          description="Historial cronológico de movimientos de inventario: entradas, ventas, reservas, liberaciones, ajustes y mermas. Cada movimiento conserva el saldo resultante para auditar cómo se originaron las existencias."
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-2 bg-white shadow-2xs"
          >
            <Printer className="size-4" />
            <span className="hidden sm:inline">Imprimir Kardex</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas del Kardex */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80 bg-white shadow-2xs">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Movimientos
              </p>
              <p className="text-2xl font-extrabold text-foreground mt-1 tabular-nums">
                {metrics.count}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {selectedProduct === 'todos' ? 'En todo el inventario' : 'Para producto seleccionado'}
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileSpreadsheet className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-white shadow-2xs">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Ingresos (Entradas)
              </p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1 tabular-nums">
                +{metrics.totalEntradas}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Unidades recepcionadas
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-white shadow-2xs">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Egresos (Salidas)
              </p>
              <p className="text-2xl font-extrabold text-rose-600 mt-1 tabular-nums">
                -{metrics.totalSalidas}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Ventas y mermas aplicadas
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <ArrowDownRight className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-white shadow-2xs">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Balance Neto del Periodo
              </p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1 tabular-nums">
                {metrics.neto > 0 ? `+${metrics.neto}` : metrics.neto}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Variación de existencias
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Layers className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros (Criterio 3) */}
      <Card className="border-border/80 bg-white shadow-2xs">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Filter className="size-4 text-primary" />
              Filtros de Auditoría
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowUpDown className="size-3.5" />
                <span>{sortOrder === 'desc' ? 'Más recientes primero' : 'Cronológico (Antiguos primero)'}</span>
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 gap-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <RotateCcw className="size-3" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Selector de Producto */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Producto
              </label>
              <Select value={selectedProduct} onValueChange={(val) => setSelectedProduct(val || 'todos')}>
                <SelectTrigger className="h-9 w-full bg-slate-50/50">
                  <SelectValue placeholder="Todos los productos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los productos</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Selector de Tipo */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Tipo de Movimiento
              </label>
              <Select value={selectedType} onValueChange={(val) => setSelectedType(val || 'todos')}>
                <SelectTrigger className="h-9 w-full bg-slate-50/50">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="venta">Venta</SelectItem>
                  <SelectItem value="reserva">Reserva</SelectItem>
                  <SelectItem value="liberacion">Liberación</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                  <SelectItem value="merma">Merma</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3. Fecha Desde */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Desde
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 bg-slate-50/50"
              />
            </div>

            {/* 4. Fecha Hasta */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Hasta
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Buscador de texto libre */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por lote (ej. AC-2404), comprobante, ticket de venta o referencia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-slate-50/50 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla del Kardex (Criterios 1, 2 y 4) */}
      <Card className="border-border/80 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="w-[170px] font-bold text-xs">Fecha y Hora</TableHead>
                <TableHead className="min-w-[220px] font-bold text-xs">Producto</TableHead>
                <TableHead className="w-[120px] font-bold text-xs">Lote</TableHead>
                <TableHead className="w-[120px] font-bold text-xs">Movimiento</TableHead>
                <TableHead className="w-[100px] text-right font-bold text-xs">Entrada</TableHead>
                <TableHead className="w-[100px] text-right font-bold text-xs">Salida</TableHead>
                <TableHead className="w-[110px] text-right font-bold text-xs">Saldo</TableHead>
                <TableHead className="min-w-[240px] font-bold text-xs">Referencia / Origen</TableHead>
                <TableHead className="w-[80px] text-center font-bold text-xs">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FileSpreadsheet className="size-10 stroke-[1.5] text-slate-300 mb-2" />
                      <p className="font-semibold text-sm text-foreground">
                        No se encontraron movimientos
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm mt-1">
                        {hasActiveFilters
                          ? 'No hay registros que coincidan con los filtros aplicados. Prueba limpiar o ampliar el rango de fechas.'
                          : 'Aún no se han generado movimientos de inventario en el sistema.'}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetFilters}
                          className="mt-3 h-8 text-xs gap-1.5"
                        >
                          <RotateCcw className="size-3" />
                          Restablecer filtros
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((m) => {
                  const product = getProduct(m.productId)
                  return (
                    <TableRow key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Fecha */}
                      <TableCell className="text-xs font-medium text-slate-600 whitespace-nowrap">
                        {formatDateTime(m.date)}
                      </TableCell>

                      {/* 2. Producto */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <ProductThumb
                            src={product?.image || '/placeholder.png'}
                            alt={product?.name || 'Producto'}
                            className="size-8 rounded-md"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                              {product?.name || m.productId}
                            </p>
                            <span className="text-[10px] text-muted-foreground">
                              {product?.category} · {product?.unit}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* 3. Lote */}
                      <TableCell>
                        {m.lotCode ? (
                          <span className="font-mono text-xs font-medium bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                            {m.lotCode}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* 4. Movimiento */}
                      <TableCell>
                        <MovementBadge type={m.type} />
                      </TableCell>

                      {/* 5. Entrada */}
                      <TableCell className="text-right font-medium text-xs">
                        {m.in > 0 ? (
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            +{m.in}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">—</span>
                        )}
                      </TableCell>

                      {/* 6. Salida */}
                      <TableCell className="text-right font-medium text-xs">
                        {m.out > 0 ? (
                          <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                            -{m.out}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">—</span>
                        )}
                      </TableCell>

                      {/* 7. Saldo Resultante */}
                      <TableCell className="text-right">
                        <span className="text-sm font-extrabold text-foreground tabular-nums">
                          {m.balance}
                        </span>
                      </TableCell>

                      {/* 8. Referencia / Origen */}
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        <span className="line-clamp-1" title={m.reference}>
                          {m.reference}
                        </span>
                      </TableCell>

                      {/* 9. Detalle Modal (Criterio 4) */}
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDetailMovement(m)}
                          className="size-7 hover:bg-slate-100 text-slate-500 hover:text-foreground"
                          title="Ver detalle del movimiento"
                        >
                          <Info className="size-4" />
                          <span className="sr-only">Detalle</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal Detalle de Operación Origen (Criterio 4) */}
      <Dialog open={!!detailMovement} onOpenChange={(open) => !open && setDetailMovement(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <FileSpreadsheet className="size-5 text-primary" />
              Detalle de Auditoría de Movimiento
            </DialogTitle>
            <DialogDescription>
              Trazabilidad de la operación y procedencia del movimiento en el Kardex.
            </DialogDescription>
          </DialogHeader>

          {detailMovement && detailData && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Encabezado del movimiento */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    ID Movimiento
                  </p>
                  <p className="font-mono font-semibold text-slate-800">{detailMovement.id}</p>
                </div>
                <MovementBadge type={detailMovement.type} />
              </div>

              {/* Información del Producto */}
              <div className="space-y-2 border-b border-border/60 pb-3">
                <p className="font-bold text-foreground text-xs uppercase tracking-wider text-slate-500">
                  Producto Afectado
                </p>
                <div className="flex items-center gap-3">
                  <ProductThumb
                    src={detailData.product?.image || '/placeholder.png'}
                    alt={detailData.product?.name || 'Producto'}
                    className="size-11 rounded-lg border border-border/80"
                  />
                  <div>
                    <p className="font-bold text-sm text-foreground">
                      {detailData.product?.name || detailMovement.productId}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Cód. Barras: {detailData.product?.barcode || '—'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {detailData.product?.category} · {detailData.product?.unit}
                    </p>
                  </div>
                </div>
              </div>

              {/* Información del Lote y Referencia */}
              <div className="grid grid-cols-2 gap-3 border-b border-border/60 pb-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Lote</p>
                  <p className="font-mono font-semibold text-foreground text-xs mt-0.5">
                    {detailMovement.lotCode || 'Sin lote'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Fecha y Hora</p>
                  <p className="font-medium text-foreground text-xs mt-0.5">
                    {formatDateTime(detailMovement.date)}
                  </p>
                </div>
                {detailData.lot && (
                  <>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Proveedor Lote</p>
                      <p className="font-medium text-foreground text-xs mt-0.5 truncate">
                        {detailData.lot.supplier || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Vencimiento Lote</p>
                      <p className="font-medium text-foreground text-xs mt-0.5">
                        {formatDate(detailData.lot.expiry)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Trazabilidad de Saldos (Saldo anterior, variación, saldo resultante) */}
              <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">
                  Trazabilidad de Existencias
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded bg-white border border-slate-100">
                    <span className="text-[10px] text-muted-foreground block">Saldo Anterior</span>
                    <span className="font-bold text-slate-700 text-sm tabular-nums">
                      {detailData.previousBalance}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-100">
                    <span className="text-[10px] text-muted-foreground block">Variación</span>
                    <span
                      className={`font-bold text-sm tabular-nums ${
                        detailMovement.in > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {detailMovement.in > 0 ? `+${detailMovement.in}` : `-${detailMovement.out}`}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-100">
                    <span className="text-[10px] text-muted-foreground block">Saldo Resultante</span>
                    <span className="font-bold text-foreground text-sm tabular-nums">
                      {detailMovement.balance}
                    </span>
                  </div>
                </div>
              </div>

              {/* Referencia exacta de la operación */}
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                  Operación de Origen
                </p>
                <div className="p-2.5 rounded-md bg-amber-50/70 border border-amber-200 text-amber-900 font-medium">
                  {detailMovement.reference}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function KardexPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Cargando Kardex de movimientos…
        </div>
      }
    >
      <KardexContent />
    </Suspense>
  )
}


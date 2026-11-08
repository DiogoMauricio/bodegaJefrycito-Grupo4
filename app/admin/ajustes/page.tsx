'use client'

// =============================================================
// Gestock · HU-13: Registrar ajuste de inventario
// Criterio 1: Registrar ajustes de stock (incremento o decremento) con motivo.
// Criterio 2: El ajuste genera un movimiento de tipo "ajuste" en el Kardex.
// Criterio 3: Filtrar historial de ajustes por producto, tipo y fecha.
// Criterio 4: Cada ajuste muestra: fecha, producto, lote, cantidad, motivo y usuario.
// =============================================================

import { Suspense, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  ClipboardList,
  Filter,
  Layers,
  Package,
  PlusCircle,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Wrench,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { formatDateTime } from '@/lib/format'
import { PageHeader } from '@/components/admin/page-header'
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
import { Badge } from '@/components/ui/badge'
import type { Movement } from '@/lib/types'

// Motivos predefinidos de ajuste
const MOTIVOS = [
  'Conteo físico de inventario',
  'Producto dañado o deteriorado',
  'Merma por vencimiento',
  'Error de registro anterior',
  'Devolución de cliente',
  'Devolución a proveedor',
  'Robo o pérdida',
  'Ajuste de lote',
  'Otro',
]

// ─── Formulario de nuevo ajuste ───────────────────────────────
function NuevoAjusteDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { products, lots, getStock, registerAdjustment } = useStore()
  const productosActivos = products.filter((p) => p.status === 'activo')

  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedLotId, setSelectedLotId] = useState('sin-lote')
  const [tipoAjuste, setTipoAjuste] = useState<'incremento' | 'decremento'>('incremento')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [motivoCustom, setMotivoCustom] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Lotes del producto seleccionado
  const lotesProducto = useMemo(
    () => lots.filter((l) => l.productId === selectedProductId),
    [lots, selectedProductId],
  )

  // Stock actual del producto seleccionado
  const stockActual = useMemo(
    () => (selectedProductId ? getStock(selectedProductId) : null),
    [getStock, selectedProductId],
  )

  const resetForm = () => {
    setSelectedProductId('')
    setSelectedLotId('sin-lote')
    setTipoAjuste('incremento')
    setCantidad('')
    setMotivo('')
    setMotivoCustom('')
    setError('')
    setSuccess(false)
  }

  const handleSubmit = () => {
    // Validaciones
    if (!selectedProductId) return setError('Selecciona un producto.')
    const qty = parseInt(cantidad, 10)
    if (!cantidad || isNaN(qty) || qty <= 0) return setError('Ingresa una cantidad válida mayor a 0.')
    if (!motivo) return setError('Selecciona un motivo de ajuste.')

    const motivoFinal = motivo === 'Otro' ? motivoCustom.trim() : motivo
    if (!motivoFinal) return setError('Describe el motivo del ajuste.')

    setLoading(true)
    setError('')

    const res = registerAdjustment({
      productId: selectedProductId,
      lotId: selectedLotId !== 'sin-lote' ? selectedLotId : null,
      type: tipoAjuste,
      quantity: qty,
      reason: motivoFinal,
    })

    setLoading(false)

    if (!res.ok) {
      setError(res.error || 'Ocurrió un error al registrar el ajuste.')
      return
    }

    setSuccess(true)
    setTimeout(() => {
      resetForm()
      onClose()
    }, 1200)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="size-5 text-amber-500" />
            Registrar ajuste de inventario
          </DialogTitle>
          <DialogDescription>
            El ajuste quedará registrado en el Kardex como movimiento de tipo &quot;ajuste&quot;.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="size-12 text-emerald-500" />
            <p className="font-semibold text-emerald-700">¡Ajuste registrado correctamente!</p>
            <p className="text-sm text-muted-foreground">El Kardex ha sido actualizado.</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Producto */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Producto *</label>
              <Select value={selectedProductId} onValueChange={(v) => { setSelectedProductId(v || ''); setSelectedLotId('sin-lote') }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un producto…" />
                </SelectTrigger>
                <SelectContent>
                  {productosActivos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stockActual && (
                <p className="text-xs text-muted-foreground">
                  Stock disponible actual:{' '}
                  <span className="font-semibold text-foreground">{stockActual.available} uds.</span>
                </p>
              )}
            </div>

            {/* Lote (opcional) */}
            {lotesProducto.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Lote (opcional)</label>
                <Select value={selectedLotId} onValueChange={(v) => setSelectedLotId(v || 'sin-lote')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin lote específico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin-lote">Sin lote específico</SelectItem>
                    {lotesProducto.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.code} · {l.quantity} uds.
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tipo de ajuste */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo de ajuste *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoAjuste('incremento')}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    tipoAjuste === 'incremento'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <ArrowUpCircle className="size-4" />
                  Incremento (+)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAjuste('decremento')}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    tipoAjuste === 'decremento'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <ArrowDownCircle className="size-4" />
                  Decremento (-)
                </button>
              </div>
            </div>

            {/* Cantidad */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cantidad *</label>
              <Input
                type="number"
                min={1}
                placeholder="Ej. 10"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>

            {/* Motivo */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Motivo del ajuste *</label>
              <Select value={motivo} onValueChange={(v) => setMotivo(v || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un motivo…" />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {motivo === 'Otro' && (
                <Input
                  placeholder="Describe el motivo…"
                  value={motivoCustom}
                  onChange={(e) => setMotivoCustom(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { resetForm(); onClose() }}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Guardando…' : 'Registrar ajuste'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Badge de tipo de ajuste ──────────────────────────────────
function AjusteBadge({ movement }: { movement: Movement }) {
  const esIncremento = movement.in > 0
  return (
    <Badge
      className={`gap-1 text-xs font-semibold ${
        esIncremento
          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
          : 'bg-red-100 text-red-700 border-red-200'
      }`}
      variant="outline"
    >
      {esIncremento ? (
        <ArrowUpCircle className="size-3" />
      ) : (
        <ArrowDownCircle className="size-3" />
      )}
      {esIncremento ? `+${movement.in}` : `-${movement.out}`} uds.
    </Badge>
  )
}

// ─── Contenido principal ──────────────────────────────────────
function AjustesContent() {
  const { movements, products, getProduct } = useStore()

  const [openForm, setOpenForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('todos')
  const [selectedTipo, setSelectedTipo] = useState('todos')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [detailMovement, setDetailMovement] = useState<Movement | null>(null)

  // Solo movimientos de tipo "ajuste" (Criterio 3)
  const ajustes = useMemo(() => {
    return movements
      .filter((m) => m.type === 'ajuste')
      .filter((m) => {
        const prod = getProduct(m.productId)
        if (selectedProduct !== 'todos' && m.productId !== selectedProduct) return false
        if (selectedTipo === 'incremento' && m.in === 0) return false
        if (selectedTipo === 'decremento' && m.out === 0) return false
        if (dateFrom && m.date < dateFrom) return false
        if (dateTo && m.date > dateTo + 'T23:59:59') return false
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          if (
            !prod?.name.toLowerCase().includes(q) &&
            !m.reference.toLowerCase().includes(q) &&
            !(m.lotCode ?? '').toLowerCase().includes(q)
          )
            return false
        }
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [movements, getProduct, selectedProduct, selectedTipo, dateFrom, dateTo, searchQuery])

  // Métricas
  const metricas = useMemo(() => {
    const todos = movements.filter((m) => m.type === 'ajuste')
    const incrementos = todos.filter((m) => m.in > 0)
    const decrementos = todos.filter((m) => m.out > 0)
    const totalIncremento = incrementos.reduce((s, m) => s + m.in, 0)
    const totalDecremento = decrementos.reduce((s, m) => s + m.out, 0)
    return { total: todos.length, incrementos: incrementos.length, decrementos: decrementos.length, totalIncremento, totalDecremento }
  }, [movements])

  const resetFiltros = () => {
    setSearchQuery('')
    setSelectedProduct('todos')
    setSelectedTipo('todos')
    setDateFrom('')
    setDateTo('')
  }

  const productosFiltro = useMemo(
    () => products.filter((p) => movements.some((m) => m.type === 'ajuste' && m.productId === p.id)),
    [products, movements],
  )

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          hu="HU-13"
          title="Ajuste de inventario"
          description="Registra y audita correcciones manuales de stock. Cada ajuste queda trazado en el Kardex con su motivo, producto, lote y usuario responsable."
        />
        <Button
          onClick={() => setOpenForm(true)}
          className="gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow"
        >
          <PlusCircle className="size-4" />
          Nuevo ajuste
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80 bg-white shadow-2xs">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total ajustes</p>
              <p className="text-2xl font-extrabold text-foreground mt-1 tabular-nums">{metricas.total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Registrados en el sistema</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-full bg-amber-100">
              <ClipboardList className="size-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-white shadow-2xs">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Incrementos</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1 tabular-nums">{metricas.incrementos}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">+{metricas.totalIncremento} uds. en total</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100">
              <ArrowUpCircle className="size-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-white shadow-2xs">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Decrementos</p>
              <p className="text-2xl font-extrabold text-red-600 mt-1 tabular-nums">{metricas.decrementos}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">-{metricas.totalDecremento} uds. en total</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-full bg-red-100">
              <ArrowDownCircle className="size-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-white shadow-2xs">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Productos ajustados</p>
              <p className="text-2xl font-extrabold text-foreground mt-1 tabular-nums">{productosFiltro.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Con al menos 1 ajuste</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-100">
              <Package className="size-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-border/80 bg-white shadow-2xs">
        <CardHeader className="border-b border-border/60 pb-3 pt-4 px-5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            Filtros del historial
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Búsqueda */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar producto, motivo, lote…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>

            {/* Producto */}
            <Select value={selectedProduct} onValueChange={(v) => setSelectedProduct(v || 'todos')}>
              <SelectTrigger className="h-9 text-sm">
                <div className="flex items-center gap-1.5">
                  <Package className="size-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Todos los productos" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los productos</SelectItem>
                {productosFiltro.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tipo */}
            <Select value={selectedTipo} onValueChange={(v) => setSelectedTipo(v || 'todos')}>
              <SelectTrigger className="h-9 text-sm">
                <div className="flex items-center gap-1.5">
                  <Filter className="size-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Todos los tipos" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="incremento">Incremento (+)</SelectItem>
                <SelectItem value="decremento">Decremento (-)</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset */}
            <Button variant="outline" size="sm" onClick={resetFiltros} className="h-9 gap-2 text-sm">
              <RotateCcw className="size-3.5" />
              Limpiar filtros
            </Button>
          </div>

          {/* Rango de fechas */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Desde</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Hasta</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de ajustes */}
      <Card className="border-border/80 bg-white shadow-2xs overflow-hidden">
        <CardHeader className="border-b border-border/60 pb-3 pt-4 px-5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="size-4 text-muted-foreground" />
            Historial de ajustes
            <Badge variant="secondary" className="ml-auto font-mono text-xs">
              {ajustes.length} registros
            </Badge>
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[180px] text-xs font-semibold">Fecha y hora</TableHead>
                <TableHead className="text-xs font-semibold">Producto</TableHead>
                <TableHead className="text-xs font-semibold">Lote</TableHead>
                <TableHead className="text-xs font-semibold">Ajuste</TableHead>
                <TableHead className="text-xs font-semibold">Motivo</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ajustes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Wrench className="size-8 opacity-30" />
                      <p className="text-sm font-medium">No hay ajustes registrados</p>
                      <p className="text-xs">Haz clic en &quot;Nuevo ajuste&quot; para comenzar.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                ajustes.map((m) => {
                  const prod = getProduct(m.productId)
                  return (
                    <TableRow
                      key={m.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setDetailMovement(m)}
                    >
                      <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDateTime(m.date)}
                      </TableCell>
                      <TableCell>
                        {prod ? (
                          <div className="flex items-center gap-2">
                            <ProductThumb src={prod.image} alt={prod.name} className="size-8" />
                            <span className="text-sm font-medium line-clamp-1">{prod.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Desconocido</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {m.lotCode ? (
                          <Badge variant="outline" className="font-mono text-xs gap-1">
                            <Layers className="size-3" />
                            {m.lotCode}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <AjusteBadge movement={m} />
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {m.reference.replace('Ajuste · ', '')}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="size-7">
                          <SlidersHorizontal className="size-3.5 text-muted-foreground" />
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

      {/* Modal de detalle (Criterio 4) */}
      <Dialog open={!!detailMovement} onOpenChange={(v) => { if (!v) setDetailMovement(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="size-5 text-amber-500" />
              Detalle del ajuste
            </DialogTitle>
            <DialogDescription>
              Información completa del movimiento de ajuste.
            </DialogDescription>
          </DialogHeader>
          {detailMovement && (() => {
            const prod = getProduct(detailMovement.productId)
            const esIncremento = detailMovement.in > 0
            return (
              <div className="space-y-3 pt-1">
                <div className="rounded-lg bg-muted/40 p-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha y hora</span>
                    <span className="font-medium tabular-nums">{formatDateTime(detailMovement.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Producto</span>
                    <span className="font-medium">{prod?.name ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lote</span>
                    <span className="font-mono font-medium">{detailMovement.lotCode ?? '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tipo de ajuste</span>
                    <Badge className={`gap-1 text-xs font-semibold ${esIncremento ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`} variant="outline">
                      {esIncremento ? <ArrowUpCircle className="size-3" /> : <ArrowDownCircle className="size-3" />}
                      {esIncremento ? 'Incremento' : 'Decremento'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cantidad</span>
                    <span className={`font-bold tabular-nums ${esIncremento ? 'text-emerald-600' : 'text-red-600'}`}>
                      {esIncremento ? `+${detailMovement.in}` : `-${detailMovement.out}`} uds.
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Motivo</span>
                    <span className="font-medium text-right max-w-[200px]">
                      {detailMovement.reference.replace('Ajuste · ', '')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Referencia</span>
                    <span className="font-mono text-xs text-muted-foreground">{detailMovement.id}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setDetailMovement(null)}>
                  Cerrar
                </Button>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog de nuevo ajuste */}
      <NuevoAjusteDialog open={openForm} onClose={() => setOpenForm(false)} />
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────
export default function AjustesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-muted-foreground">Cargando ajustes…</div>}>
      <AjustesContent />
    </Suspense>
  )
}


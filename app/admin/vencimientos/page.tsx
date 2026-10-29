'use client'

import { Suspense, useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore, lotExpiryState } from '@/lib/store'
import { formatDate, daysUntil, formatCurrency } from '@/lib/format'
import { PageHeader } from '@/components/admin/page-header'
import { ExpiryBadge, LotAvailabilityBadge } from '@/components/status-badges'
import { ProductThumb } from '@/components/product-thumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Lot } from '@/lib/types'

type ExpiryFilter = 'todos' | 'proximo' | 'vencido' | 'ok'

function VencimientosContent() {
  const { lots, products, retireLot } = useStore()
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filter') as ExpiryFilter | null

  const [query, setQuery] = useState('')
  const [filterState, setFilterState] = useState<ExpiryFilter>(
    filterParam || 'todos',
  )
  const [categoryFilter, setCategoryFilter] = useState('todas')
  const [selectedLotForRetire, setSelectedLotForRetire] = useState<Lot | null>(null)
  const [retireReason, setRetireReason] = useState('')

  useEffect(() => {
    if (filterParam) {
      setFilterState(filterParam)
    }
  }, [filterParam])

  // Categorías disponibles
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const p of products) {
      if (p.category) set.add(p.category)
    }
    return Array.from(set)
  }, [products])

  // Estadísticas globales de vencimientos
  const stats = useMemo(() => {
    let countProximos = 0
    let unitsProximos = 0
    let valorProximos = 0

    let countVencidos = 0
    let unitsVencidos = 0
    let valorVencidos = 0

    let countOk = 0
    let unitsOk = 0
    let valorOk = 0

    for (const lot of lots) {
      const state = lotExpiryState(lot)
      const lotVal = lot.quantity * lot.cost

      if (state === 'vencido') {
        countVencidos++
        unitsVencidos += lot.quantity
        valorVencidos += lotVal
      } else if (state === 'proximo') {
        countProximos++
        unitsProximos += lot.quantity
        valorProximos += lotVal
      } else {
        countOk++
        unitsOk += lot.quantity
        valorOk += lotVal
      }
    }

    const totalLotes = lots.length
    const pctProximos = totalLotes > 0 ? Math.round((countProximos / totalLotes) * 100) : 0
    const pctVencidos = totalLotes > 0 ? Math.round((countVencidos / totalLotes) * 100) : 0
    const pctOk = totalLotes > 0 ? Math.round((countOk / totalLotes) * 100) : 0

    return {
      totalLotes,
      countProximos,
      unitsProximos,
      valorProximos,
      pctProximos,
      countVencidos,
      unitsVencidos,
      valorVencidos,
      pctVencidos,
      countOk,
      unitsOk,
      valorOk,
      pctOk,
    }
  }, [lots])

  // Lotes filtrados y ordenados por fecha de vencimiento (FEFO)
  const filteredLots = useMemo(() => {
    const q = query.trim().toLowerCase()

    return lots
      .map((lot) => {
        const product = products.find((p) => p.id === lot.productId)
        const state = lotExpiryState(lot)
        const days = daysUntil(lot.expiry)
        const valorLote = lot.quantity * lot.cost
        return { lot, product, state, days, valorLote }
      })
      .filter(({ lot, product, state }) => {
        if (filterState !== 'todos' && state !== filterState) return false

        if (categoryFilter !== 'todas' && product?.category !== categoryFilter) {
          return false
        }

        if (!q) return true
        const matchName = product?.name.toLowerCase().includes(q) || false
        const matchBarcode = product?.barcode.includes(q) || false
        const matchCode = lot.code.toLowerCase().includes(q)
        const matchSupplier = lot.supplier.toLowerCase().includes(q)
        const matchVoucher = lot.voucher.toLowerCase().includes(q)
        return (
          matchName ||
          matchBarcode ||
          matchCode ||
          matchSupplier ||
          matchVoucher
        )
      })
      .sort((a, b) => {
        if (!a.lot.expiry) return 1
        if (!b.lot.expiry) return -1
        return new Date(a.lot.expiry).getTime() - new Date(b.lot.expiry).getTime()
      })
  }, [lots, products, query, filterState, categoryFilter])

  function handleConfirmRetire() {
    if (!selectedLotForRetire) return
    const res = retireLot(
      selectedLotForRetire.id,
      retireReason.trim() ||
        `Retiro preventivo por caducidad vencida · Lote ${selectedLotForRetire.code}`,
    )
    if (!res.ok) {
      toast.error(res.error || 'Error al retirar lote.')
      return
    }
    toast.success(
      `Lote ${selectedLotForRetire.code} retirado. Se descontó del stock y se registró en Kardex de mermas.`,
    )
    setSelectedLotForRetire(null)
    setRetireReason('')
  }

  return (
    <div className="space-y-6">
      {/* Encabezado sin menciones de HU */}
      <PageHeader
        tag="Control de Calidad y Caducidad"
        title="Gestión de vencimientos y rotación FEFO"
        description="Supervisa los lotes perecibles en tiempo real. Aplica la estrategia de rotación prioritaria FEFO (First Expired, First Out) a 30 días y gestiona el retiro oportuno de lotes vencidos."
      />

      {/* Banner visual de Alerta Crítica (Lotes vencidos) */}
      {stats.countVencidos > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-red-300/80 bg-gradient-to-r from-red-500/10 via-red-50 to-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-red-900 text-base">
                    Atención inmediata: {stats.countVencidos} lote(s) vencido(s) en almacén
                  </h3>
                  <span className="rounded-full bg-red-200/80 px-2 py-0.5 text-[11px] font-extrabold uppercase text-red-800">
                    Bloqueado
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-red-800/90 leading-relaxed max-w-2xl">
                  Se detectaron <strong>{stats.unitsVencidos} unidades</strong> con fecha de caducidad expirada (valoradas en {formatCurrency(stats.valorVencidos)}). El sistema ha bloqueado su venta y reserva para garantizar la inocuidad. Procede a registrarlas como merma.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setFilterState('vencido')}
              className="gap-1.5 shrink-0 shadow-xs"
            >
              <Trash2 className="size-3.5" />
              Ver lotes bloqueados
            </Button>
          </div>
        </div>
      )}

      {/* Banner visual de Alerta Preventiva (Próximos a vencer) */}
      {stats.countProximos > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-500/10 via-amber-50 to-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                <Zap className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-amber-950 text-base">
                    Rotación prioritaria FEFO: {stats.countProximos} lote(s) por vencer en ≤ 30 días
                  </h3>
                  <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                    Acción Comercial
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-amber-900/90 leading-relaxed max-w-2xl">
                  Existen <strong>{stats.unitsProximos} unidades</strong> en riesgo de pérdida (valoradas en {formatCurrency(stats.valorProximos)}). Ubícalas al frente de los anaqueles o evalúa descuentos preventivos.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFilterState('proximo')}
              className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100 gap-1.5 shrink-0 shadow-xs"
            >
              <Clock className="size-3.5 text-amber-700" />
              Revisar lotes por vencer
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4 KPI CARDS VISUALES CON BARRAS DE PROGRESO Y CONTRASTE   */}
      {/* ========================================================= */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Próximos a vencer */}
        <Card
          onClick={() => setFilterState('proximo')}
          className={`group cursor-pointer overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            filterState === 'proximo'
              ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/40'
              : 'border-slate-200 hover:border-amber-300 bg-white'
          }`}
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-amber-600" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Próximos a vencer
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shadow-2xs group-hover:scale-105 transition-transform">
                <CalendarClock className="size-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums text-foreground">
                {stats.countProximos}
              </span>
              <span className="text-xs font-semibold text-amber-700">
                lotes (≤ 30 días)
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground font-medium">
              {stats.unitsProximos} unidades · {formatCurrency(stats.valorProximos)}
            </p>
            {/* Barra visual de proporción */}
            <div className="mt-3.5 space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${Math.max(stats.pctProximos, 6)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Proporción</span>
                <span className="font-semibold text-amber-700">{stats.pctProximos}% del inventario</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Lotes vencidos */}
        <Card
          onClick={() => setFilterState('vencido')}
          className={`group cursor-pointer overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            filterState === 'vencido'
              ? 'ring-2 ring-red-500 border-red-500 bg-red-50/40'
              : 'border-slate-200 hover:border-red-300 bg-white'
          }`}
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-red-700" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                Lotes caducados
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-red-100 text-red-700 shadow-2xs group-hover:scale-105 transition-transform">
                <AlertOctagon className="size-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums text-red-700">
                {stats.countVencidos}
              </span>
              <span className="text-xs font-semibold text-red-600">
                lotes bloqueados
              </span>
            </div>
            <p className="mt-1 text-xs text-red-700/80 font-medium">
              {stats.unitsVencidos} unidades no disponibles
            </p>
            {/* Barra visual de proporción */}
            <div className="mt-3.5 space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-red-600 transition-all duration-500"
                  style={{ width: `${Math.max(stats.pctVencidos, 6)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Excluido de venta</span>
                <span className="font-semibold text-red-700">{stats.pctVencidos}% del almacén</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Lotes vigentes */}
        <Card
          onClick={() => setFilterState('ok')}
          className={`group cursor-pointer overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            filterState === 'ok'
              ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/40'
              : 'border-slate-200 hover:border-emerald-300 bg-white'
          }`}
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Lotes vigentes
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shadow-2xs group-hover:scale-105 transition-transform">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums text-foreground">
                {stats.countOk}
              </span>
              <span className="text-xs font-semibold text-emerald-700">
                lotes seguros
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground font-medium">
              {stats.unitsOk} unidades vendibles
            </p>
            {/* Barra visual de proporción */}
            <div className="mt-3.5 space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.max(stats.pctOk, 10)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Estado óptimo</span>
                <span className="font-semibold text-emerald-700">{stats.pctOk}% apto</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total de Lotes Monitoreados */}
        <Card
          onClick={() => setFilterState('todos')}
          className={`group cursor-pointer overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            filterState === 'todos'
              ? 'ring-2 ring-primary border-primary bg-primary/5'
              : 'border-slate-200 hover:border-slate-400 bg-white'
          }`}
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-slate-600 to-slate-900" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total lotes activos
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 shadow-2xs group-hover:scale-105 transition-transform">
                <Layers className="size-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums text-foreground">
                {stats.totalLotes}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                lotes en almacén
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground font-medium">
              Trazabilidad 100% activa
            </p>
            <div className="mt-3.5 space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-slate-700 w-full" />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Control de inventario</span>
                <span className="font-semibold text-foreground">100% supervisado</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* BARRA DE FILTROS Y BÚSQUEDA INTERACTIVA                   */}
      {/* ========================================================= */}
      <div className="rounded-xl border border-border/80 bg-white p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Pestañas de estado con badges numéricos de color */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterState('todos')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterState === 'todos'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span>Todos los lotes</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                filterState === 'todos' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-slate-200 text-slate-700'
              }`}>
                {stats.totalLotes}
              </span>
            </button>

            <button
              onClick={() => setFilterState('proximo')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterState === 'proximo'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100'
              }`}
            >
              <Clock className="size-3" />
              <span>Próximos a vencer (≤ 30 d)</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                filterState === 'proximo' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900 font-bold'
              }`}>
                {stats.countProximos}
              </span>
            </button>

            <button
              onClick={() => setFilterState('vencido')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterState === 'vencido'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-900 border border-red-200/80 hover:bg-red-100'
              }`}
            >
              <AlertOctagon className="size-3" />
              <span>Vencidos (Bloqueados)</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                filterState === 'vencido' ? 'bg-white/20 text-white' : 'bg-red-200 text-red-900 font-bold'
              }`}>
                {stats.countVencidos}
              </span>
            </button>

            <button
              onClick={() => setFilterState('ok')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterState === 'ok'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200/80 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="size-3" />
              <span>Vigentes</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                filterState === 'ok' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900 font-bold'
              }`}>
                {stats.countOk}
              </span>
            </button>
          </div>

          {/* Buscador y filtro de categoría */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por producto, lote o proveedor..."
                className="pl-9 h-9 text-xs"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="todas">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TABLA PRINCIPAL VISUAL CON GUÍA FEFO Y ESTADOS            */}
      {/* ========================================================= */}
      <Card className="overflow-hidden border border-border/80 shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="w-[280px]">Producto</TableHead>
                <TableHead>Lote y Proveedor</TableHead>
                <TableHead>Fecha Vencimiento</TableHead>
                <TableHead className="w-[180px]">Termómetro de Días</TableHead>
                <TableHead className="text-right">Existencias y Valor</TableHead>
                <TableHead>Estado Lote</TableHead>
                <TableHead>Disponibilidad</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLots.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-36 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="size-6 text-muted-foreground/60" />
                      <p className="text-sm font-medium">No se encontraron lotes con los filtros actuales.</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setFilterState('todos')
                          setQuery('')
                          setCategoryFilter('todas')
                        }}
                        className="text-xs text-primary"
                      >
                        Restablecer filtros
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLots.map(({ lot, product, state, days, valorLote }) => {
                  return (
                    <TableRow
                      key={lot.id}
                      className={
                        state === 'vencido'
                          ? 'bg-red-50/40 hover:bg-red-50/70 border-l-4 border-l-red-500'
                          : state === 'proximo'
                            ? 'bg-amber-50/30 hover:bg-amber-50/60 border-l-4 border-l-amber-500'
                            : 'hover:bg-slate-50/60'
                      }
                    >
                      {/* Producto */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <ProductThumb
                            src={product?.image || ''}
                            alt={product?.name || 'Producto'}
                            className="size-10 rounded-md border shadow-2xs shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm leading-tight truncate">
                              {product?.name || 'Producto no identificado'}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium">{product?.category}</span>
                              <span>·</span>
                              <span className="font-mono text-[11px] text-muted-foreground/80">
                                {product?.barcode}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Lote */}
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-800">
                              {lot.code}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground font-medium truncate max-w-[170px]">
                            {lot.supplier}
                          </p>
                          <p className="text-[11px] text-muted-foreground/80">
                            Doc: {lot.voucher} · Recibido: {formatDate(lot.receivedAt)}
                          </p>
                        </div>
                      </TableCell>

                      {/* Fecha Vencimiento */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                          <span>{formatDate(lot.expiry)}</span>
                        </div>
                      </TableCell>

                      {/* Termómetro de Días Restantes */}
                      <TableCell>
                        {!lot.expiry ? (
                          <span className="text-xs text-muted-foreground font-medium">
                            No perecible
                          </span>
                        ) : days < 0 ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 shadow-2xs">
                              <span className="size-1.5 rounded-full bg-red-600 animate-pulse" />
                              Venció hace {Math.abs(days)} día{Math.abs(days) === 1 ? '' : 's'}
                            </span>
                            <p className="text-[10px] text-red-600 font-medium">
                              Bloqueado automáticamente
                            </p>
                          </div>
                        ) : days === 0 ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 shadow-2xs">
                              <AlertTriangle className="size-3" />
                              Vence hoy
                            </span>
                          </div>
                        ) : days <= 30 ? (
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-900 shadow-2xs">
                              <Clock className="size-3 text-amber-700" />
                              Quedan {days} días
                            </span>
                            {/* Barra visual indicadora de urgencia */}
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-200">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-amber-400"
                                style={{ width: `${Math.min(100, Math.round((days / 30) * 100))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                              <CheckCircle2 className="size-3 text-emerald-500" />
                              {days} días restantes
                            </span>
                            <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full bg-emerald-500 w-full" />
                            </div>
                          </div>
                        )}
                      </TableCell>

                      {/* Cantidad y Valor */}
                      <TableCell className="text-right">
                        <div>
                          {lot.quantity === 0 ? (
                            <span className="text-xs italic text-muted-foreground font-semibold">
                              0 (Lote retirado)
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold tabular-nums text-foreground">
                                {lot.quantity} und.
                              </p>
                              <p className="text-[11px] tabular-nums text-muted-foreground font-medium">
                                Costo: {formatCurrency(valorLote)}
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Estado */}
                      <TableCell>
                        <ExpiryBadge state={state} />
                      </TableCell>

                      {/* Disponibilidad */}
                      <TableCell>
                        <LotAvailabilityBadge state={state} />
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="text-right">
                        {state === 'vencido' && lot.quantity > 0 ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setSelectedLotForRetire(lot)}
                            className="gap-1.5 text-xs shadow-xs hover:bg-red-700"
                          >
                            <Trash2 className="size-3.5" />
                            Dar de baja
                          </Button>
                        ) : state === 'proximo' && lot.quantity > 0 ? (
                          <div className="inline-flex items-center gap-1 rounded bg-amber-100/80 px-2 py-1 text-[11px] font-bold text-amber-800">
                            <Zap className="size-3 text-amber-600" />
                            Rotar FEFO
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Diálogo de retiro de lote por merma */}
      <Dialog
        open={Boolean(selectedLotForRetire)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLotForRetire(null)
            setRetireReason('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="size-5" />
              Retirar lote vencido por merma
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Estás por retirar formalmente el lote{' '}
              <strong className="text-foreground font-mono">{selectedLotForRetire?.code}</strong>{' '}
              ({selectedLotForRetire?.quantity} unidades). Esta acción descontará las unidades del
              stock físico y generará un movimiento de tipo <strong>Merma</strong> en el Kardex.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-foreground">
              Motivo o referencia del retiro:
            </label>
            <Input
              value={retireReason}
              onChange={(e) => setRetireReason(e.target.value)}
              placeholder="Ej: Retiro preventivo por caducidad vencida en anaquel"
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedLotForRetire(null)
                setRetireReason('')
              }}
            >
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmRetire}>
              Confirmar retiro de merma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function VencimientosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Cargando gestión de vencimientos...
        </div>
      }
    >
      <VencimientosContent />
    </Suspense>
  )
}

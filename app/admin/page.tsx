'use client'

// =============================================================
// Gestock · Dashboard de Inventario
// Panel ejecutivo de supervisión en tiempo real:
// 1. Productos agotados
// 2. Stock bajo / crítico
// 3. Próximos a vencer (≤ 30 días - FEFO)
// 4. Lotes vencidos (bloqueados)
// 5. Reservas activas
// 6. Valoración económica del inventario (Costo y PVP)
// =============================================================

import { useMemo } from 'react'
import Link from 'next/link'
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BookmarkCheck,
  Boxes,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileSpreadsheet,
  Layers,
  PackageCheck,
  PackagePlus,
  PackageX,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Warehouse,
  Zap,
} from 'lucide-react'
import { useStore, lotExpiryState, getAlertState } from '@/lib/store'
import { formatCurrency, formatDate, daysUntil } from '@/lib/format'
import { PageHeader } from '@/components/admin/page-header'
import {
  ExpiryBadge,
  LotAvailabilityBadge,
  StockAlertBadge,
} from '@/components/status-badges'
import { ProductThumb } from '@/components/product-thumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function AdminDashboardPage() {
  const { products, lots, getStock } = useStore()

  // 1. Cálculos de indicadores principales
  const metrics = useMemo(() => {
    let agotados = 0
    let bajo = 0
    let optimo = 0
    let totalUnidadesFisicas = 0
    let totalUnidadesVigentes = 0
    let totalUnidadesVencidas = 0
    let totalReservas = 0
    let valorTotalCosto = 0
    let valorTotalVenta = 0

    const productosConAlerta: Array<{
      product: (typeof products)[0]
      stock: ReturnType<typeof getStock>
      alert: 'agotado' | 'bajo'
    }> = []

    // Métricas por producto
    for (const p of products) {
      const s = getStock(p.id)
      totalUnidadesFisicas += s.physical
      totalUnidadesVigentes += s.vigente
      totalUnidadesVencidas += s.expired
      totalReservas += s.reserved
      valorTotalVenta += s.physical * p.salePrice

      // Alertas de reposición para productos activos
      if (p.status === 'activo') {
        const alert = getAlertState(s.available, p.minStock)
        if (alert === 'agotado') {
          agotados++
          productosConAlerta.push({ product: p, stock: s, alert: 'agotado' })
        } else if (alert === 'bajo') {
          bajo++
          productosConAlerta.push({ product: p, stock: s, alert: 'bajo' })
        } else {
          optimo++
        }
      }
    }

    // Métricas por lotes (Vencimientos y Valorización por costo)
    let lotesProximos = 0
    let unidadesProximas = 0
    let lotesVencidos = 0
    let unidadesVencidas = 0

    const lotesCriticos: Array<{
      lot: (typeof lots)[0]
      product: (typeof products)[0] | undefined
      state: 'proximo' | 'vencido' | 'ok'
      days: number
    }> = []

    for (const lot of lots) {
      valorTotalCosto += lot.quantity * lot.cost
      const state = lotExpiryState(lot)
      const days = daysUntil(lot.expiry)
      const product = products.find((p) => p.id === lot.productId)

      if (state === 'vencido') {
        lotesVencidos++
        unidadesVencidas += lot.quantity
        if (lot.quantity > 0) {
          lotesCriticos.push({ lot, product, state, days })
        }
      } else if (state === 'proximo') {
        lotesProximos++
        unidadesProximas += lot.quantity
        if (lot.quantity > 0) {
          lotesCriticos.push({ lot, product, state, days })
        }
      }
    }

    // Ordenar lotes críticos por fecha de vencimiento más próxima (FEFO)
    lotesCriticos.sort((a, b) => {
      if (!a.lot.expiry) return 1
      if (!b.lot.expiry) return -1
      return new Date(a.lot.expiry).getTime() - new Date(b.lot.expiry).getTime()
    })

    // Desglose por categorías
    const categoriasMap: Record<
      string,
      { count: number; unidades: number; valor: number }
    > = {}
    for (const p of products) {
      const cat = p.category || 'Otros'
      const s = getStock(p.id)
      if (!categoriasMap[cat]) {
        categoriasMap[cat] = { count: 0, unidades: 0, valor: 0 }
      }
      categoriasMap[cat].count++
      categoriasMap[cat].unidades += s.physical
      categoriasMap[cat].valor += s.physical * p.salePrice
    }

    // Porcentajes de salud de stock
    const pctVigente = totalUnidadesFisicas > 0 ? Math.round((totalUnidadesVigentes / totalUnidadesFisicas) * 100) : 0
    const pctVencido = totalUnidadesFisicas > 0 ? Math.round((totalUnidadesVencidas / totalUnidadesFisicas) * 100) : 0

    return {
      agotados,
      bajo,
      optimo,
      totalUnidadesFisicas,
      totalUnidadesVigentes,
      totalUnidadesVencidas,
      totalReservas,
      valorTotalCosto,
      valorTotalVenta,
      lotesProximos,
      unidadesProximas,
      lotesVencidos,
      unidadesVencidas,
      productosConAlerta,
      lotesCriticos,
      categoriasMap,
      activos: products.filter((p) => p.status === 'activo').length,
      pctVigente,
      pctVencido,
    }
  }, [products, lots, getStock])

  return (
    <div className="space-y-6">
      {/* Encabezado sin menciones de HU */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          tag="Monitoreo Operativo en Tiempo Real"
          title="Dashboard de Inventario"
          description="Control centralizado de existencias, semáforo de reposición, vencimientos FEFO y valoración del almacén."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/entradas">
            <Button size="sm" className="gap-1.5 shadow-xs">
              <PackagePlus className="size-4" />
              Nueva entrada
            </Button>
          </Link>
          <Link href="/admin/vencimientos">
            <Button size="sm" variant="outline" className="gap-1.5 bg-white shadow-xs">
              <CalendarClock className="size-4" />
              Vencimientos
            </Button>
          </Link>
          <Link href="/admin/alertas">
            <Button size="sm" variant="outline" className="gap-1.5 bg-white shadow-xs">
              <AlertTriangle className="size-4 text-amber-600" />
              Alertas de stock
            </Button>
          </Link>
          <Link href="/admin/kardex">
            <Button size="sm" variant="outline" className="gap-1.5 bg-white shadow-xs">
              <FileSpreadsheet className="size-4 text-blue-600" />
              Kardex
            </Button>
          </Link>
          <Link href="/admin/inventario">
            <Button size="sm" variant="outline" className="gap-1.5 bg-white shadow-xs">
              <Warehouse className="size-4" />
              Stock actual
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BARRA VISUAL DE SALUD DEL ALMACÉN (INDICADOR GRÁFICO)     */}
      {/* ========================================================= */}
      <div className="rounded-xl border border-border/80 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Boxes className="size-4" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Estado Físico del Almacén
              </p>
              <p className="text-sm font-semibold text-foreground">
                {metrics.totalUnidadesFisicas} unidades físicas en {lots.length} lotes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-foreground">{metrics.totalUnidadesVigentes} vigentes</span>
              <span className="text-muted-foreground">({metrics.pctVigente}%)</span>
            </div>
            {metrics.totalUnidadesVencidas > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-600 animate-pulse" />
                <span className="font-semibold text-red-700">{metrics.totalUnidadesVencidas} vencidas</span>
                <span className="text-muted-foreground">({metrics.pctVencido}%)</span>
              </div>
            )}
          </div>
        </div>

        {/* Barra de progreso multicolor */}
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${metrics.pctVigente}%` }}
            title={`Vigentes: ${metrics.pctVigente}%`}
          />
          {metrics.pctVencido > 0 && (
            <div
              className="h-full bg-red-600 transition-all duration-500"
              style={{ width: `${metrics.pctVencido}%` }}
              title={`Vencidas: ${metrics.pctVencido}%`}
            />
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6 INDICADORES PRINCIPALES INTERACTIVOS Y VISUALES         */}
      {/* ========================================================= */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* 1. Productos agotados */}
        <Link href="/admin/inventario?estado=agotado" className="group">
          <Card className="h-full overflow-hidden border border-slate-200 transition-all duration-200 hover:-translate-y-1 hover:border-red-400 hover:shadow-md bg-white">
            <div className="h-1.5 w-full bg-red-600" />
            <CardContent className="flex flex-col justify-between p-4 h-[calc(100%-6px)]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">
                    Agotados
                  </span>
                  <div className="rounded-lg bg-red-100 p-2 text-red-700 shadow-2xs group-hover:scale-105 transition-transform">
                    <PackageX className="size-4" />
                  </div>
                </div>
                <div className="my-2.5">
                  <p className="text-3xl font-extrabold tabular-nums text-red-700">
                    {metrics.agotados}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Sin unidades vendibles
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-red-600 transition-colors group-hover:text-red-700 pt-2 border-t border-slate-100">
                <span>Ver productos</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* 2. Stock bajo */}
        <Link href="/admin/inventario?estado=bajo" className="group">
          <Card className="h-full overflow-hidden border border-slate-200 transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md bg-white">
            <div className="h-1.5 w-full bg-amber-500" />
            <CardContent className="flex flex-col justify-between p-4 h-[calc(100%-6px)]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                    Stock bajo
                  </span>
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-800 shadow-2xs group-hover:scale-105 transition-transform">
                    <AlertTriangle className="size-4" />
                  </div>
                </div>
                <div className="my-2.5">
                  <p className="text-3xl font-extrabold tabular-nums text-amber-800">
                    {metrics.bajo}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Bajo el mínimo definido
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 transition-colors group-hover:text-amber-900 pt-2 border-t border-slate-100">
                <span>Ver alertas</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* 3. Próximos a vencer */}
        <Link href="/admin/vencimientos?filter=proximo" className="group">
          <Card className="h-full overflow-hidden border border-slate-200 transition-all duration-200 hover:-translate-y-1 hover:border-orange-400 hover:shadow-md bg-white">
            <div className="h-1.5 w-full bg-orange-500" />
            <CardContent className="flex flex-col justify-between p-4 h-[calc(100%-6px)]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">
                    Por vencer
                  </span>
                  <div className="rounded-lg bg-orange-100 p-2 text-orange-800 shadow-2xs group-hover:scale-105 transition-transform">
                    <CalendarClock className="size-4" />
                  </div>
                </div>
                <div className="my-2.5">
                  <p className="text-3xl font-extrabold tabular-nums text-orange-800">
                    {metrics.lotesProximos}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {metrics.unidadesProximas} und. (≤ 30 días)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-orange-800 transition-colors group-hover:text-orange-900 pt-2 border-t border-slate-100">
                <span>Rotación FEFO</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* 4. Lotes caducados (Bloqueados) */}
        <Link href="/admin/vencimientos?filter=vencido" className="group">
          <Card className="h-full overflow-hidden border border-slate-200 transition-all duration-200 hover:-translate-y-1 hover:border-red-400 hover:shadow-md bg-white">
            <div className="h-1.5 w-full bg-red-700" />
            <CardContent className="flex flex-col justify-between p-4 h-[calc(100%-6px)]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">
                    Caducados
                  </span>
                  <div className="rounded-lg bg-red-100 p-2 text-red-700 shadow-2xs group-hover:scale-105 transition-transform">
                    <ShieldAlert className="size-4" />
                  </div>
                </div>
                <div className="my-2.5">
                  <p className="text-3xl font-extrabold tabular-nums text-red-700">
                    {metrics.lotesVencidos}
                  </p>
                  <p className="text-[11px] text-red-600 font-medium">
                    {metrics.unidadesVencidas} und. bloqueadas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-red-700 transition-colors group-hover:text-red-800 pt-2 border-t border-slate-100">
                <span>Retirar merma</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* 5. Reservas activas */}
        <Link href="/admin/inventario?estado=reservas" className="group">
          <Card className="h-full overflow-hidden border border-slate-200 transition-all duration-200 hover:-translate-y-1 hover:border-violet-400 hover:shadow-md bg-white">
            <div className="h-1.5 w-full bg-violet-600" />
            <CardContent className="flex flex-col justify-between p-4 h-[calc(100%-6px)]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-violet-800">
                    Reservas
                  </span>
                  <div className="rounded-lg bg-violet-100 p-2 text-violet-800 shadow-2xs group-hover:scale-105 transition-transform">
                    <BookmarkCheck className="size-4" />
                  </div>
                </div>
                <div className="my-2.5">
                  <p className="text-3xl font-extrabold tabular-nums text-violet-800">
                    {metrics.totalReservas}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Comprometidas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-violet-800 transition-colors group-hover:text-violet-900 pt-2 border-t border-slate-100">
                <span>Ver pedidos</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* 6. Valor aproximado del inventario */}
        <Link href="/admin/inventario" className="group">
          <Card className="h-full overflow-hidden border border-slate-200 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-400 hover:shadow-md bg-white">
            <div className="h-1.5 w-full bg-emerald-600" />
            <CardContent className="flex flex-col justify-between p-4 h-[calc(100%-6px)]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Valoración
                  </span>
                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-800 shadow-2xs group-hover:scale-105 transition-transform">
                    <CircleDollarSign className="size-4" />
                  </div>
                </div>
                <div className="my-2.5">
                  <p className="text-xl font-extrabold tabular-nums text-emerald-800">
                    {formatCurrency(metrics.valorTotalCosto)}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Costo en almacén
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 transition-colors group-hover:text-emerald-900 pt-2 border-t border-slate-100">
                <span>PVP: {formatCurrency(metrics.valorTotalVenta)}</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ========================================================= */}
      {/* SECCIÓN DETALLADA: PANELES OPERATIVOS CON BARRAS          */}
      {/* ========================================================= */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna 1: Alertas de Stock y Reposición */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3 bg-slate-50/50 border-b border-border/40">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <AlertTriangle className="size-4 text-amber-600" />
                Semáforo de Reposición Prioritaria
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Artículos que alcanzaron o superaron el nivel de stock de seguridad.
              </p>
            </div>
            <Link href="/admin/inventario?estado=bajo">
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs font-semibold text-primary">
                Ver todos ({metrics.productosConAlerta.length})
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {metrics.productosConAlerta.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
                <PackageCheck className="size-8 text-emerald-600 mb-2" />
                <p className="font-semibold text-foreground">
                  Inventario en niveles óptimos
                </p>
                <p className="text-xs">
                  Todos los productos activos cuentan con existencias sobre el mínimo.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/40">
                    <TableHead>Producto</TableHead>
                    <TableHead>Alerta</TableHead>
                    <TableHead className="w-[110px]">Nivel vs Mínimo</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.productosConAlerta.slice(0, 5).map(({ product, stock, alert }) => {
                    const ratio = Math.min(100, Math.round((stock.available / product.minStock) * 100))
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <ProductThumb
                              src={product.image}
                              alt={product.name}
                              className="size-8 rounded border shadow-2xs shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold leading-tight text-foreground truncate max-w-[170px]">
                                {product.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {product.category}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StockAlertBadge alert={alert} />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs tabular-nums">
                              <span className="font-bold text-foreground">{stock.available}</span>
                              <span className="text-muted-foreground text-[11px]">/ {product.minStock} mín.</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${
                                  stock.available <= 0
                                    ? 'bg-red-600'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.max(ratio, 8)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href="/admin/entradas">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 font-medium bg-white">
                              <PackagePlus className="size-3" />
                              Abastecer
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Columna 2: Alertas de Vencimiento y Rotación FEFO */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3 bg-slate-50/50 border-b border-border/40">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <CalendarClock className="size-4 text-orange-600" />
                Vencimientos y Rotación FEFO
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Lotes próximos a vencer (≤ 30 días) o caducados bloqueados.
              </p>
            </div>
            <Link href="/admin/vencimientos">
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs font-semibold text-primary">
                Ver todos ({metrics.lotesCriticos.length})
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {metrics.lotesCriticos.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
                <CalendarClock className="size-8 text-emerald-600 mb-2" />
                <p className="font-semibold text-foreground">
                  Sin lotes por vencer ni caducados
                </p>
                <p className="text-xs">
                  Todas las fechas de caducidad se encuentran en rango seguro.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/40">
                    <TableHead>Lote / Producto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.lotesCriticos.slice(0, 5).map(({ lot, product, state, days }) => (
                    <TableRow key={lot.id}>
                      <TableCell>
                        <p className="text-xs font-bold text-foreground truncate max-w-[170px]">
                          {product?.name || 'Producto'}
                        </p>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          Lote: {lot.code}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {formatDate(lot.expiry)}
                      </TableCell>
                      <TableCell>
                        {days < 0 ? (
                          <span className="text-xs font-bold text-red-600">
                            Venció ({Math.abs(days)}d)
                          </span>
                        ) : days === 0 ? (
                          <span className="text-xs font-bold text-red-600">
                            Hoy
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-800">
                            En {days} días
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-bold">
                        {lot.quantity} und.
                      </TableCell>
                      <TableCell>
                        <ExpiryBadge state={state} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* RESUMEN POR CATEGORÍAS (CARDS MODERNAS CON ICONOS)        */}
      {/* ========================================================= */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3 bg-slate-50/50 border-b border-border/40">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Layers className="size-4 text-primary" />
            Distribución y Valoración por Línea de Producto
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Resumen consolidado de unidades existentes y valor comercial por categoría.
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {Object.entries(metrics.categoriasMap).map(([cat, data]) => (
              <div
                key={cat}
                className="group rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-primary/50 hover:shadow-xs transition-all"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-foreground">{cat}</p>
                  <div className="flex size-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Boxes className="size-3.5" />
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.count} productos · <span className="font-medium text-foreground">{data.unidades} und.</span>
                </p>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Valor PVP</span>
                  <span className="text-xs font-bold tabular-nums text-foreground">
                    {formatCurrency(data.valor)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

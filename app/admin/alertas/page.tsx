'use client'

// =============================================================
// Gestock · HU-08: Gestionar alertas de stock mínimo
// Criterio 1: Stock disponible > 0 y <= stock mínimo -> "Stock bajo".
// Criterio 2: Stock disponible = 0 -> "Agotado".
// Criterio 3: Entrada eleva stock sobre mínimo -> alerta desaparece automáticamente.
// Criterio 4: Reactividad ante cualquier venta, entrada, reserva o ajuste.
// =============================================================

import { Suspense, useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  PackagePlus,
  PackageX,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Warehouse,
} from 'lucide-react'
import { useStore, getAlertState } from '@/lib/store'
import { PageHeader } from '@/components/admin/page-header'
import { ProductThumb } from '@/components/product-thumb'
import { StockAlertBadge, ProductStatusBadge } from '@/components/status-badges'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/format'
import type { Product, StockInfo, StockAlertState } from '@/lib/types'

type AlertFilter = 'criticos' | 'agotado' | 'bajo' | 'todos'

function AlertasContent() {
  const { products, getStock } = useStore()
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filtro') as AlertFilter | null

  const [activeTab, setActiveTab] = useState<AlertFilter>(filterParam || 'criticos')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (filterParam) {
      setActiveTab(filterParam)
    }
  }, [filterParam])

  // Evaluamos todas las alertas de productos activos en tiempo real (Criterios 1, 2, 3 y 4)
  const evaluatedProducts = useMemo(() => {
    return products
      .filter((p) => p.status === 'activo')
      .map((p) => {
        const stock = getStock(p.id)
        const alertState = getAlertState(stock.available, p.minStock)
        const deficit = Math.max(0, p.minStock - stock.available)
        const percentFilled =
          p.minStock > 0 ? Math.min(100, Math.round((stock.available / p.minStock) * 100)) : 100

        return {
          product: p,
          stock,
          alertState,
          deficit,
          percentFilled,
        }
      })
  }, [products, getStock])

  // Contadores de métricas
  const counts = useMemo(() => {
    let agotados = 0
    let bajo = 0
    let optimo = 0

    for (const item of evaluatedProducts) {
      if (item.alertState === 'agotado') agotados++
      else if (item.alertState === 'bajo') bajo++
      else optimo++
    }

    return {
      agotados,
      bajo,
      optimo,
      criticos: agotados + bajo,
      total: evaluatedProducts.length,
    }
  }, [evaluatedProducts])

  // Filtrado según pestaña y buscador
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return evaluatedProducts.filter(({ product, alertState }) => {
      // Filtro de texto
      if (q) {
        const matchName = product.name.toLowerCase().includes(q)
        const matchBarcode = product.barcode.includes(q)
        const matchCategory = product.category.toLowerCase().includes(q)
        if (!matchName && !matchBarcode && !matchCategory) return false
      }

      // Filtro por pestaña
      if (activeTab === 'criticos') {
        return alertState === 'agotado' || alertState === 'bajo'
      }
      if (activeTab === 'agotado') {
        return alertState === 'agotado'
      }
      if (activeTab === 'bajo') {
        return alertState === 'bajo'
      }
      return true // 'todos'
    })
  }, [evaluatedProducts, activeTab, searchQuery])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          hu="HU-08"
          title="Alertas de stock mínimo"
          description="Alertas dinámicas basadas en el stock disponible. Un producto entra en 'Stock bajo' cuando su disponible es menor o igual al mínimo, y en 'Agotado' cuando llega a 0. Se actualizan tras cualquier movimiento."
        />
        <div className="flex items-center gap-2">
          <Link href="/admin/entradas">
            <Button size="sm" className="gap-2 shadow-xs">
              <PackagePlus className="size-4" />
              <span>Registrar entrada general</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TARJETAS RESUMEN (PROTOTIPO HU-08)                         */}
      {/* ========================================================= */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 1. Productos Agotados */}
        <Card
          onClick={() => setActiveTab('agotado')}
          className={`cursor-pointer border-2 transition-all duration-200 bg-white ${
            activeTab === 'agotado'
              ? 'border-red-500 ring-2 ring-red-200 shadow-sm'
              : 'border-border/80 hover:border-red-300 hover:shadow-2xs'
          }`}
        >
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <PackageX className="size-6" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-red-700 tabular-nums">
                  {counts.agotados}
                </p>
                <p className="text-xs font-semibold text-slate-700">
                  Productos agotados
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Stock disponible en 0
                </p>
              </div>
            </div>
            {counts.agotados > 0 && (
              <span className="flex size-2.5 rounded-full bg-red-600 animate-ping" />
            )}
          </CardContent>
        </Card>

        {/* 2. Con Stock Bajo */}
        <Card
          onClick={() => setActiveTab('bajo')}
          className={`cursor-pointer border-2 transition-all duration-200 bg-white ${
            activeTab === 'bajo'
              ? 'border-amber-500 ring-2 ring-amber-200 shadow-sm'
              : 'border-border/80 hover:border-amber-300 hover:shadow-2xs'
          }`}
        >
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-amber-800 tabular-nums">
                  {counts.bajo}
                </p>
                <p className="text-xs font-semibold text-slate-700">
                  Con stock bajo
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Menor o igual al stock mínimo
                </p>
              </div>
            </div>
            {counts.bajo > 0 && (
              <span className="flex size-2.5 rounded-full bg-amber-500" />
            )}
          </CardContent>
        </Card>

        {/* 3. Con Stock Óptimo */}
        <Card
          onClick={() => setActiveTab('todos')}
          className={`cursor-pointer border-2 transition-all duration-200 bg-white ${
            activeTab === 'todos'
              ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-sm'
              : 'border-border/80 hover:border-emerald-300 hover:shadow-2xs'
          }`}
        >
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-emerald-700 tabular-nums">
                  {counts.optimo}
                </p>
                <p className="text-xs font-semibold text-slate-700">
                  Con stock óptimo
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Por encima del mínimo definido
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* BARRA DE HERRAMIENTAS: PESTAÑAS Y BUSCADOR               */}
      {/* ========================================================= */}
      <Card className="border-border/80 bg-white shadow-2xs">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as AlertFilter)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-4 sm:w-auto">
                <TabsTrigger value="criticos" className="text-xs">
                  Críticos ({counts.criticos})
                </TabsTrigger>
                <TabsTrigger value="agotado" className="text-xs text-red-700">
                  Agotados ({counts.agotados})
                </TabsTrigger>
                <TabsTrigger value="bajo" className="text-xs text-amber-800">
                  Stock bajo ({counts.bajo})
                </TabsTrigger>
                <TabsTrigger value="todos" className="text-xs">
                  Todos ({counts.total})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-slate-50/50 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================= */}
      {/* LISTA DE ALERTAS DINÁMICAS (DISEÑO PROTOTIPO PÁG 17)      */}
      {/* ========================================================= */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <Card className="border-border/80 bg-white p-12 text-center shadow-2xs">
            <div className="flex flex-col items-center justify-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
                <CheckCircle2 className="size-8" />
              </div>
              <h3 className="font-bold text-base text-foreground">
                No hay alertas activas en esta sección
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                {activeTab === 'criticos'
                  ? '¡Excelente! Todos los productos activos cuentan con stock suficiente por encima de sus mínimos establecidos.'
                  : 'No se encontraron artículos para el criterio de búsqueda actual.'}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-xs h-8"
                >
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          </Card>
        ) : (
          filteredList.map(({ product, stock, alertState, deficit, percentFilled }) => {
            const isAgotado = alertState === 'agotado'
            const isBajo = alertState === 'bajo'

            return (
              <Card
                key={product.id}
                className={`overflow-hidden border transition-all duration-150 bg-white shadow-2xs hover:shadow-xs ${
                  isAgotado
                    ? 'border-red-200 hover:border-red-300'
                    : isBajo
                    ? 'border-amber-200 hover:border-amber-300'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                  {/* Lado izquierdo: indicador + producto + mensaje */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Indicador de color */}
                    <div className="shrink-0 flex items-center justify-center">
                      {isAgotado ? (
                        <span className="relative flex size-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full size-3 bg-red-600" />
                        </span>
                      ) : isBajo ? (
                        <span className="size-3 rounded-full bg-amber-500 shrink-0" />
                      ) : (
                        <span className="size-3 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>

                    {/* Imagen miniatura */}
                    <ProductThumb
                      src={product.image}
                      alt={product.name}
                      className="size-11 rounded-lg shrink-0 border border-slate-100"
                    />

                    {/* Nombre y texto descriptivo de la alerta */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground truncate">
                          {product.name}
                        </p>
                        <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                          ({product.barcode})
                        </span>
                      </div>

                      {/* Mensaje dinámico según Criterios 1 y 2 */}
                      <p
                        className={`text-xs mt-0.5 font-medium ${
                          isAgotado
                            ? 'text-red-600'
                            : isBajo
                            ? 'text-amber-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {isAgotado && 'Agotado — requiere reposición inmediata'}
                        {isBajo &&
                          `Stock bajo — disponible ${stock.available} de un mínimo de ${product.minStock}`}
                        {!isAgotado &&
                          !isBajo &&
                          `En stock — disponible ${stock.available} (Mínimo: ${product.minStock})`}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                        <span>Categoría: {product.category}</span>
                        <span>•</span>
                        <span>Físico total: {stock.physical}</span>
                        {stock.expired > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-red-600 font-semibold">
                              {stock.expired} vencidas
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lado derecho: número disponible y botón Registrar entrada */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="flex items-baseline gap-1.5 sm:justify-end">
                        <span
                          className={`text-2xl font-black tabular-nums ${
                            isAgotado
                              ? 'text-red-600'
                              : isBajo
                              ? 'text-amber-700'
                              : 'text-slate-800'
                          }`}
                        >
                          {stock.available}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          disponible
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Mínimo requerido: {product.minStock}
                      </p>
                    </div>

                    {/* Botón de acción directo para registrar entrada */}
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/entradas?producto=${product.id}`}>
                        <Button
                          size="sm"
                          variant={isAgotado ? 'default' : 'outline'}
                          className={`gap-1.5 text-xs font-semibold h-9 ${
                            isAgotado
                              ? 'bg-red-600 hover:bg-red-700 text-white shadow-2xs'
                              : 'hover:bg-amber-50 hover:text-amber-900 border-amber-300'
                          }`}
                        >
                          <PackagePlus className="size-3.5" />
                          <span>Registrar entrada</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso de stock respecto al mínimo */}
                {product.minStock > 0 && (
                  <div className="h-1.5 w-full bg-slate-100 flex overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isAgotado
                          ? 'bg-red-600'
                          : isBajo
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percentFilled}%` }}
                    />
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Regla de negocio y aclaración informativa */}
      <Card className="border-blue-200 bg-blue-50/50 p-4 rounded-xl">
        <div className="flex gap-3">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-700 shrink-0 h-fit">
            <Sparkles className="size-4" />
          </div>
          <div className="text-xs text-blue-900 leading-relaxed space-y-1">
            <p className="font-bold">Reglas de evaluación automática del inventario:</p>
            <p>
              • <strong>Agotado:</strong> Se activa cuando el stock vendible disponible llega exactamente a 0. Las unidades caducadas no cuentan como disponibles.
            </p>
            <p>
              • <strong>Stock bajo:</strong> Se activa en el momento en que las existencias disponibles se encuentran en o por debajo del stock mínimo configurado.
            </p>
            <p>
              • <strong>Recuperación automática:</strong> Toda recepción de mercadería (HU-04) que incremente el disponible por encima del mínimo retira automáticamente al producto de la lista de alertas.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function AlertasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Cargando panel de alertas de stock…
        </div>
      }
    >
      <AlertasContent />
    </Suspense>
  )
}


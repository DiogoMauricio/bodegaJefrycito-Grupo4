'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Receipt,
  CheckCircle2,
  Calendar,
  Layers,
  Printer,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { formatCurrency } from '@/lib/format'
import { PageHeader } from '@/components/admin/page-header'
import { ProductThumb } from '@/components/product-thumb'
import { StockStatusBadge } from '@/components/status-badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { SaleResult } from '@/lib/types'

type Ticket = Record<string, number>

export default function VentasPage() {
  const { products, getStock, getAlertState, registerSale } = useStore()
  const [query, setQuery] = useState('')
  const [ticket, setTicket] = useState<Ticket>({})

  // Estado para modal de confirmación con detalle FEFO
  const [saleResultModal, setSaleResultModal] = useState<SaleResult | null>(null)
  const [lastTotal, setLastTotal] = useState(0)

  // Criterio 4: Solo productos activos se comercializan
  const sellable = useMemo(
    () => products.filter((p) => p.status === 'activo'),
    [products],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sellable
    return sellable.filter(
      (p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q),
    )
  }, [sellable, query])

  // Criterio 2 y 3: Validar disponibilidad antes de agregar
  function add(productId: string) {
    const stock = getStock(productId)
    const current = ticket[productId] ?? 0
    if (current + 1 > stock.available) {
      toast.error('Stock insuficiente para agregar más unidades.')
      return
    }
    setTicket((t) => ({ ...t, [productId]: current + 1 }))
  }

  function decrease(productId: string) {
    setTicket((t) => {
      const next = { ...t }
      const val = (next[productId] ?? 0) - 1
      if (val <= 0) delete next[productId]
      else next[productId] = val
      return next
    })
  }

  function removeLine(productId: string) {
    setTicket((t) => {
      const next = { ...t }
      delete next[productId]
      return next
    })
  }

  const lines = Object.entries(ticket).map(([productId, qty]) => {
    const product = products.find((p) => p.id === productId)!
    return { product, qty, subtotal: product.salePrice * qty }
  })
  const total = lines.reduce((sum, l) => sum + l.subtotal, 0)

  function confirm() {
    if (lines.length === 0) {
      toast.error('Agrega productos al ticket.')
      return
    }

    const currentTotal = total
    const res = registerSale(
      lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
    )

    if (!res.ok) {
      toast.error(res.error || 'Error al procesar la venta.')
      return
    }

    toast.success(
      `Venta ${res.reference} registrada. Se descontó del inventario aplicando FEFO.`,
    )

    setLastTotal(currentTotal)
    setSaleResultModal(res)
    setTicket({})
  }

  return (
    <div className="space-y-6">
      <PageHeader
        hu="HU-05"
        title="Punto de venta"
        description="Registra ventas de productos disponibles. La venta valida stock disponible (no físico), bloquea productos vencidos e inactivos, y descuenta primero del lote con vencimiento más próximo (FEFO)."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Catálogo de productos disponibles */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto por nombre o código"
              className="pl-9 h-11 bg-white shadow-2xs"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((product) => {
              const stock = getStock(product.id)
              const alert = getAlertState(product.id)
              const disabled = stock.available <= 0

              return (
                <Card
                  key={product.id}
                  className={`transition-all duration-150 border-border/80 shadow-2xs ${
                    disabled
                      ? 'opacity-60 bg-slate-50/70 border-dashed'
                      : 'hover:shadow-md hover:border-primary/30 bg-white'
                  }`}
                >
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                      <ProductThumb
                        src={product.image}
                        alt={product.name}
                        className="size-16 shrink-0 rounded-lg bg-slate-50 p-1 border border-border/40"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight text-slate-800 line-clamp-2">
                          {product.name}
                        </p>
                        <p className="mt-1.5 font-bold text-primary text-base">
                          {formatCurrency(product.salePrice)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <span className="text-xs text-muted-foreground">
                        Disp:{' '}
                        <span
                          className={`font-bold tabular-nums ${
                            stock.available <= 0
                              ? 'text-red-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {stock.available}
                        </span>
                      </span>
                      <StockStatusBadge alert={alert} />
                    </div>

                    <Button
                      size="sm"
                      variant={disabled ? 'outline' : 'default'}
                      disabled={disabled}
                      onClick={() => add(product.id)}
                      className="w-full mt-1 font-medium gap-1.5 shadow-2xs"
                    >
                      <Plus className="size-4" />
                      Agregar
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground bg-white">
              No se encontraron productos disponibles con ese criterio de búsqueda.
            </div>
          )}
        </div>

        {/* Ticket de venta */}
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-6 shadow-sm border-border bg-white">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <ShoppingCart className="size-4" />
                  </div>
                  <h2 className="font-semibold text-slate-900">Ticket de venta</h2>
                </div>
                {lines.length > 0 && (
                  <span className="text-xs font-semibold rounded-full bg-primary/10 text-primary px-2.5 py-0.5">
                    {lines.reduce((s, l) => s + l.qty, 0)} items
                  </span>
                )}
              </div>

              {lines.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <ShoppingCart className="mx-auto size-10 stroke-[1.5] text-slate-300 mb-2" />
                  <p className="text-sm font-medium">Aún no agregas productos.</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Selecciona productos del catálogo para armar la venta.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                  {lines.map(({ product, qty, subtotal }) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 p-2.5 bg-slate-50/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(product.salePrice)} c/u
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-white rounded-md border border-border/60 p-0.5 shadow-2xs">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-slate-600 hover:bg-slate-100"
                          onClick={() => decrease(product.id)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-xs font-semibold tabular-nums text-slate-800">
                          {qty}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-slate-600 hover:bg-slate-100"
                          onClick={() => add(product.id)}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <span className="w-16 text-right text-sm font-semibold tabular-nums text-slate-800">
                        {formatCurrency(subtotal)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                        onClick={() => removeLine(product.id)}
                        aria-label="Quitar"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 border-t border-border pt-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(total)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>IGV (incluido)</span>
                  <span className="tabular-nums">{formatCurrency(total * 0.18)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200/80 pt-2">
                  <span className="text-base font-bold text-slate-900">Total</span>
                  <span className="text-2xl font-bold tabular-nums text-primary">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <Button
                className="mt-5 w-full h-11 text-base font-semibold shadow-sm"
                disabled={lines.length === 0}
                onClick={confirm}
              >
                <Receipt className="size-4 mr-2" />
                Confirmar venta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Comprobante y Desglose FEFO */}
      <Dialog
        open={!!saleResultModal}
        onOpenChange={(open) => !open && setSaleResultModal(null)}
      >
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader className="text-center sm:text-left">
            <div className="mx-auto sm:mx-0 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <CheckCircle2 className="size-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              ¡Venta registrada con éxito!
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Comprobante:{' '}
              <span className="font-semibold text-slate-800">
                {saleResultModal?.reference}
              </span>{' '}
              · Descontado del inventario según FEFO.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 border-y border-border">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-4 text-slate-400" /> Fecha y hora:
              </span>
              <span className="font-medium text-slate-800">
                {new Date().toLocaleString('es-PE')}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total cobrado:</span>
              <span className="text-lg font-bold text-primary tabular-nums">
                {formatCurrency(lastTotal)}
              </span>
            </div>

            {/* Trazabilidad FEFO */}
            <div className="rounded-lg bg-slate-50 border border-slate-200/70 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Layers className="size-3.5 text-primary" />
                <span>Desglose de lotes afectados (Regla FEFO):</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                {saleResultModal?.details?.map((d, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-white rounded border border-slate-200/50 px-2 py-1"
                  >
                    <span className="font-medium truncate max-w-[200px]">
                      {d.productName}
                    </span>
                    <span className="text-slate-500">
                      Lote <span className="font-mono font-bold text-slate-800">{d.lotCode}</span>: -{d.qty} u.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                window.print()
              }}
              className="w-full sm:w-auto gap-2"
            >
              <Printer className="size-4" />
              Imprimir ticket
            </Button>
            <Button
              onClick={() => setSaleResultModal(null)}
              className="w-full sm:w-auto"
            >
              Nueva venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

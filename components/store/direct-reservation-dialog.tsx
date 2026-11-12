'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  BookmarkCheck,
  CheckCircle2,
  Clock,
  Copy,
  Minus,
  Plus,
  Store,
  Check,
  Sparkles,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { ProductThumb } from '@/components/product-thumb'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { Product } from '@/lib/types'

interface DirectReservationDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ConfirmedReservationData {
  code: string
  customer: string
  phone: string
  productName: string
  qty: number
  total: number
  expiresAt: string
}

export function DirectReservationDialog({
  product,
  open,
  onOpenChange,
}: DirectReservationDialogProps) {
  const { getStock, createReservation } = useStore()
  const [qty, setQty] = useState(1)
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [confirmedData, setConfirmedData] = useState<ConfirmedReservationData | null>(null)
  const [copied, setCopied] = useState(false)

  // Reset al abrir o cambiar de producto
  useEffect(() => {
    if (open) {
      setQty(1)
      setCustomer('')
      setPhone('')
      setNote('')
      setConfirmedData(null)
      setCopied(false)
    }
  }, [open, product])

  if (!product) return null

  const stock = getStock(product.id)
  const maxAvailable = stock.available
  const total = qty * product.salePrice

  const handleIncrement = () => {
    if (qty + 1 > maxAvailable) {
      toast.error(`Solo quedan ${maxAvailable} unidades disponibles.`)
      return
    }
    setQty((prev) => prev + 1)
  }

  const handleDecrement = () => {
    if (qty > 1) {
      setQty((prev) => prev - 1)
    }
  }

  const handleQtyChange = (val: string) => {
    const num = parseInt(val, 10)
    if (isNaN(num) || num < 1) {
      setQty(1)
    } else if (num > maxAvailable) {
      toast.error(`El stock disponible actual es de ${maxAvailable} unidades.`)
      setQty(maxAvailable)
    } else {
      setQty(num)
    }
  }

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()

    if (!customer.trim()) {
      toast.error('Por favor ingresa tu nombre completo.')
      return
    }
    if (!phone.trim()) {
      toast.error('Por favor ingresa un teléfono o WhatsApp de contacto.')
      return
    }
    if (qty > maxAvailable || maxAvailable <= 0) {
      toast.error('No hay suficiente stock disponible para completar la reserva.')
      return
    }

    const res = createReservation(customer.trim(), phone.trim(), note.trim(), [
      {
        productId: product.id,
        name: product.name,
        qty,
        price: product.salePrice,
      },
    ])

    if (!res.ok || !res.code) {
      toast.error(res.error || 'Ocurrió un error al procesar tu reserva.')
      return
    }

    // Fecha de expiración a 24 horas
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    setConfirmedData({
      code: res.code,
      customer: customer.trim(),
      phone: phone.trim(),
      productName: product.name,
      qty,
      total,
      expiresAt,
    })

    toast.success(`¡Reserva ${res.code} registrada con éxito! Stock apartado por 24 horas.`)
  }

  const handleCopyCode = () => {
    if (!confirmedData?.code) return
    navigator.clipboard.writeText(confirmedData.code)
    setCopied(true)
    toast.success('Código copiado al portapapeles.')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white p-0 overflow-hidden shadow-2xl border-border">
        {confirmedData ? (
          // Vista de éxito tras confirmar
          <div className="p-6 text-center space-y-5">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-xs">
              <CheckCircle2 className="size-8" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles className="size-3" />
                Reserva registrada con éxito
              </span>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-2">
                ¡Tus productos quedaron apartados!
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Presenta este código al momento de pagar y recoger en la bodega.
              </p>
            </div>

            {/* Código de reserva destacado */}
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Código único de reserva
              </span>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="font-mono text-2xl font-extrabold text-primary tracking-wider">
                  {confirmedData.code}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 bg-white border-primary/30 text-primary hover:bg-primary/10"
                  onClick={handleCopyCode}
                  title="Copiar código"
                >
                  {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>

            {/* Detalle del pedido */}
            <div className="rounded-lg bg-slate-50 p-3.5 text-left text-xs space-y-2 border border-slate-100">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-muted-foreground">Producto:</span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[200px]">
                  {confirmedData.productName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cantidad apartada:</span>
                <span className="font-semibold text-slate-800">{confirmedData.qty} unidades</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total a pagar en tienda:</span>
                <span className="font-extrabold text-sm text-primary">
                  {formatCurrency(confirmedData.total)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-[11px]">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3 text-amber-600" />
                  Válido hasta:
                </span>
                <span className="font-medium text-slate-700">
                  {formatDateTime(confirmedData.expiresAt)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              La reserva tiene una vigencia máxima de <strong>24 horas</strong>. Si no es retirada, el sistema liberará automáticamente las unidades reservadas.
            </p>

            <Button
              className="w-full font-semibold shadow-xs"
              onClick={() => onOpenChange(false)}
            >
              Entendido, volver al catálogo
            </Button>
          </div>
        ) : (
          // Formulario de reserva
          <form onSubmit={handleConfirm}>
            <DialogHeader className="p-5 pb-3 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <BookmarkCheck className="size-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Apartar producto en línea
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Recoge y paga en tienda dentro de las 24 horas.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Tarjeta resumen del producto */}
              <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-white p-3 shadow-2xs">
                <ProductThumb
                  src={product.image}
                  alt={product.name}
                  className="size-16 shrink-0 rounded-md bg-slate-50 p-1 border border-border/40 object-contain"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {product.category}
                  </span>
                  <p className="font-semibold text-sm text-slate-900 leading-snug line-clamp-2">
                    {product.name}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-bold text-primary text-base">
                      {formatCurrency(product.salePrice)}
                    </span>
                    <Badge variant="outline" className="text-[11px] font-medium border-emerald-200 bg-emerald-50 text-emerald-700">
                      {maxAvailable} disponibles
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Selector de cantidad */}
              <div className="rounded-lg bg-slate-50/80 p-3 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">
                    Cantidad a apartar:
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7 bg-white shadow-2xs"
                      onClick={handleDecrement}
                      disabled={qty <= 1}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={maxAvailable}
                      value={qty}
                      onChange={(e) => handleQtyChange(e.target.value)}
                      className="h-7 w-14 text-center font-bold text-sm bg-white px-1 shadow-2xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7 bg-white shadow-2xs"
                      onClick={handleIncrement}
                      disabled={qty >= maxAvailable}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/50">
                  <span className="text-muted-foreground">Total estimado a pagar:</span>
                  <span className="font-bold text-sm text-primary tabular-nums">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Datos de contacto */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="direct-customer" className="text-xs font-semibold text-slate-700">
                    Tu nombre y apellido <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="direct-customer"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    required
                    className="bg-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="direct-phone" className="text-xs font-semibold text-slate-700">
                    Teléfono o WhatsApp <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="direct-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 987 654 321"
                    required
                    className="bg-white text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Para identificarte al momento de recoger tu pedido en la bodega.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="direct-note" className="text-xs font-semibold text-slate-700">
                    Nota o preferencia de recojo (opcional)
                  </Label>
                  <Textarea
                    id="direct-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ej. Pasaré por la tarde, por favor apartar bolsa."
                    rows={2}
                    className="bg-white text-sm"
                  />
                </div>
              </div>

              {/* Información de recojo en tienda y vigencia */}
              <div className="rounded-lg bg-amber-50/70 p-3 border border-amber-200/60 text-[11px] text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Store className="size-3.5 text-amber-700" />
                  <span>Recojo y pago en Bodega Jefrysito</span>
                </div>
                <p className="text-amber-800/90 leading-tight">
                  Tus {qty} unidad(es) quedarán apartadas durante <strong>24 horas</strong>. No necesitas ingresar tarjeta ni crearte cuenta.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="font-semibold shadow-xs gap-1.5"
                disabled={maxAvailable <= 0}
              >
                <BookmarkCheck className="size-4" />
                Confirmar reserva ({formatCurrency(total)})
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

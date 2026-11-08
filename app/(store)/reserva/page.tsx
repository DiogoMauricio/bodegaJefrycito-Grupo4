'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Store, Clock, CheckCircle2, ArrowLeft } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useCart } from '@/lib/cart'
import { formatCurrency } from '@/lib/format'
import type { ReservationItem } from '@/lib/types'
import { ProductThumb } from '@/components/product-thumb'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function ReservaPage() {
  const { getProduct, getStock, createReservation } = useStore()
  const { items, setQty, clear } = useCart()
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null)

  const lines = Object.entries(items).map(([productId, qty]) => {
    const product = getProduct(productId)!
    return { product, qty, subtotal: product ? product.salePrice * qty : 0 }
  }).filter((line) => !!line.product)

  const total = lines.reduce((sum, l) => sum + l.subtotal, 0)

  // HU-12 CA-5: Validar disponibilidad antes de confirmar la reserva
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customer.trim()) return toast.error('Ingresa tu nombre completo.')
    if (!phone.trim()) return toast.error('Ingresa tu teléfono de contacto.')

    const reservationItems: ReservationItem[] = lines.map((l) => ({
      productId: l.product.id,
      name: l.product.name,
      qty: l.qty,
      price: l.product.salePrice,
    }))

    const res = createReservation(customer, phone, note, reservationItems)
    if (!res.ok) return toast.error(res.error || 'Error al procesar la reserva.')

    setConfirmedCode(res.code ?? null)
    clear()
  }

  if (confirmedCode) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-2xs">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
          ¡Reserva confirmada!
        </h1>
        <p className="mt-3 text-muted-foreground text-pretty">
          Tu código de reserva es{' '}
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
            {confirmedCode}
          </span>
          . Los productos quedaron apartados por 24 horas para tu recojo en tienda.
        </p>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: 'default' }), 'mt-6 shadow-sm inline-flex')}
        >
          Volver al catálogo
        </Link>
      </main>
    )
  }

  if (lines.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Tu carrito de reserva está vacío
        </h1>
        <p className="mt-2 text-muted-foreground">
          Agrega productos desde el catálogo para confirmar una reserva.
        </p>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'mt-6 shadow-2xs inline-flex items-center gap-2',
          )}
        >
          <ArrowLeft className="size-4" />
          Ir al catálogo
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Seguir comprando
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Confirmar reserva
      </h1>
      <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Store className="size-4 text-primary" />
          Reserva para recojo y pago en tienda
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Clock className="size-4 text-primary" />
          Vigencia máxima de 24 horas
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Formulario de contacto */}
        <Card className="lg:col-span-3 bg-white border-border shadow-2xs">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-semibold text-slate-900">
              Tus datos de contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form
              id="reserva-form"
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="customer" className="text-xs font-semibold text-slate-700">
                  Nombre completo
                </Label>
                <Input
                  id="customer"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Ej. María Quispe"
                  required
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                  Teléfono / WhatsApp
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="987 654 321"
                  required
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note" className="text-xs font-semibold text-slate-700">
                  Comentario (opcional)
                </Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej. Paso por la tarde a eso de las 4pm"
                  rows={3}
                  className="bg-white"
                />
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Resumen del carrito (HU-12) */}
        <Card className="lg:col-span-2 bg-white border-border shadow-2xs">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-semibold text-slate-900">
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {lines.map(({ product, qty, subtotal }) => {
                const stock = getStock(product.id)
                const over = qty > stock.available

                return (
                  <div key={product.id} className="flex gap-3 items-center">
                    <ProductThumb
                      src={product.image}
                      alt={product.name}
                      className="size-12 shrink-0 rounded bg-slate-50 p-1 border border-border/50"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight text-slate-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {qty} × {formatCurrency(product.salePrice)}
                      </p>
                      {over && (
                        <button
                          type="button"
                          onClick={() => setQty(product.id, stock.available)}
                          className="mt-1 text-xs text-red-600 font-medium underline"
                        >
                          Solo {stock.available} disp. — ajustar
                        </button>
                      )}
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-slate-800">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-muted-foreground">
                Total estimado
              </span>
              <span className="text-2xl font-bold tabular-nums text-primary">
                {formatCurrency(total)}
              </span>
            </div>

            <Button
              type="submit"
              form="reserva-form"
              className="w-full shadow-sm font-semibold h-11"
            >
              Confirmar reserva
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Al confirmar, apartamos las unidades y generamos un código único.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

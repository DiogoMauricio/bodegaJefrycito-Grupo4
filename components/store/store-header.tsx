'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ShoppingBag, Plus, Minus, Trash2, X, ShieldCheck } from 'lucide-react'
import { useCart } from '@/lib/cart'
import { useStore } from '@/lib/store'
import { formatCurrency } from '@/lib/format'
import { GestockLogo } from '@/components/gestock-logo'
import { ProductThumb } from '@/components/product-thumb'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function StoreHeader() {
  const { items, count, setQty, remove } = useCart()
  const { getProduct, getStock } = useStore()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const lines = Object.entries(items).map(([productId, qty]) => {
    const product = getProduct(productId)!
    return { product, qty, subtotal: product ? product.salePrice * qty : 0 }
  }).filter((line) => !!line.product)

  const total = lines.reduce((sum, l) => sum + l.subtotal, 0)

  // HU-12 CA-2: Si supera el disponible, detiene el incremento e informa
  function increment(productId: string, qty: number) {
    const stock = getStock(productId)
    if (qty + 1 > stock.available) {
      toast.error('Alcanzaste el máximo disponible de este producto.')
      return
    }
    setQty(productId, qty + 1)
  }

  // HU-12 CA-5: Revalidar disponibilidad antes de continuar a confirmación
  function goToReservation() {
    for (const { product, qty } of lines) {
      const stock = getStock(product.id)
      if (qty > stock.available) {
        toast.error(
          `"${product.name}" ya no tiene ${qty} disponibles. Ajusta tu carrito.`,
        )
        return
      }
    }
    setOpen(false)
    router.push('/reserva')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/">
          <GestockLogo />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'hidden sm:inline-flex items-center gap-1.5',
            )}
          >
            <ShieldCheck className="size-4" />
            Panel admin
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="relative"
            onClick={() => setOpen(true)}
          >
            <ShoppingBag className="size-4" />
            Carrito
            {count > 0 && (
              <Badge className="ml-1 border-transparent bg-primary text-primary-foreground">
                {count}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Cart drawer (HU-12) */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 font-semibold">
                <ShoppingBag className="size-4 text-primary" />
                Tu carrito de reserva
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="size-5" />
                <span className="sr-only">Cerrar</span>
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {lines.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Tu carrito está vacío. Agrega productos desde el catálogo.
                </p>
              ) : (
                <div className="space-y-4">
                  {lines.map(({ product, qty, subtotal }) => {
                    const stock = getStock(product.id)
                    return (
                      <div key={product.id} className="flex gap-3">
                        <ProductThumb
                          src={product.image}
                          alt={product.name}
                          className="size-16 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(product.salePrice)} c/u ·{' '}
                            {stock.available} disp.
                          </p>
                          <div className="mt-2 flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-7"
                              onClick={() => setQty(product.id, qty - 1)}
                            >
                              <Minus className="size-3" />
                            </Button>
                            <span className="w-7 text-center text-sm tabular-nums">
                              {qty}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-7"
                              onClick={() => increment(product.id, qty)}
                            >
                              <Plus className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="ml-auto size-7 text-muted-foreground hover:text-red-600"
                              onClick={() => remove(product.id)}
                              aria-label="Quitar"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        <span className="text-sm font-medium tabular-nums">
                          {formatCurrency(subtotal)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className={cn('border-t border-border px-5 py-4', lines.length === 0 && 'hidden')}>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total estimado
                </span>
                <span className="text-xl font-semibold tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>
              <Button className="w-full" onClick={goToReservation}>
                Continuar con la reserva
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                El carrito no aparta stock. El apartado se realiza al confirmar la
                reserva.
              </p>
            </div>
          </aside>
        </div>
      )}
    </header>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Search, Plus, Check } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useCart } from '@/lib/cart'
import { formatCurrency } from '@/lib/format'
import { ProductThumb } from '@/components/product-thumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function CatalogPage() {
  const { products, getStock } = useStore()
  const { items, add } = useCart()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')

  // HU-11 CA-1: Solo productos activos se muestran en el catálogo
  const catalog = useMemo(
    () => products.filter((p) => p.status === 'activo'),
    [products],
  )

  const categories = useMemo(
    () => ['Todas', ...Array.from(new Set(catalog.map((p) => p.category)))],
    [catalog],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter((p) => {
      const matchCat = category === 'Todas' || p.category === category
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q)
      return matchCat && matchQuery
    })
  }, [catalog, query, category])

  // HU-12 CA-1: Agregar al carrito con cantidad inicial 1
  function handleAdd(productId: string, name: string) {
    const stock = getStock(productId)
    const current = items[productId] ?? 0
    if (current + 1 > stock.available) {
      toast.error('Alcanzaste el máximo disponible de este producto.')
      return
    }
    add(productId)
    toast.success(`"${name}" agregado al carrito de reserva.`)
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Encabezado del catálogo (HU-11) */}
      <section className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-balance text-slate-900">
          Catálogo de la Bodega Jefrysito
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground text-pretty">
          Consulta los productos disponibles con precios actualizados y resérvalos
          en línea para recogerlos en tienda. No necesitas crear una cuenta.
        </p>
      </section>

      {/* Barra de búsqueda y categorías */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos"
            className="pl-9 bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'rounded-full border px-3.5 py-1 text-sm font-medium transition-colors cursor-pointer',
                category === c
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Cuadrícula de productos (HU-11) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => {
          const stock = getStock(product.id)
          // HU-11 CA-3 & CA-4: No vendible si no hay stock disponible (excluye vencidos y reservados)
          const soldOut = stock.available <= 0
          const inCart = items[product.id] ?? 0

          return (
            <Card
              key={product.id}
              className="overflow-hidden pt-0 bg-white border-border/80 shadow-2xs hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="relative aspect-square bg-slate-50 border-b border-slate-100 flex items-center justify-center p-4">
                <ProductThumb
                  src={product.image}
                  alt={product.name}
                  className="size-full max-h-48 object-contain rounded-none bg-transparent"
                />
                {soldOut && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-2xs">
                    <Badge className="border-transparent bg-red-100 text-red-700 font-semibold px-3 py-1">
                      Agotado
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="flex flex-1 flex-col p-4">
                <span className="text-xs font-medium text-muted-foreground">
                  {product.category}
                </span>
                <h2 className="mt-1 text-sm font-medium leading-tight text-slate-800 line-clamp-2 min-h-[2.5rem]">
                  {product.name}
                </h2>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(product.salePrice)}
                  </span>
                  {!soldOut ? (
                    <span className="text-xs font-medium text-slate-500 tabular-nums">
                      {stock.available} disp.
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-red-600">
                      Sin stock
                    </span>
                  )}
                </div>

                {/* HU-11 CA-2 & CA-3: Habilitado si hay stock disponible, deshabilitado si está agotado */}
                <Button
                  className="mt-4 w-full shadow-2xs font-medium"
                  variant={soldOut ? 'outline' : inCart > 0 ? 'secondary' : 'default'}
                  disabled={soldOut}
                  onClick={() => handleAdd(product.id, product.name)}
                >
                  {soldOut ? (
                    'Agotado'
                  ) : inCart > 0 ? (
                    <>
                      <Check className="size-4 mr-1 text-emerald-600" />
                      En carrito ({inCart})
                    </>
                  ) : (
                    <>
                      <Plus className="size-4 mr-1" />
                      Reservar
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground bg-white">
          No se encontraron productos disponibles en esta categoría o búsqueda.
        </div>
      )}
    </main>
  )
}

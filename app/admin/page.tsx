'use client'

// Página de inicio del panel tras iniciar sesión (HU-01).
// En Sprint 2 esta página se reemplaza por el Dashboard de inventario (HU-10).

import Link from 'next/link'
import { ArrowRight, Boxes, Package, PackagePlus, Warehouse } from 'lucide-react'
import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/admin/page-header'
import { Card, CardContent } from '@/components/ui/card'

export default function AdminHomePage() {
  const { products, getStock } = useStore()

  const activos = products.filter((p) => p.status === 'activo').length
  const unidades = products.reduce((sum, p) => sum + getStock(p.id).vigente, 0)

  const modules = [
    {
      href: '/admin/productos',
      icon: Package,
      title: 'Productos',
      hu: 'HU-02 / HU-03',
      text: 'Registrar productos y gestionar su información y estado.',
    },
    {
      href: '/admin/entradas',
      icon: PackagePlus,
      title: 'Entradas de mercadería',
      hu: 'HU-04',
      text: 'Registrar mercadería recibida con lote, costo y vencimiento.',
    },
    {
      href: '/admin/inventario',
      icon: Warehouse,
      title: 'Stock actual',
      hu: 'HU-07',
      text: 'Consultar stock físico, reservado y disponible por producto.',
    },
  ]

  return (
    <div>
      <PageHeader
        hu="HU-01"
        title="Panel de administración"
        description="Sesión iniciada correctamente. Selecciona un módulo para continuar."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{activos}</p>
              <p className="text-sm text-muted-foreground">Productos activos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex size-11 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Boxes className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{unidades}</p>
              <p className="text-sm text-muted-foreground">
                Unidades vigentes en almacén
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {modules.map((m) => {
          const Icon = m.icon
          return (
            <Link key={m.href} href={m.href} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-center gap-2">
                    <Icon className="size-5 text-primary" />
                    <p className="font-medium">{m.title}</p>
                    <ArrowRight className="ml-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="text-sm text-muted-foreground">{m.text}</p>
                  <p className="text-xs text-muted-foreground">{m.hu}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  House,
  Package,
  PackagePlus,
  Warehouse,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { GestockLogo } from '@/components/gestock-logo'
import { Button } from '@/components/ui/button'

type NavItem = {
  href: string
  label: string
  hu: string
  icon: React.ComponentType<{ className?: string }>
}

// Sprint 1. En Sprint 2 se agregan: Punto de venta (HU-05), Kardex (HU-06),
// Alertas (HU-08), Vencimientos (HU-09) y Dashboard (HU-10).
const NAV: NavItem[] = [
  { href: '/admin', label: 'Inicio', hu: 'HU-01', icon: House },
  { href: '/admin/productos', label: 'Productos', hu: 'HU-02/03', icon: Package },
  { href: '/admin/entradas', label: 'Entradas', hu: 'HU-04', icon: PackagePlus },
  { href: '/admin/inventario', label: 'Inventario', hu: 'HU-07', icon: Warehouse },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useStore()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login')
  }, [isAuthenticated, router])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Redirigiendo al inicio de sesión…
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <GestockLogo variant="invert" />
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="size-5" />
            <span className="sr-only">Cerrar menú</span>
          </Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV.map((item) => {
            const active =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] font-normal text-sidebar-foreground/50">
                  {item.hu}
                </span>
              </Link>
            )
          })}
        </nav>
        <div className="space-y-1 border-t border-sidebar-border px-3 py-3">
          <button
            onClick={() => {
              logout()
              router.replace('/login')
            }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
          <GestockLogo />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

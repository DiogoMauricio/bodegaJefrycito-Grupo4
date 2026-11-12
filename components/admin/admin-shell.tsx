'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  ShoppingCart,
  Warehouse,
  CalendarClock,
  AlertTriangle,
  FileSpreadsheet,
  SlidersHorizontal,
  Bell,
  LogOut,
  Menu,
  X,
  Store,
  ExternalLink,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { GestockLogo } from '@/components/gestock-logo'
import { Button } from '@/components/ui/button'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badgeKey?: 'reservations'
}

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/entradas', label: 'Entradas', icon: PackagePlus },
  { href: '/admin/ventas', label: 'Punto de venta', icon: ShoppingCart },
  { href: '/admin/inventario', label: 'Inventario', icon: Warehouse },
  { href: '/admin/alertas', label: 'Alertas de stock', icon: AlertTriangle },
  { href: '/admin/vencimientos', label: 'Vencimientos', icon: CalendarClock },
  { href: '/admin/reservas', label: 'Reservas y Notificaciones', icon: Bell, badgeKey: 'reservations' },
  { href: '/admin/kardex', label: 'Kardex', icon: FileSpreadsheet },
  { href: '/admin/ajustes', label: 'Ajustes', icon: SlidersHorizontal },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout, reservations } = useStore()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const pendingReservationsCount = reservations.filter(
    (r) => r.status === 'pendiente',
  ).length

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
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-sidebar-border/40">
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

        {/* Tienda badge */}
        <div className="px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/50 p-2.5 text-xs text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Store className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-sidebar-foreground">Bodega Jefrysito</p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ver catálogo web ↗</span>
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV.map((item) => {
            const active =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href)
            const Icon = item.icon
            const badgeCount = item.badgeKey === 'reservations' ? pendingReservationsCount : 0

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm font-semibold'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <div className="relative">
                  <Icon className={cn('size-4 shrink-0', active ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/70')} />
                  {badgeCount > 0 && item.badgeKey === 'reservations' && (
                    <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </div>
                <span className="flex-1">{item.label}</span>
                {badgeCount > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-amber-500 text-white font-bold px-2 py-0.5 text-[11px] leading-none shadow-2xs">
                    {badgeCount}
                  </span>
                )}
              </Link>
            )
          })}

          <div className="pt-2">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/30 px-3.5 py-2 text-xs font-semibold text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent hover:text-white"
            >
              <ExternalLink className="size-3.5 text-sidebar-primary" />
              <span>Ver Catálogo Web</span>
            </Link>
          </div>
        </nav>

        <div className="space-y-2 border-t border-sidebar-border/60 p-3">
          <div className="flex items-center gap-3 px-3 py-2 text-xs text-sidebar-foreground/70">
            <div className="flex size-7 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground font-semibold">
              A
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-sidebar-foreground">Johann Romero</p>
              <p className="truncate text-[11px] text-sidebar-foreground/50">johann.romero@usmp.pe</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout()
              router.replace('/login')
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="lg:hidden">
              <Menu className="size-5" />
              <span className="sr-only">Abrir menú</span>
            </Button>
            <div className="lg:hidden">
              <GestockLogo />
            </div>
            <span className="hidden lg:inline text-xs font-medium text-muted-foreground">
              Bodega Jefrysito · Panel de Control de Inventario y Operaciones
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin/reservas">
              <Button
                variant="outline"
                size="sm"
                className="relative gap-2 bg-white text-xs font-semibold shadow-2xs border-slate-200"
              >
                <Bell className="size-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Notificaciones de reservas</span>
                {pendingReservationsCount > 0 && (
                  <span className="rounded-full bg-amber-500 text-white font-bold px-1.5 py-0.5 text-[10px] leading-none">
                    {pendingReservationsCount}
                  </span>
                )}
              </Button>
            </Link>

            <Link href="/" target="_blank">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Store className="size-3.5" />
                <span className="hidden md:inline">Tienda Pública</span>
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}

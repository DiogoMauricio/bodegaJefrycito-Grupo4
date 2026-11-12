'use client'

// =============================================================
// Gestock · Gestión de Notificaciones y Reservas Web (HU-15)
// Supervisa en tiempo real los pedidos realizados por clientes:
// - Notificaciones internas de nuevas reservas
// - Confirmación para recojo en tienda
// - Rechazo con liberación inmediata de stock
// - Expiración automática tras 24 horas
// =============================================================

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Bell,
  BookmarkCheck,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldAlert,
  Store,
  Trash2,
  User,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { formatCurrency, formatDateTime, timeRemaining } from '@/lib/format'
import { PageHeader } from '@/components/admin/page-header'
import { ReservationStatusBadge } from '@/components/status-badges'
import { ProductThumb } from '@/components/product-thumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Reservation, ReservationStatus } from '@/lib/types'

type FilterStatus = 'todas' | 'pendiente' | 'confirmada' | 'expirada' | 'rechazada'

export default function AdminReservasPage() {
  const {
    reservations,
    confirmReservation,
    rejectReservation,
    expireReservation,
    processExpiredReservations,
    attendReservation,
    getProduct,
  } = useStore()

  const [filter, setFilter] = useState<FilterStatus>('todas')
  const [query, setQuery] = useState('')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [rejectingReservation, setRejectingReservation] = useState<Reservation | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Métricas de reservas
  const stats = useMemo(() => {
    let pendientes = 0
    let confirmadas = 0
    let expiradas = 0
    let rechazadas = 0
    let atendidas = 0
    let totalUnidadesComprometidas = 0
    let montoPendiente = 0

    for (const r of reservations) {
      if (r.status === 'pendiente') {
        pendientes++
        montoPendiente += r.total
        totalUnidadesComprometidas += r.items.reduce((s, it) => s + (it.qty ?? it.quantity ?? 0), 0)
      } else if (r.status === 'confirmada') {
        confirmadas++
        totalUnidadesComprometidas += r.items.reduce((s, it) => s + (it.qty ?? it.quantity ?? 0), 0)
      } else if (r.status === 'expirada') {
        expiradas++
      } else if (r.status === 'rechazada') {
        rechazadas++
      } else if (r.status === 'atendida') {
        atendidas++
      }
    }

    return {
      total: reservations.length,
      pendientes,
      confirmadas,
      expiradas,
      rechazadas,
      atendidas,
      totalUnidadesComprometidas,
      montoPendiente,
    }
  }, [reservations])

  // Filtrado y búsqueda
  const filteredReservations = useMemo(() => {
    const q = query.trim().toLowerCase()
    return reservations.filter((r) => {
      if (filter !== 'todas' && r.status !== filter) return false
      if (!q) return true
      const client = r.customer || r.clientName || ''
      const phone = r.phone || r.clientPhone || ''
      return (
        r.code.toLowerCase().includes(q) ||
        client.toLowerCase().includes(q) ||
        phone.includes(q) ||
        r.items.some((it) => (it.name || it.productName || '').toLowerCase().includes(q))
      )
    })
  }, [reservations, filter, query])

  // Manejadores de acciones
  const handleConfirm = (id: string, code: string) => {
    const res = confirmReservation(id)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(`Reserva ${code} confirmada. El pedido quedó listo para recojo en tienda.`)
  }

  const handleOpenReject = (res: Reservation) => {
    setRejectingReservation(res)
    setRejectionReason('')
  }

  const handleConfirmReject = () => {
    if (!rejectingReservation) return
    const res = rejectReservation(rejectingReservation.id, rejectionReason)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(
      `Reserva ${rejectingReservation.code} rechazada. Las unidades han sido liberadas y vuelven a estar disponibles.`,
    )
    setRejectingReservation(null)
    setRejectionReason('')
  }

  const handleCheckExpired = () => {
    const count = processExpiredReservations()
    if (count > 0) {
      toast.info(`Se procesaron ${count} reserva(s) que superaron las 24h. Stock liberado exitosamente.`)
    } else {
      toast.success('Todas las reservas activas se encuentran dentro del plazo de 24 horas.')
    }
  }

  const handleAttend = (id: string, code: string) => {
    const res = attendReservation(id)
    if (!res.ok) {
      toast.error(res.error || 'No se pudo registrar la entrega.')
      return
    }
    toast.success(`Reserva ${code} entregada con éxito. Se registró la venta en mostrador (FEFO).`)
  }

  return (
    <div className="space-y-6">
      {/* Encabezado sin menciones de HU */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          tag="Notificaciones de Reservas Web"
          title="Gestión de reservas y pedidos en tienda"
          description="Supervisa los pedidos generados por clientes desde la tienda web. Confirma los apartados para recojo en bodega, gestiona rechazos con liberación de stock y controla la expiración automática de 24 horas."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheckExpired}
            className="gap-1.5 bg-white shadow-xs"
          >
            <RefreshCw className="size-3.5 text-muted-foreground" />
            <span>Verificar expiradas (24h)</span>
          </Button>
          <Link href="/" target="_blank">
            <Button size="sm" className="gap-1.5 shadow-xs">
              <Store className="size-4" />
              <span>Nueva reserva (Cliente)</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Alerta si hay pedidos pendientes de preparar */}
      {stats.pendientes > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-amber-300 bg-gradient-to-r from-amber-500/10 via-amber-50 to-white p-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-2xs">
              <Bell className="size-5 animate-bounce" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-amber-950 text-sm sm:text-base">
                  Tienes {stats.pendientes} nueva(s) reserva(s) pendiente(s) de confirmación
                </h3>
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                  Acción requerida
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-900/90 leading-relaxed max-w-2xl">
                Los clientes apartaron sus productos para recojo en tienda. Revisa el detalle, prepara los artículos y pulsa <strong>&quot;Confirmar para recojo&quot;</strong> para notificar que el pedido está listo.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setFilter('pendiente')}
              className="hidden sm:inline-flex bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs shadow-xs"
            >
              Filtrar pendientes
            </Button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Pendientes */}
        <Card
          onClick={() => setFilter('pendiente')}
          className={`cursor-pointer overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            filter === 'pendiente'
              ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/40'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="h-1.5 w-full bg-amber-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Pendientes de preparar
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800 shadow-2xs">
                <Clock className="size-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums text-foreground">
                {stats.pendientes}
              </span>
              <span className="text-xs font-semibold text-amber-700">pedidos nuevos</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Total estimado: {formatCurrency(stats.montoPendiente)}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Confirmadas para recojo */}
        <Card
          onClick={() => setFilter('confirmada')}
          className={`cursor-pointer overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            filter === 'confirmada'
              ? 'ring-2 ring-sky-500 border-sky-500 bg-sky-50/40'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="h-1.5 w-full bg-sky-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                Listas para recojo
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-sky-100 text-sky-800 shadow-2xs">
                <BookmarkCheck className="size-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums text-foreground">
                {stats.confirmadas}
              </span>
              <span className="text-xs font-semibold text-sky-700">en espera de cliente</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Stock apartado en bodega
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Expiradas (24h) */}
        <Card
          onClick={() => setFilter('expirada')}
          className={`cursor-pointer overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            filter === 'expirada'
              ? 'ring-2 ring-slate-500 border-slate-500 bg-slate-50/50'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="h-1.5 w-full bg-slate-500" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Expiradas (24h)
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 shadow-2xs">
                <AlertOctagon className="size-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums text-foreground">
                {stats.expiradas}
              </span>
              <span className="text-xs font-semibold text-slate-600">no recogidas</span>
            </div>
            <p className="mt-1 text-xs text-emerald-600 font-medium">
              Unidades liberadas al stock
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Total de Reservas Registradas */}
        <Card
          onClick={() => setFilter('todas')}
          className={`cursor-pointer overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            filter === 'todas'
              ? 'ring-2 ring-primary border-primary bg-primary/5'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="h-1.5 w-full bg-primary" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total reservas registradas
              </span>
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-2xs">
                <Package className="size-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums text-foreground">
                {stats.total}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">historial total</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.totalUnidadesComprometidas} und. comprometidas activas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controles de Filtros y Búsqueda */}
      <div className="rounded-xl border border-border/80 bg-white p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilter('todas')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === 'todas'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span>Todas</span>
              <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] text-slate-800">
                {stats.total}
              </span>
            </button>
            <button
              onClick={() => setFilter('pendiente')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === 'pendiente'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100'
              }`}
            >
              <Clock className="size-3" />
              <span>Pendientes ({stats.pendientes})</span>
            </button>
            <button
              onClick={() => setFilter('confirmada')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === 'confirmada'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-sky-50 text-sky-900 border border-sky-200/80 hover:bg-sky-100'
              }`}
            >
              <BookmarkCheck className="size-3" />
              <span>Confirmadas ({stats.confirmadas})</span>
            </button>
            <button
              onClick={() => setFilter('expirada')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === 'expirada'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <AlertOctagon className="size-3" />
              <span>Expiradas ({stats.expiradas})</span>
            </button>
            <button
              onClick={() => setFilter('rechazada')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === 'rechazada'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-900 hover:bg-red-100'
              }`}
            >
              <XCircle className="size-3" />
              <span>Rechazadas ({stats.rechazadas})</span>
            </button>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código, cliente o teléfono..."
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Lista de Notificaciones y Reservas */}
      {filteredReservations.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-2">
            <Package className="size-10 text-muted-foreground/40" />
            <p className="text-base font-semibold text-foreground">No se encontraron reservas</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              No hay pedidos que coincidan con el filtro seleccionado. Puedes registrar una reserva de prueba desde la tienda pública.
            </p>
            <Link href="/" target="_blank" className="mt-2">
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <Store className="size-3.5" />
                Ir a Tienda Pública
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredReservations.map((res) => {
            const timeInfo = timeRemaining(res.expiresAt)
            const isPending = res.status === 'pendiente'
            const isConfirmed = res.status === 'confirmada'
            const isExpired = res.status === 'expirada'
            const isRejected = res.status === 'rechazada'
            const isAttended = res.status === 'atendida'

            return (
              <Card
                key={res.id}
                className={`flex flex-col overflow-hidden border transition-all duration-200 hover:shadow-md ${
                  isPending
                    ? 'border-amber-300 bg-amber-50/20'
                    : isConfirmed
                      ? 'border-sky-300 bg-sky-50/20'
                      : isExpired
                        ? 'border-slate-200 bg-slate-50/50 opacity-80'
                        : isRejected
                          ? 'border-red-200 bg-red-50/20 opacity-80'
                          : 'border-emerald-200 bg-emerald-50/20'
                }`}
              >
                {/* Cabecera de la notificación */}
                <div className="p-4 border-b border-border/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-extrabold tracking-wide text-foreground px-2 py-0.5 rounded bg-muted/80">
                      {res.code}
                    </span>
                    <ReservationStatusBadge status={res.status} />
                  </div>

                  <div className="mt-3 flex items-start gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-foreground truncate">{res.customer || res.clientName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono">{res.phone || res.clientPhone}</span>
                        {(res.phone || res.clientPhone) && (
                          <a
                            href={`https://wa.me/51${res.phone || res.clientPhone}?text=Hola%20${encodeURIComponent(
                              res.customer || res.clientName || 'Cliente',
                            )},%20te%20saludamos%20de%20Bodega%20Jefrysito%20respecto%20a%20tu%20reserva%20${res.code}.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                            title="Abrir chat en WhatsApp"
                          >
                            <MessageSquare className="size-3" />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {(res.note || res.notes) && (
                    <div className="mt-2.5 rounded-md bg-white/80 p-2 text-[11px] text-muted-foreground border border-border/40">
                      <strong className="text-foreground">Nota del cliente:</strong> {res.note || res.notes}
                    </div>
                  )}

                  {res.rejectionReason && (
                    <div className="mt-2.5 rounded-md bg-red-100/70 p-2 text-[11px] text-red-800 border border-red-200">
                      <strong className="text-red-900">Motivo rechazo:</strong> {res.rejectionReason}
                    </div>
                  )}
                </div>

                {/* Lista de productos solicitados */}
                <div className="p-4 flex-1 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Productos reservados ({res.items.length})
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {res.items.map((item, idx) => {
                      const prod = getProduct(item.productId)
                      const itemName = item.name || item.productName || 'Producto'
                      const itemQty = item.qty ?? item.quantity ?? 1
                      const itemPrice = item.price ?? item.unitPrice ?? 0
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                            <ProductThumb
                              src={prod?.image || '/placeholder.svg'}
                              alt={itemName}
                              className="size-6 rounded shrink-0"
                            />
                            <span className="truncate text-foreground font-medium">
                              {itemName}
                            </span>
                          </div>
                          <span className="font-semibold tabular-nums text-foreground shrink-0">
                            {itemQty} x {formatCurrency(itemPrice)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Pie con totales y vigencia de 24h */}
                <div className="p-4 bg-muted/20 border-t border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total estimado (pago en tienda)</p>
                      <p className="text-lg font-extrabold tabular-nums text-foreground">
                        {formatCurrency(res.total)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Vigencia 24h</p>
                      <div className="flex items-center gap-1 text-xs font-semibold">
                        <Clock className="size-3 text-muted-foreground" />
                        <span
                          className={
                            timeInfo.isExpired
                              ? 'text-red-600'
                              : timeInfo.minutes < 120
                                ? 'text-amber-700'
                                : 'text-foreground'
                          }
                        >
                          {timeInfo.text}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones operativas */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleConfirm(res.id, res.code)}
                          className="flex-1 bg-sky-600 hover:bg-sky-700 text-white text-xs gap-1 shadow-xs"
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span>Confirmar para recojo</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenReject(res)}
                          className="text-xs text-red-700 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="size-3.5" />
                          <span>Rechazar</span>
                        </Button>
                      </>
                    )}

                    {isConfirmed && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAttend(res.id, res.code)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 shadow-xs"
                        >
                          <PackageCheck className="size-3.5" />
                          <span>Entregar y cobrar</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenReject(res)}
                          className="text-xs text-red-600 hover:bg-red-50"
                        >
                          Rechazar
                        </Button>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedReservation(res)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Ver detalle
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Diálogo de rechazo con motivo (HU-15 Criterio 3) */}
      <Dialog
        open={Boolean(rejectingReservation)}
        onOpenChange={(open) => {
          if (!open) setRejectingReservation(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="size-5" />
              Rechazar reserva {rejectingReservation?.code}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Al rechazar esta reserva, las unidades comprometidas{' '}
              <strong>quedarán liberadas inmediatamente</strong> y volverán a estar disponibles para
              venta en mostrador u otras reservas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-foreground">
              Motivo del rechazo (opcional):
            </label>
            <Input
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ej: Cliente canceló vía telefónica / Producto con merma antes de entrega"
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectingReservation(null)}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmReject}
            >
              Confirmar rechazo y liberar stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Detalle Completo de Reserva */}
      <Dialog
        open={Boolean(selectedReservation)}
        onOpenChange={(open) => {
          if (!open) setSelectedReservation(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="flex items-center gap-2">
                <Store className="size-5 text-primary" />
                <span>Reserva {selectedReservation?.code}</span>
              </DialogTitle>
              {selectedReservation && (
                <ReservationStatusBadge status={selectedReservation.status} />
              )}
            </div>
            <DialogDescription className="text-xs">
              Reserva registrada para recojo y pago presencial en Bodega Jefrysito.
            </DialogDescription>
          </DialogHeader>

          {selectedReservation && (
            <div className="space-y-4 py-2 text-xs">
              {/* Datos cliente */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                <p className="font-semibold text-foreground text-sm">{selectedReservation.clientName}</p>
                <p className="text-muted-foreground">Teléfono / WhatsApp: <strong className="text-foreground">{selectedReservation.clientPhone}</strong></p>
                {selectedReservation.clientEmail && (
                  <p className="text-muted-foreground">Correo: {selectedReservation.clientEmail}</p>
                )}
                <p className="text-muted-foreground">Fecha de registro: {formatDateTime(selectedReservation.createdAt)}</p>
                <p className="text-muted-foreground">Límite de recojo (24h): {formatDateTime(selectedReservation.expiresAt)}</p>
                {selectedReservation.notes && (
                  <p className="text-muted-foreground pt-1 border-t border-border/50">
                    <strong>Nota:</strong> {selectedReservation.notes}
                  </p>
                )}
              </div>

              {/* Items */}
              <div>
                <p className="font-bold text-foreground mb-2">Desglose de productos:</p>
                <div className="space-y-2 border rounded-lg p-2.5 max-h-48 overflow-y-auto">
                  {selectedReservation.items.map((it, idx) => {
                    const itemName = it.name || it.productName || 'Producto'
                    const itemQty = it.qty ?? it.quantity ?? 1
                    const itemPrice = it.price ?? it.unitPrice ?? 0
                    return (
                      <div key={idx} className="flex justify-between items-center py-1 border-b last:border-0">
                        <div>
                          <p className="font-medium text-foreground">{itemName}</p>
                          <p className="text-[11px] text-muted-foreground">{itemQty} unidades × {formatCurrency(itemPrice)}</p>
                        </div>
                        <span className="font-bold tabular-nums text-foreground">
                          {formatCurrency(itemQty * itemPrice)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-bold text-sm text-foreground">Total a cobrar en tienda:</span>
                <span className="text-lg font-extrabold text-primary tabular-nums">
                  {formatCurrency(selectedReservation.total)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedReservation(null)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


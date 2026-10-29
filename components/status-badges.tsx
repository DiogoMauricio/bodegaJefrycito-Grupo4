import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  ExpiryState,
  MovementType,
  ProductStatus,
  StockAlertState,
} from '@/lib/types'

export function ExpiryBadge({ state }: { state: ExpiryState }) {
  if (state === 'vencido') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 shadow-2xs">
        <AlertOctagon className="size-3 shrink-0" />
        Vencido
      </span>
    )
  }
  if (state === 'proximo') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 shadow-2xs">
        <Clock className="size-3 shrink-0" />
        Próximo a vencer
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 shadow-2xs">
      <CheckCircle2 className="size-3 shrink-0" />
      Vigente
    </span>
  )
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return status === 'activo' ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500">
      <span className="size-1.5 rounded-full bg-slate-400" />
      Inactivo
    </span>
  )
}

export function MovementBadge({ type }: { type: MovementType }) {
  const map: Record<MovementType, string> = {
    entrada: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    venta: 'bg-sky-100 text-sky-800 border-sky-200',
    reserva: 'bg-violet-100 text-violet-800 border-violet-200',
    liberacion: 'bg-slate-100 text-slate-700 border-slate-200',
    ajuste: 'bg-amber-100 text-amber-800 border-amber-200',
    merma: 'bg-red-100 text-red-700 border-red-200',
  }
  const label = type.charAt(0).toUpperCase() + type.slice(1)
  return (
    <Badge variant="outline" className={cn('capitalize font-medium text-xs', map[type])}>
      {label}
    </Badge>
  )
}

export function StockAlertBadge({ alert }: { alert: StockAlertState }) {
  if (alert === 'agotado') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-100/80 px-2 py-0.5 text-xs font-bold text-red-700 shadow-2xs">
        <AlertOctagon className="size-3 shrink-0" />
        Agotado
      </span>
    )
  }
  if (alert === 'bajo') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100/80 px-2 py-0.5 text-xs font-bold text-amber-800 shadow-2xs">
        <AlertTriangle className="size-3 shrink-0" />
        Stock bajo
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 className="size-3 shrink-0 text-emerald-600" />
      Óptimo
    </span>
  )
}

export function LotAvailabilityBadge({ state }: { state: ExpiryState }) {
  if (state === 'vencido') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 shadow-2xs">
        <ShieldAlert className="size-3.5 shrink-0 text-red-600" />
        Bloqueado para venta y reserva
      </span>
    )
  }
  if (state === 'proximo') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 shadow-2xs">
        <Zap className="size-3.5 shrink-0 text-amber-600" />
        Disponible · Prioridad FEFO
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
      Disponible para venta
    </span>
  )
}


export function StockStatusBadge({ alert }: { alert: StockAlertState }) {
  if (alert === 'agotado') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        Agotado
      </span>
    )
  }
  if (alert === 'bajo') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        Stock bajo
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      En stock
    </span>
  )
}

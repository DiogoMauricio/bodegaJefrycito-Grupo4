import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ExpiryState, MovementType, ProductStatus } from '@/lib/types'

export function ExpiryBadge({ state }: { state: ExpiryState }) {
  const map: Record<ExpiryState, { label: string; className: string }> = {
    ok: { label: 'Vigente', className: 'border-primary/30 text-primary' },
    proximo: {
      label: 'Próximo a vencer',
      className: 'border-transparent bg-amber-100 text-amber-800',
    },
    vencido: {
      label: 'Vencido',
      className: 'border-transparent bg-red-100 text-red-700',
    },
  }
  const { label, className } = map[state]
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return status === 'activo' ? (
    <Badge className="border-transparent bg-primary/10 text-primary">
      Activo
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Inactivo
    </Badge>
  )
}

export function MovementBadge({ type }: { type: MovementType }) {
  const map: Record<MovementType, string> = {
    entrada: 'bg-emerald-100 text-emerald-800',
    venta: 'bg-sky-100 text-sky-800',
    reserva: 'bg-violet-100 text-violet-800',
    liberacion: 'bg-slate-100 text-slate-700',
    ajuste: 'bg-amber-100 text-amber-800',
    merma: 'bg-red-100 text-red-700',
  }
  const label = type.charAt(0).toUpperCase() + type.slice(1)
  return (
    <Badge className={cn('border-transparent capitalize', map[type])}>
      {label}
    </Badge>
  )
}

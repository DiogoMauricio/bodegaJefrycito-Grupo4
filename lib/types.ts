// =============================================================
// Gestock · Tipos base (Sprint 1)
// Sprint 2 y 3 extenderán estos tipos (ventas, alertas, reservas…)
// =============================================================

export type ProductStatus = 'activo' | 'inactivo'

// HU-02 / HU-03: el producto es el maestro del artículo
export type Product = {
  id: string
  barcode: string
  name: string
  category: string
  unit: string
  salePrice: number
  minStock: number
  status: ProductStatus
  image: string
}

// HU-04: cada entrada de mercadería crea un lote
export type Lot = {
  id: string
  productId: string
  code: string
  quantity: number
  cost: number
  expiry: string | null // ISO date
  receivedAt: string // ISO date
  supplier: string
  voucher: string
}

// Tipos de movimiento de inventario.
// En Sprint 1 solo se generan movimientos de tipo 'entrada' (HU-04).
// El resto se usará en Sprint 2 (venta, Kardex HU-06) y Sprint 3 (reserva, liberación, ajuste).
export type MovementType =
  | 'entrada'
  | 'venta'
  | 'reserva'
  | 'liberacion'
  | 'ajuste'
  | 'merma'

export type Movement = {
  id: string
  date: string // ISO
  productId: string
  lotId: string | null
  lotCode: string | null
  type: MovementType
  in: number
  out: number
  balance: number
  reference: string
}

// HU-07: stock físico, reservado y disponible
export type StockInfo = {
  physical: number // todas las unidades existentes
  vigente: number // unidades no vencidas
  reserved: number // unidades comprometidas por reservas (Sprint 3; por ahora siempre 0)
  available: number // vigente - reservado
  expired: number
}

export type ExpiryState = 'ok' | 'proximo' | 'vencido'

export type StockAlertState = 'ok' | 'bajo' | 'agotado'


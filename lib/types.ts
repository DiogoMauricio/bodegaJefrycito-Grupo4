// =============================================================
// Gestock · Tipos base (Sprint 1, Sprint 2 & Sprint 3)
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

// Tipos de movimiento de inventario
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

// HU-14 / HU-15 / HU-12: Reservas y Carrito
export type ReservationStatus =
  | 'pendiente'
  | 'confirmada'
  | 'rechazada'
  | 'expirada'

export type ReservationItem = {
  productId: string
  name: string
  qty: number
  price: number
}

export type Reservation = {
  id: string
  code: string
  customer: string
  phone: string
  note: string
  items: ReservationItem[]
  total: number
  createdAt: string
  expiresAt: string
  status: ReservationStatus
}

export type CartItem = {
  productId: string
  qty: number
}

// HU-07: stock físico, reservado y disponible
export type StockInfo = {
  physical: number // todas las unidades existentes
  vigente: number // unidades no vencidas
  reserved: number // unidades comprometidas por reservas activas
  available: number // vigente - reservado
  expired: number
}

export type ExpiryState = 'ok' | 'proximo' | 'vencido'

export type StockAlertState = 'ok' | 'bajo' | 'agotado'

// HU-05: Registrar venta en tienda (Punto de venta)
export type SaleLine = {
  productId: string
  qty: number
}

export type SaleResult = {
  ok: boolean
  reference?: string
  error?: string
  details?: {
    productName: string
    lotCode: string
    qty: number
  }[]
}

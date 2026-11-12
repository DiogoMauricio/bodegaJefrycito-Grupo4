'use client'

// =============================================================
// Gestock · Estado de la aplicación
// HU-01 Login · HU-02 Registrar producto · HU-03 Gestionar producto
// HU-04 Entrada de mercadería · HU-05 Punto de venta (FEFO)
// HU-06 Kardex · HU-07 Consultar stock actual · HU-08 Alertas de stock
// HU-09 Lotes próximos a vencer y vencidos · HU-10 Dashboard de inventario
// HU-11 Catálogo web · HU-12 Carrito de reserva · HU-13 Ajuste de inventario
// HU-14 Registrar reserva web · HU-15 Notificaciones de reservas
// =============================================================

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { buildInitialState } from './mock-data'
import { daysUntil, hoursFromNowISO } from './format'
import type {
  ExpiryState,
  Lot,
  Movement,
  MovementType,
  Product,
  ProductStatus,
  Reservation,
  ReservationItem,
  ReservationStatus,
  SaleLine,
  SaleResult,
  StockAlertState,
  StockInfo,
} from './types'

export const EXPIRY_THRESHOLD_DAYS = 30
const ACTIVE_RESERVATIONS: ReservationStatus[] = ['pendiente', 'confirmada']

export function lotExpiryState(lot: Lot): ExpiryState {
  if (!lot.expiry) return 'ok'
  const d = daysUntil(lot.expiry)
  if (d < 0) return 'vencido'
  if (d <= EXPIRY_THRESHOLD_DAYS) return 'proximo'
  return 'ok'
}

export function getAlertState(
  available: number,
  minStock: number,
): StockAlertState {
  if (available <= 0) return 'agotado'
  if (available <= minStock) return 'bajo'
  return 'ok'
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

type ProductInput = Omit<Product, 'id'>

export type EntryInput = {
  productId: string
  lotCode: string
  quantity: number
  cost: number
  expiry: string | null
  receivedAt: string
  supplier: string
  voucher: string
}

// HU-13: Registrar ajuste de inventario
export type AdjustmentInput = {
  productId: string
  lotId?: string | null
  type: 'incremento' | 'decremento'
  quantity: number
  reason: string
}

type StoreContextValue = {
  // auth (HU-01)
  isAuthenticated: boolean
  login: (user: string, pass: string) => { ok: boolean; error?: string }
  logout: () => void
  loginAttempts: number
  lockedUntil: number | null
  // data
  products: Product[]
  lots: Lot[]
  movements: Movement[]
  reservations: Reservation[]
  // selectors
  getProduct: (id: string) => Product | undefined
  getStock: (productId: string) => StockInfo
  getAlertState: (productId: string) => StockAlertState
  lotExpiryState: (lot: Lot) => ExpiryState
  getProductLots: (productId: string) => Lot[]
  getReservation: (idOrCode: string) => Reservation | undefined
  // product actions (HU-02 / HU-03)
  addProduct: (input: ProductInput) => { ok: boolean; error?: string }
  updateProduct: (
    id: string,
    input: Partial<ProductInput>,
  ) => { ok: boolean; error?: string }
  setProductStatus: (id: string, status: ProductStatus) => void
  // inventory actions (HU-04)
  registerEntry: (input: EntryInput) => { ok: boolean; error?: string }
  // sales action (HU-05) - FEFO
  registerSale: (lines: SaleLine[]) => SaleResult
  // HU-09: retirar lote por caducidad o merma
  retireLot: (lotId: string, reason?: string) => { ok: boolean; error?: string }
  // HU-13: Registrar ajuste de inventario
  registerAdjustment: (input: AdjustmentInput) => { ok: boolean; error?: string }
  // HU-12 / HU-14 / HU-15: reservas web y notificaciones
  createReservation: (
    customer: string,
    phone: string,
    note: string,
    items: ReservationItem[],
  ) => { ok: boolean; error?: string; code?: string; reservation?: Reservation }
  confirmReservation: (id: string) => { ok: boolean; error?: string }
  rejectReservation: (id: string, reason?: string) => { ok: boolean; error?: string }
  expireReservation: (id: string) => { ok: boolean; error?: string }
  processExpiredReservations: () => number
  attendReservation: (id: string) => SaleResult
}

const StoreContext = createContext<StoreContextValue | null>(null)

const DEMO_USER = 'admin'
const DEMO_PASS = 'gestock123'
const MAX_ATTEMPTS = 3
const LOCK_MS = 30_000

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => buildInitialState(), [])
  const [products, setProducts] = useState<Product[]>(initial.products)
  const [lots, setLots] = useState<Lot[]>(initial.lots)
  const [movements, setMovements] = useState<Movement[]>(initial.movements)
  const [reservations, setReservations] = useState<Reservation[]>(
    initial.reservations,
  )

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)

  // ----- selectors -----
  const getProduct = (id: string) => products.find((p) => p.id === id)

  const getProductLots = (productId: string) =>
    lots.filter((l) => l.productId === productId)

  const getReservation = (idOrCode: string) =>
    reservations.find(
      (r) => r.id === idOrCode || r.code.toUpperCase() === idOrCode.toUpperCase(),
    )

  // HU-07 / HU-11 / HU-12 / HU-14: Unidades comprometidas por reservas activas
  const reservedByProduct = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of reservations) {
      if (!ACTIVE_RESERVATIONS.includes(r.status)) continue
      for (const item of r.items) {
        const q = item.qty ?? item.quantity ?? 0
        map.set(item.productId, (map.get(item.productId) ?? 0) + q)
      }
    }
    return map
  }, [reservations])

  // HU-07: stock disponible = stock físico vigente − stock reservado
  // HU-09 / HU-11: Lotes vencidos no se consideran vendibles ni aumentan disponible
  const getStock = (productId: string): StockInfo => {
    const productLots = lots.filter((l) => l.productId === productId)
    let physical = 0
    let vigente = 0
    let expired = 0
    for (const lot of productLots) {
      physical += lot.quantity
      if (lotExpiryState(lot) === 'vencido') expired += lot.quantity
      else vigente += lot.quantity
    }
    const reserved = reservedByProduct.get(productId) ?? 0
    const available = Math.max(vigente - reserved, 0)
    return { physical, vigente, reserved, available, expired }
  }

  const getProductAlertState = (productId: string): StockAlertState => {
    const product = getProduct(productId)
    if (!product) return 'ok'
    const { available } = getStock(productId)
    return getAlertState(available, product.minStock)
  }

  // ----- auth (HU-01) -----
  const login = (user: string, pass: string) => {
    if (lockedUntil && Date.now() < lockedUntil) {
      return {
        ok: false,
        error: 'Demasiados intentos. Espera unos segundos e intenta de nuevo.',
      }
    }
    if (user.trim() === DEMO_USER && pass === DEMO_PASS) {
      setIsAuthenticated(true)
      setLoginAttempts(0)
      setLockedUntil(null)
      return { ok: true }
    }
    const attempts = loginAttempts + 1
    setLoginAttempts(attempts)
    if (attempts >= MAX_ATTEMPTS) {
      setLockedUntil(Date.now() + LOCK_MS)
      setLoginAttempts(0)
      return {
        ok: false,
        error: 'Acceso bloqueado temporalmente por seguridad. Intenta en 30s.',
      }
    }
    return { ok: false, error: 'Usuario o contraseña incorrectos.' }
  }

  const logout = () => setIsAuthenticated(false)

  // ----- product actions (HU-02 / HU-03) -----
  const addProduct = (input: ProductInput) => {
    if (products.some((p) => p.barcode === input.barcode)) {
      return { ok: false, error: 'Ya existe un producto con ese código de barras.' }
    }
    if (input.salePrice <= 0) {
      return { ok: false, error: 'El precio de venta debe ser mayor a 0.' }
    }
    if (input.minStock < 0) {
      return { ok: false, error: 'El stock mínimo no puede ser negativo.' }
    }
    setProducts((prev) => [...prev, { ...input, id: uid('p') }])
    return { ok: true }
  }

  const updateProduct = (id: string, input: Partial<ProductInput>) => {
    if (input.salePrice !== undefined && input.salePrice <= 0) {
      return { ok: false, error: 'El precio de venta debe ser mayor a 0.' }
    }
    if (input.minStock !== undefined && input.minStock < 0) {
      return { ok: false, error: 'El stock mínimo no puede ser negativo.' }
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...input } : p)),
    )
    return { ok: true }
  }

  const setProductStatus = (id: string, status: ProductStatus) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p)),
    )
  }

  // ----- movement helper -----
  const buildMovement = (
    productId: string,
    lotId: string | null,
    lotCode: string | null,
    type: MovementType,
    inQty: number,
    outQty: number,
    balance: number,
    reference: string,
  ): Movement => ({
    id: uid('m'),
    date: new Date().toISOString(),
    productId,
    lotId,
    lotCode,
    type,
    in: inQty,
    out: outQty,
    balance,
    reference,
  })

  // ----- inventory actions (HU-04) -----
  const registerEntry = (input: EntryInput) => {
    if (input.quantity <= 0) {
      return { ok: false, error: 'La cantidad debe ser mayor a 0.' }
    }
    if (input.cost <= 0) {
      return { ok: false, error: 'El costo unitario debe ser mayor a 0.' }
    }
    const dup = lots.some(
      (l) => l.voucher === input.voucher && l.supplier === input.supplier,
    )
    if (dup) {
      return {
        ok: false,
        error: 'Ya existe una entrada con ese proveedor y comprobante.',
      }
    }
    const balanceBefore = getStock(input.productId).physical
    const newLot: Lot = {
      id: uid('l'),
      productId: input.productId,
      code: input.lotCode || uid('LT').toUpperCase(),
      quantity: input.quantity,
      cost: input.cost,
      expiry: input.expiry,
      receivedAt: input.receivedAt,
      supplier: input.supplier,
      voucher: input.voucher,
    }
    setLots((prev) => [...prev, newLot])
    setMovements((prev) => [
      ...prev,
      buildMovement(
        input.productId,
        newLot.id,
        newLot.code,
        'entrada',
        input.quantity,
        0,
        balanceBefore + input.quantity,
        `Entrada ${input.supplier} · ${input.voucher}`,
      ),
    ])
    return { ok: true }
  }

  // ----- sales action (HU-05: Punto de venta con algoritmo FEFO) -----
  const registerSale = (lines: SaleLine[]): SaleResult => {
    if (lines.length === 0) {
      return { ok: false, error: 'El ticket de venta no contiene productos.' }
    }

    for (const line of lines) {
      const product = getProduct(line.productId)
      if (!product) {
        return { ok: false, error: 'Producto no encontrado.' }
      }
      if (product.status !== 'activo') {
        return { ok: false, error: `"${product.name}" está inactivo y no se puede vender.` }
      }
      if (line.qty <= 0) {
        return { ok: false, error: `Cantidad inválida para "${product.name}".` }
      }
      const stock = getStock(line.productId)
      if (line.qty > stock.available) {
        return {
          ok: false,
          error: `Stock insuficiente para "${product.name}". Disponible: ${stock.available}.`,
        }
      }
    }

    const reference = `V-${Math.floor(1000 + Math.random() * 9000)}`
    const updatedLots = [...lots]
    const newMovements: Movement[] = []
    const details: { productName: string; lotCode: string; qty: number }[] = []

    for (const line of lines) {
      const product = getProduct(line.productId)!
      let remaining = line.qty

      const vigenteLots = updatedLots
        .filter(
          (l) =>
            l.productId === line.productId &&
            l.quantity > 0 &&
            lotExpiryState(l) !== 'vencido',
        )
        .sort((a, b) => {
          const da = a.expiry ? new Date(a.expiry).getTime() : Infinity
          const db = b.expiry ? new Date(b.expiry).getTime() : Infinity
          return da - db
        })

      let runningBalance = getStock(line.productId).physical
      for (const lot of vigenteLots) {
        if (remaining <= 0) break
        const take = Math.min(lot.quantity, remaining)
        const idx = updatedLots.findIndex((l) => l.id === lot.id)
        updatedLots[idx] = { ...lot, quantity: lot.quantity - take }
        remaining -= take
        runningBalance -= take

        details.push({
          productName: product.name,
          lotCode: lot.code,
          qty: take,
        })

        newMovements.push(
          buildMovement(
            line.productId,
            lot.id,
            lot.code,
            'venta',
            0,
            take,
            runningBalance,
            `Venta mostrador ${reference} (FEFO · Lote ${lot.code})`,
          ),
        )
      }
    }

    setLots(updatedLots)
    setMovements((prev) => [...prev, ...newMovements])
    return { ok: true, reference, details }
  }

  // ----- HU-09: retirar lote por caducidad / merma -----
  const retireLot = (lotId: string, reason?: string) => {
    const lot = lots.find((l) => l.id === lotId)
    if (!lot) return { ok: false, error: 'Lote no encontrado.' }
    if (lot.quantity <= 0) {
      return { ok: false, error: 'El lote ya no cuenta con unidades disponibles.' }
    }
    const qty = lot.quantity
    const balanceBefore = getStock(lot.productId).physical
    setLots((prev) =>
      prev.map((l) => (l.id === lotId ? { ...l, quantity: 0 } : l)),
    )
    setMovements((prev) => [
      ...prev,
      buildMovement(
        lot.productId,
        lot.id,
        lot.code,
        'merma',
        0,
        qty,
        Math.max(balanceBefore - qty, 0),
        reason || `Baja por caducidad · Lote ${lot.code}`,
      ),
    ])
    return { ok: true }
  }

  // ----- HU-13: Registrar ajuste de inventario -----
  const registerAdjustment = (input: AdjustmentInput) => {
    const product = getProduct(input.productId)
    if (!product) return { ok: false, error: 'Producto no encontrado.' }
    if (input.quantity <= 0) return { ok: false, error: 'La cantidad debe ser mayor a 0.' }
    if (!input.reason.trim()) return { ok: false, error: 'Debe especificar el motivo del ajuste.' }

    const stock = getStock(input.productId)
    const balanceBefore = stock.physical

    if (input.type === 'decremento') {
      if (input.quantity > stock.available) {
        return {
          ok: false,
          error: `No puedes decrementar más del stock disponible (${stock.available} unidades).`,
        }
      }

      if (input.lotId && input.lotId !== 'sin-lote') {
        const targetLot = lots.find((l) => l.id === input.lotId)
        if (!targetLot) return { ok: false, error: 'Lote no encontrado.' }
        if (input.quantity > targetLot.quantity) {
          return {
            ok: false,
            error: `El lote ${targetLot.code} solo tiene ${targetLot.quantity} unidades.`,
          }
        }
        setLots((prev) =>
          prev.map((l) =>
            l.id === targetLot.id ? { ...l, quantity: l.quantity - input.quantity } : l,
          ),
        )
        setMovements((prev) => [
          ...prev,
          buildMovement(
            input.productId,
            targetLot.id,
            targetLot.code,
            'ajuste',
            0,
            input.quantity,
            Math.max(balanceBefore - input.quantity, 0),
            `Ajuste (-) · ${input.reason} (Lote ${targetLot.code})`,
          ),
        ])
        return { ok: true }
      } else {
        let remaining = input.quantity
        const updatedLots = [...lots]
        const productLots = updatedLots
          .filter((l) => l.productId === input.productId && l.quantity > 0)
          .sort((a, b) => {
            const da = a.expiry ? new Date(a.expiry).getTime() : Infinity
            const db = b.expiry ? new Date(b.expiry).getTime() : Infinity
            return da - db
          })

        let runningBalance = balanceBefore
        const newMoves: Movement[] = []
        for (const lot of productLots) {
          if (remaining <= 0) break
          const take = Math.min(lot.quantity, remaining)
          const idx = updatedLots.findIndex((l) => l.id === lot.id)
          updatedLots[idx] = { ...lot, quantity: lot.quantity - take }
          remaining -= take
          runningBalance -= take

          newMoves.push(
            buildMovement(
              input.productId,
              lot.id,
              lot.code,
              'ajuste',
              0,
              take,
              runningBalance,
              `Ajuste (-) · ${input.reason} (Lote ${lot.code})`,
            ),
          )
        }

        setLots(updatedLots)
        setMovements((prev) => [...prev, ...newMoves])
        return { ok: true }
      }
    } else {
      // Incremento
      if (input.lotId && input.lotId !== 'sin-lote') {
        const targetLot = lots.find((l) => l.id === input.lotId)
        if (targetLot) {
          setLots((prev) =>
            prev.map((l) =>
              l.id === targetLot.id ? { ...l, quantity: l.quantity + input.quantity } : l,
            ),
          )
          setMovements((prev) => [
            ...prev,
            buildMovement(
              input.productId,
              targetLot.id,
              targetLot.code,
              'ajuste',
              input.quantity,
              0,
              balanceBefore + input.quantity,
              `Ajuste (+) · ${input.reason} (Lote ${targetLot.code})`,
            ),
          ])
          return { ok: true }
        }
      }

      const adjustLotCode = `AJ-${Math.floor(1000 + Math.random() * 9000)}`
      const newLot: Lot = {
        id: uid('l'),
        productId: input.productId,
        code: adjustLotCode,
        quantity: input.quantity,
        cost: 0,
        expiry: null,
        receivedAt: new Date().toISOString(),
        supplier: 'Ajuste interno',
        voucher: `AJ-${Date.now().toString().slice(-4)}`,
      }
      setLots((prev) => [...prev, newLot])
      setMovements((prev) => [
        ...prev,
        buildMovement(
          input.productId,
          newLot.id,
          newLot.code,
          'ajuste',
          input.quantity,
          0,
          balanceBefore + input.quantity,
          `Ajuste (+) · ${input.reason} (Lote ${adjustLotCode})`,
        ),
      ])
      return { ok: true }
    }
  }

  // ----- HU-12 / HU-14: Gestión de reservas web -----
  const createReservation = (
    customer: string,
    phone: string,
    note: string,
    items: ReservationItem[],
  ) => {
    if (!customer.trim() || !phone.trim()) {
      return { ok: false, error: 'Nombre y teléfono son obligatorios.' }
    }
    if (items.length === 0) {
      return { ok: false, error: 'Tu carrito está vacío.' }
    }
    // HU-12 CA-5: Revalidar disponibilidad antes de confirmar
    for (const item of items) {
      const stock = getStock(item.productId)
      const q = item.qty ?? item.quantity ?? 1
      if (q > stock.available) {
        return {
          ok: false,
          error: `"${item.name || item.productName}" ya no tiene ${q} disponibles (disponibles: ${stock.available}). Ajusta tu carrito.`,
        }
      }
    }
    const code = `RSV-${Math.floor(2050 + Math.random() * 900)}`
    const total = items.reduce(
      (sum, i) => sum + (i.qty ?? i.quantity ?? 1) * (i.price ?? i.unitPrice ?? 0),
      0,
    )

    const normalizedItems: ReservationItem[] = items.map((it) => {
      const q = it.qty ?? it.quantity ?? 1
      const p = it.price ?? it.unitPrice ?? 0
      const n = it.name || it.productName || ''
      return {
        productId: it.productId,
        name: n,
        productName: n,
        qty: q,
        quantity: q,
        price: p,
        unitPrice: p,
      }
    })

    const reservation: Reservation = {
      id: uid('r'),
      code,
      customer: customer.trim(),
      clientName: customer.trim(),
      phone: phone.trim(),
      clientPhone: phone.trim(),
      note: note.trim(),
      notes: note.trim(),
      items: normalizedItems,
      total,
      createdAt: new Date().toISOString(),
      expiresAt: hoursFromNowISO(24),
      status: 'pendiente',
    }

    // Movimientos de tipo reserva para trazabilidad
    const newMovements: Movement[] = normalizedItems.map((it) => {
      const stock = getStock(it.productId)
      return buildMovement(
        it.productId,
        null,
        null,
        'reserva',
        0,
        it.qty,
        stock.physical,
        `Apartado web ${code} (${reservation.customer})`,
      )
    })

    setReservations((prev) => [reservation, ...prev])
    setMovements((prev) => [...prev, ...newMovements])
    return { ok: true, code, reservation }
  }

  // HU-15 Criterio 2: Confirmar reserva -> "Confirmada para recojo"
  const confirmReservation = (id: string) => {
    const res = reservations.find((r) => r.id === id)
    if (!res) return { ok: false, error: 'Reserva no encontrada.' }
    if (res.status !== 'pendiente') {
      return { ok: false, error: `No se puede confirmar una reserva en estado "${res.status}".` }
    }

    setReservations((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'confirmada',
              statusUpdatedAt: new Date().toISOString(),
            }
          : r,
      ),
    )
    return { ok: true }
  }

  // HU-15 Criterio 3: Rechazar reserva -> "Rechazada" y libera las unidades
  const rejectReservation = (id: string, reason?: string) => {
    const res = reservations.find((r) => r.id === id)
    if (!res) return { ok: false, error: 'Reserva no encontrada.' }
    if (res.status === 'rechazada' || res.status === 'expirada' || res.status === 'atendida') {
      return { ok: false, error: `La reserva ya fue finalizada como "${res.status}".` }
    }

    const releaseMovements = res.items.map((it) => {
      const stock = getStock(it.productId)
      return buildMovement(
        it.productId,
        null,
        null,
        'liberacion',
        it.qty ?? it.quantity ?? 1,
        0,
        stock.physical,
        `Liberación por rechazo de reserva ${res.code}`,
      )
    })

    setReservations((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'rechazada',
              rejectionReason: reason || 'Rechazada por la administración',
              statusUpdatedAt: new Date().toISOString(),
            }
          : r,
      ),
    )
    setMovements((prev) => [...prev, ...releaseMovements])
    return { ok: true }
  }

  // HU-14 Criterio 3 & HU-15 Criterio 4: Expirar reserva (24h) y liberar unidades
  const expireReservation = (id: string) => {
    const res = reservations.find((r) => r.id === id)
    if (!res) return { ok: false, error: 'Reserva no encontrada.' }
    if (res.status !== 'pendiente' && res.status !== 'confirmada') {
      return { ok: false, error: `La reserva ya se encuentra en estado "${res.status}".` }
    }

    const releaseMovements = res.items.map((it) => {
      const stock = getStock(it.productId)
      return buildMovement(
        it.productId,
        null,
        null,
        'liberacion',
        it.qty ?? it.quantity ?? 1,
        0,
        stock.physical,
        `Liberación por vencimiento de 24h · Reserva ${res.code}`,
      )
    })

    setReservations((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'expirada',
              statusUpdatedAt: new Date().toISOString(),
            }
          : r,
      ),
    )
    setMovements((prev) => [...prev, ...releaseMovements])
    return { ok: true }
  }

  // Procesar vencimiento automático de reservas que superaron las 24 horas
  const processExpiredReservations = (): number => {
    const nowTime = Date.now()
    const expiredList = reservations.filter(
      (r) =>
        (r.status === 'pendiente' || r.status === 'confirmada') &&
        new Date(r.expiresAt).getTime() <= nowTime,
    )

    if (expiredList.length === 0) return 0

    const newMovements: Movement[] = []
    for (const res of expiredList) {
      for (const it of res.items) {
        const stock = getStock(it.productId)
        newMovements.push(
          buildMovement(
            it.productId,
            null,
            null,
            'liberacion',
            it.qty ?? it.quantity ?? 1,
            0,
            stock.physical,
            `Liberación automática (24h superadas) · Reserva ${res.code}`,
          ),
        )
      }
    }

    setReservations((prev) =>
      prev.map((r) => {
        if (
          (r.status === 'pendiente' || r.status === 'confirmada') &&
          new Date(r.expiresAt).getTime() <= nowTime
        ) {
          return {
            ...r,
            status: 'expirada',
            statusUpdatedAt: new Date().toISOString(),
          }
        }
        return r
      }),
    )

    setMovements((prev) => [...prev, ...newMovements])
    return expiredList.length
  }

  // Entregar y atender reserva en mostrador (convierte reserva en venta efectiva con FEFO)
  const attendReservation = (id: string): SaleResult => {
    const res = reservations.find((r) => r.id === id)
    if (!res) return { ok: false, error: 'Reserva no encontrada.' }
    if (res.status !== 'confirmada' && res.status !== 'pendiente') {
      return { ok: false, error: `Solo se pueden entregar reservas en estado pendiente o confirmada.` }
    }

    const saleLines: SaleLine[] = res.items.map((it) => ({
      productId: it.productId,
      qty: it.qty ?? it.quantity ?? 1,
    }))

    setReservations((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'atendida',
              statusUpdatedAt: new Date().toISOString(),
            }
          : r,
      ),
    )

    const saleResult = registerSale(saleLines)
    return saleResult
  }

  // Chequeo periódico de reservas vencidas cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      processExpiredReservations()
    }, 60_000)
    return () => clearInterval(timer)
  }, [reservations])

  const value: StoreContextValue = {
    isAuthenticated,
    login,
    logout,
    loginAttempts,
    lockedUntil,
    products,
    lots,
    movements,
    reservations,
    getProduct,
    getStock,
    getAlertState: getProductAlertState,
    lotExpiryState,
    getProductLots,
    getReservation,
    addProduct,
    updateProduct,
    setProductStatus,
    registerEntry,
    registerSale,
    retireLot,
    registerAdjustment,
    createReservation,
    confirmReservation,
    rejectReservation,
    expireReservation,
    processExpiredReservations,
    attendReservation,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider')
  return ctx
}

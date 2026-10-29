'use client'

// =============================================================
// Gestock · Estado de la aplicación (Sprint 1 & Sprint 2)
// HU-01 Login · HU-02 Registrar producto · HU-03 Gestionar producto
// HU-04 Entrada de mercadería · HU-07 Consultar stock actual
// HU-09 Lotes próximos a vencer y vencidos · HU-10 Dashboard de inventario
// =============================================================

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { buildInitialState } from './mock-data'
import { daysUntil } from './format'
import type {
  ExpiryState,
  Lot,
  Movement,
  MovementType,
  Product,
  ProductStatus,
  StockAlertState,
  StockInfo,
} from './types'

export const EXPIRY_THRESHOLD_DAYS = 30

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
  // selectors
  getProduct: (id: string) => Product | undefined
  getStock: (productId: string) => StockInfo
  lotExpiryState: (lot: Lot) => ExpiryState
  getProductLots: (productId: string) => Lot[]
  // product actions (HU-02 / HU-03)
  addProduct: (input: ProductInput) => { ok: boolean; error?: string }
  updateProduct: (
    id: string,
    input: Partial<ProductInput>,
  ) => { ok: boolean; error?: string }
  setProductStatus: (id: string, status: ProductStatus) => void
  // inventory actions (HU-04)
  registerEntry: (input: EntryInput) => { ok: boolean; error?: string }
  // HU-09: retirar lote por caducidad o merma
  retireLot: (lotId: string, reason?: string) => { ok: boolean; error?: string }
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

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)

  // ----- selectors -----
  const getProduct = (id: string) => products.find((p) => p.id === id)

  const getProductLots = (productId: string) =>
    lots.filter((l) => l.productId === productId)

  // HU-07: stock disponible = stock físico vigente − stock reservado
  // HU-09: Lotes vencidos no se consideran disponibles
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
    // Las reservas se implementan en Sprint 3 (HU-14). Hasta entonces, 0.
    const reserved = 0
    const available = Math.max(vigente - reserved, 0)
    return { physical, vigente, reserved, available, expired }
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

  const value: StoreContextValue = {
    isAuthenticated,
    login,
    logout,
    loginAttempts,
    lockedUntil,
    products,
    lots,
    movements,
    getProduct,
    getStock,
    lotExpiryState,
    getProductLots,
    addProduct,
    updateProduct,
    setProductStatus,
    registerEntry,
    retireLot,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider')
  return ctx
}

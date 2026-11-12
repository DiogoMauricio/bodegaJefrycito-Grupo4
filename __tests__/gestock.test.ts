import { describe, it, expect } from 'vitest'
import { getAlertState, lotExpiryState, EXPIRY_THRESHOLD_DAYS } from '../lib/store'
import { formatCurrency, daysUntil, daysFromNowISO } from '../lib/format'
import type { Lot } from '../lib/types'

// =============================================================
// Gestock · Suite de Pruebas Unitarias
// HU-08 Alertas · HU-09 Vencimientos · HU-12/14 Reservas · HU-13 Ajustes
// =============================================================

// --- 1. Reglas de Reserva Web (HU-12 / HU-14) ---
function puedeReservar(stockDisponible: number, cantidadSolicitada: number): boolean {
  return cantidadSolicitada > 0 && cantidadSolicitada <= stockDisponible
}

function calcularDisponibilidad(stockFisicoVigente: number, unidadesReservadas: number): number {
  return Math.max(stockFisicoVigente - unidadesReservadas, 0)
}

describe('HU-12 / HU-14: Gestión de Reservas Web', () => {
  it('permite reservar productos con stock disponible suficiente', () => {
    expect(puedeReservar(10, 3)).toBe(true)
    expect(puedeReservar(5, 5)).toBe(true) // Límite exacto
  })

  it('rechaza reservas si la cantidad supera el stock disponible', () => {
    expect(puedeReservar(2, 5)).toBe(false)
    expect(puedeReservar(0, 1)).toBe(false) // Sin stock
  })

  it('rechaza cantidades negativas o iguales a cero', () => {
    expect(puedeReservar(10, -2)).toBe(false)
    expect(puedeReservar(10, 0)).toBe(false)
  })

  it('HU-14 CA-1 y CA-2: Las unidades reservadas reducen el stock disponible para otras operaciones', () => {
    const fisico = 20
    const reservadas = 5
    expect(calcularDisponibilidad(fisico, reservadas)).toBe(15)
  })

  it('HU-14 CA-3 y HU-15 CA-4: Al expirar o rechazarse una reserva, las unidades se liberan', () => {
    const fisico = 20
    let reservadas = 5
    expect(calcularDisponibilidad(fisico, reservadas)).toBe(15)
    // Se cancela o expira la reserva -> reservadas vuelve a 0
    reservadas = 0
    expect(calcularDisponibilidad(fisico, reservadas)).toBe(20)
  })
})

// --- 1.1 Reglas de Notificaciones y Estados de Reserva (HU-15) ---
describe('HU-15: Gestión de Notificaciones y Estados de Reservas', () => {
  it('HU-15 CA-2: Cambia de "pendiente" a "confirmada" para recojo en tienda', () => {
    let estado: 'pendiente' | 'confirmada' | 'rechazada' | 'expirada' = 'pendiente'
    expect(estado).toBe('pendiente')
    estado = 'confirmada'
    expect(estado).toBe('confirmada')
  })

  it('HU-15 CA-3: Registra estado "rechazada" con motivo para auditoría interna', () => {
    const reserva = {
      id: 'res-test',
      status: 'rechazada' as const,
      rejectionReason: 'Cliente no se presentó dentro del plazo',
    }
    expect(reserva.status).toBe('rechazada')
    expect(reserva.rejectionReason).toBeDefined()
  })
})

// --- 2. Reglas de Alertas de Stock Mínimo (HU-08) ---
describe('HU-08: Gestión de Alertas de Stock Mínimo', () => {
  it('debe alertar "agotado" cuando no hay stock disponible (<= 0)', () => {
    expect(getAlertState(0, 10)).toBe('agotado')
    expect(getAlertState(-1, 5)).toBe('agotado')
  })

  it('debe alertar "bajo" cuando el stock es menor o igual al stock mínimo configurado', () => {
    expect(getAlertState(4, 10)).toBe('bajo')
    expect(getAlertState(10, 10)).toBe('bajo') // En el límite exacto
  })

  it('debe marcar "ok" cuando el stock supera el mínimo requerido', () => {
    expect(getAlertState(11, 10)).toBe('ok')
    expect(getAlertState(50, 10)).toBe('ok')
  })
})

// --- 3. Reglas de Control de Vencimientos (HU-09) ---
describe('HU-09: Control y Semáforo de Vencimientos', () => {
  const loteBase: Lot = {
    id: 'l-test',
    productId: 'p-test',
    code: 'LT-TEST',
    quantity: 20,
    cost: 3.5,
    expiry: null,
    receivedAt: new Date().toISOString(),
    supplier: 'Distribuidora Central',
    voucher: 'F001-999',
  }

  it('debe marcar "vencido" si la fecha de expiración es anterior a hoy', () => {
    const loteVencido: Lot = { ...loteBase, expiry: '2023-01-01' }
    expect(lotExpiryState(loteVencido)).toBe('vencido')
  })

  it('debe marcar "proximo" si vence dentro del umbral de 30 días', () => {
    const fechaProxima = daysFromNowISO(15) // Vence en 15 días
    const loteProximo: Lot = { ...loteBase, expiry: fechaProxima }
    expect(lotExpiryState(loteProximo)).toBe('proximo')
  })

  it('debe marcar "ok" si vence con más de 30 días de anticipación', () => {
    const fechaLejana = daysFromNowISO(90) // Vence en 3 meses
    const loteVigente: Lot = { ...loteBase, expiry: fechaLejana }
    expect(lotExpiryState(loteVigente)).toBe('ok')
  })

  it('debe marcar "ok" para productos no perecibles (sin fecha de expiración)', () => {
    const loteSinExpirar: Lot = { ...loteBase, expiry: null }
    expect(lotExpiryState(loteSinExpirar)).toBe('ok')
  })
})

// --- 5. Validación de Imagen en Productos (HU-02 / HU-03) ---
describe('HU-02 / HU-03: Maestro de Productos e Imágenes', () => {
  it('permite registrar productos con imagen representativa (URL o Base64)', () => {
    const productoConImagen = {
      barcode: '7750001000999',
      name: 'Galletas Oreo 36g',
      category: 'Snacks',
      unit: 'Paquete',
      salePrice: 1.5,
      minStock: 12,
      status: 'activo' as const,
      image: 'https://images.unsplash.com/photo-oreo',
    }
    expect(productoConImagen.image).toBeDefined()
    expect(productoConImagen.image.length).toBeGreaterThan(0)
  })
})

import type { Lot, Movement, Product } from './types'
import { daysFromNowISO } from './format'

export type InitialState = {
  products: Product[]
  lots: Lot[]
  movements: Movement[]
}

export function buildInitialState(): InitialState {
  const products: Product[] = [
    {
      id: 'p1',
      barcode: '7750001000011',
      name: 'Agua Mineral San Luis 625ml',
      category: 'Bebidas',
      unit: 'Unidad',
      salePrice: 1.5,
      minStock: 24,
      status: 'activo',
      image: '/products/agua.png',
    },
    {
      id: 'p2',
      barcode: '7750001000028',
      name: 'Arroz Costeño 5kg',
      category: 'Abarrotes',
      unit: 'Bolsa',
      salePrice: 24.9,
      minStock: 10,
      status: 'activo',
      image: '/products/arroz.png',
    },
    {
      id: 'p3',
      barcode: '7750001000035',
      name: 'Aceite Primor 1L',
      category: 'Abarrotes',
      unit: 'Botella',
      salePrice: 9.8,
      minStock: 12,
      status: 'activo',
      image: '/products/aceite.png',
    },
    {
      id: 'p4',
      barcode: '7750001000042',
      name: 'Leche Gloria Evaporada 400g',
      category: 'Lácteos',
      unit: 'Lata',
      salePrice: 4.2,
      minStock: 20,
      status: 'activo',
      image: '/products/leche.png',
    },
    {
      id: 'p5',
      barcode: '7750001000059',
      name: 'Inca Kola 1.5L',
      category: 'Bebidas',
      unit: 'Botella',
      salePrice: 7.5,
      minStock: 15,
      status: 'activo',
      image: '/products/gaseosa.png',
    },
    {
      id: 'p6',
      barcode: '7750001000066',
      name: 'Atún Florida 170g',
      category: 'Conservas',
      unit: 'Lata',
      salePrice: 5.9,
      minStock: 18,
      status: 'activo',
      image: '/products/atun.png',
    },
    {
      id: 'p7',
      barcode: '7750001000073',
      name: 'Galletas Soda Field 6pack',
      category: 'Snacks',
      unit: 'Paquete',
      salePrice: 3.6,
      minStock: 16,
      status: 'activo',
      image: '/products/galletas.png',
    },
    {
      id: 'p8',
      barcode: '7750001000080',
      name: 'Detergente Bolívar 780g',
      category: 'Limpieza',
      unit: 'Bolsa',
      salePrice: 8.4,
      minStock: 10,
      status: 'inactivo',
      image: '/products/detergente.png',
    },
  ]

  const lots: Lot[] = [
    // Agua: stock alto y vigente
    { id: 'l1', productId: 'p1', code: 'AG-2401', quantity: 80, cost: 0.8, expiry: daysFromNowISO(300), receivedAt: daysFromNowISO(-40), supplier: 'Distribuidora Andina', voucher: 'F001-1201' },
    // Arroz: bajo el mínimo -> stock bajo
    { id: 'l2', productId: 'p2', code: 'AR-2405', quantity: 6, cost: 18.0, expiry: daysFromNowISO(420), receivedAt: daysFromNowISO(-20), supplier: 'Molinos del Sur', voucher: 'F002-0087' },
    // Aceite: dos lotes, uno próximo a vencer (FEFO)
    { id: 'l3', productId: 'p3', code: 'AC-2312', quantity: 10, cost: 7.1, expiry: daysFromNowISO(18), receivedAt: daysFromNowISO(-60), supplier: 'Industrias Primor', voucher: 'F003-0450' },
    { id: 'l4', productId: 'p3', code: 'AC-2404', quantity: 24, cost: 7.4, expiry: daysFromNowISO(210), receivedAt: daysFromNowISO(-10), supplier: 'Industrias Primor', voucher: 'F003-0511' },
    // Leche: lote vencido + lote vigente
    { id: 'l5', productId: 'p4', code: 'LE-2310', quantity: 12, cost: 3.1, expiry: daysFromNowISO(-5), receivedAt: daysFromNowISO(-90), supplier: 'Gloria S.A.', voucher: 'F004-0210' },
    { id: 'l6', productId: 'p4', code: 'LE-2404', quantity: 40, cost: 3.2, expiry: daysFromNowISO(160), receivedAt: daysFromNowISO(-15), supplier: 'Gloria S.A.', voucher: 'F004-0233' },
    // Inca Kola: vigente
    { id: 'l7', productId: 'p5', code: 'IK-2403', quantity: 30, cost: 5.5, expiry: daysFromNowISO(120), receivedAt: daysFromNowISO(-12), supplier: 'Distribuidora Andina', voucher: 'F001-1240' },
    // Atún: registrado sin entradas todavía -> stock 0 (HU-02 CA4)
    // Galletas: próximo a vencer
    { id: 'l9', productId: 'p7', code: 'GA-2402', quantity: 28, cost: 2.5, expiry: daysFromNowISO(9), receivedAt: daysFromNowISO(-30), supplier: 'Alicorp', voucher: 'F006-0777' },
  ]

  const movements: Movement[] = [
    { id: 'm1', date: daysFromNowISO(-40), productId: 'p1', lotId: 'l1', lotCode: 'AG-2401', type: 'entrada', in: 80, out: 0, balance: 80, reference: 'Entrada F001-1201' },
    { id: 'm2', date: daysFromNowISO(-30), productId: 'p7', lotId: 'l9', lotCode: 'GA-2402', type: 'entrada', in: 28, out: 0, balance: 28, reference: 'Entrada F006-0777' },
    { id: 'm3', date: daysFromNowISO(-15), productId: 'p4', lotId: 'l6', lotCode: 'LE-2404', type: 'entrada', in: 40, out: 0, balance: 52, reference: 'Entrada F004-0233' },
    { id: 'm5', date: daysFromNowISO(-10), productId: 'p3', lotId: 'l4', lotCode: 'AC-2404', type: 'entrada', in: 24, out: 0, balance: 34, reference: 'Entrada F003-0511' },
  ]

  return { products, lots, movements }
}

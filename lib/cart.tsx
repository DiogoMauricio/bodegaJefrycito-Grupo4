'use client'

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'

type CartState = Record<string, number> // productId -> qty

type CartContextValue = {
  items: CartState
  count: number
  add: (productId: string) => void
  setQty: (productId: string, qty: number) => void
  remove: (productId: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartState>({})

  const add = (productId: string) =>
    setItems((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }))

  const setQty = (productId: string, qty: number) =>
    setItems((prev) => {
      const next = { ...prev }
      if (qty <= 0) delete next[productId]
      else next[productId] = qty
      return next
    })

  const remove = (productId: string) =>
    setItems((prev) => {
      const next = { ...prev }
      delete next[productId]
      return next
    })

  const clear = () => setItems({})

  const count = Object.values(items).reduce((sum, q) => sum + q, 0)

  return (
    <CartContext.Provider value={{ items, count, add, setQty, remove, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}

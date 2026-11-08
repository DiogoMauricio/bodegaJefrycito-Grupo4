import { CartProvider } from '@/lib/cart'
import { StoreHeader } from '@/components/store/store-header'

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <StoreHeader />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
          Bodega Jefrysito · Reserva en línea y recojo en tienda
        </footer>
      </div>
    </CartProvider>
  )
}

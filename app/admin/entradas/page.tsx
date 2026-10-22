'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { PackagePlus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/format'
import { PageHeader } from '@/components/admin/page-header'
import { ExpiryBadge } from '@/components/status-badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function EntradasPage() {
  const { products, lots, registerEntry, getProduct, lotExpiryState } =
    useStore()
  const activeProducts = products.filter((p) => p.status === 'activo')

  const [productId, setProductId] = useState('')
  const [lotCode, setLotCode] = useState('')
  const [quantity, setQuantity] = useState('')
  const [cost, setCost] = useState('')
  const [expiry, setExpiry] = useState('')
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [supplier, setSupplier] = useState('')
  const [voucher, setVoucher] = useState('')

  function reset() {
    setProductId('')
    setLotCode('')
    setQuantity('')
    setCost('')
    setExpiry('')
    setReceivedAt(new Date().toISOString().slice(0, 10))
    setSupplier('')
    setVoucher('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productId) return toast.error('Selecciona un producto.')
    if (!receivedAt) return toast.error('Indica la fecha de recepción.')
    const res = registerEntry({
      productId,
      lotCode,
      quantity: Number(quantity),
      cost: Number(cost),
      expiry: expiry ? new Date(`${expiry}T12:00:00`).toISOString() : null,
      receivedAt: new Date(`${receivedAt}T12:00:00`).toISOString(),
      supplier,
      voucher,
    })
    if (!res.ok) return toast.error(res.error)
    toast.success('Entrada registrada. Se generó el lote y el movimiento de inventario.')
    reset()
  }

  const recentLots = [...lots]
    .sort(
      (a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    )
    .slice(0, 8)

  return (
    <div>
      <PageHeader
        hu="HU-04"
        title="Registrar entrada de mercadería"
        description="Registra la mercadería recibida de un proveedor indicando lote, cantidad, costo y vencimiento. Cada entrada crea un lote e incrementa el stock físico generando un movimiento de tipo Entrada."
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PackagePlus className="size-4 text-primary" />
              Nueva entrada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Producto</Label>
                <Select value={productId} onValueChange={(v) => setProductId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lot">Lote</Label>
                  <Input
                    id="lot"
                    value={lotCode}
                    onChange={(e) => setLotCode(e.target.value)}
                    placeholder="Ej. AC-2404"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qty">Cantidad</Label>
                  <Input
                    id="qty"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="receivedAt">Fecha de recepción</Label>
                  <Input
                    id="receivedAt"
                    type="date"
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Costo unitario (S/)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp">Vencimiento</Label>
                  <Input
                    id="exp"
                    type="date"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Proveedor</Label>
                  <Input
                    id="supplier"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Distribuidora…"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voucher">Comprobante</Label>
                  <Input
                    id="voucher"
                    value={voucher}
                    onChange={(e) => setVoucher(e.target.value)}
                    placeholder="F001-0000"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                Registrar entrada
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Últimos lotes recibidos</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead>Recibido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLots.map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell className="font-medium">
                        {getProduct(lot.productId)?.name ?? '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {lot.code}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {lot.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(lot.cost)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(lot.expiry)}
                          </span>
                          <ExpiryBadge state={lotExpiryState(lot)} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(lot.receivedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

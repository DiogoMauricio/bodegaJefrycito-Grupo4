'use client'

import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { ImageIcon, Upload, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import type { Product } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CATEGORIES = [
  'Abarrotes',
  'Bebidas',
  'Lácteos',
  'Conservas',
  'Snacks',
  'Limpieza',
]
const UNITS = ['Unidad', 'Botella', 'Lata', 'Bolsa', 'Paquete', 'Caja']

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si se pasa, es edición (HU-03); si no, es registro (HU-02). */
  product?: Product
}

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const { addProduct, updateProduct } = useStore()
  const isEdit = Boolean(product)

  const [barcode, setBarcode] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [unit, setUnit] = useState(UNITS[0])
  const [salePrice, setSalePrice] = useState('')
  const [minStock, setMinStock] = useState('')
  const [status, setStatus] = useState<Product['status']>('activo')
  const [image, setImage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setBarcode(product?.barcode ?? '')
    setName(product?.name ?? '')
    setCategory(product?.category ?? CATEGORIES[0])
    setUnit(product?.unit ?? UNITS[0])
    setSalePrice(product ? String(product.salePrice) : '')
    setMinStock(product ? String(product.minStock) : '')
    setStatus(product?.status ?? 'activo')
    setImage(product?.image ?? '')
  }, [open, product])

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImage(event.target.result)
      }
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const priceNum = Number(salePrice)
    const minNum = Number(minStock)

    if (isEdit && product) {
      const res = updateProduct(product.id, {
        name,
        category,
        salePrice: priceNum,
        minStock: minNum,
        status,
        image,
      })
      if (!res.ok) return toast.error(res.error)
      toast.success('Producto actualizado. El historial se mantiene intacto.')
      onOpenChange(false)
      return
    }

    const res = addProduct({
      barcode,
      name,
      category,
      unit,
      salePrice: priceNum,
      minStock: minNum,
      status: 'activo',
      image,
    })
    if (!res.ok) return toast.error(res.error)
    toast.success('Producto registrado. Stock físico y disponible inician en 0.')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar producto' : 'Registrar producto'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza los datos comerciales. El stock, lote y vencimiento no se editan aquí.'
              : 'El producto es el maestro del artículo. Lote, costo y vencimiento se registran en la entrada de mercadería (HU-04).'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="barcode">Código de barras</Label>
            <Input
              id="barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="7750001000000"
              required
              disabled={isEdit}
            />
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                El código de barras identifica al producto y no puede cambiarse.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Aceite Primor 1L"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={category} onValueChange={(v) => setCategory(v ?? '')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidad de medida</Label>
              <Select
                value={unit}
                onValueChange={(v) => setUnit(v ?? '')}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Precio de venta (S/)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min">Stock mínimo</Label>
              <Input
                id="min"
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="0"
                required
              />
            </div>
          </div>

          {isEdit && (
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as Product['status'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo (baja lógica)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Imagen del producto (HU-02 / HU-03) */}
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Imagen del producto (opcional)
            </Label>
            <div className="flex items-start gap-3 pt-1">
              {/* Preview */}
              <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white shadow-2xs">
                {image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt="Vista previa"
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                      title="Quitar imagen"
                    >
                      <X className="size-3" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="size-7 text-muted-foreground/40" />
                )}
              </div>

              {/* Controles de URL y Subir archivo */}
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  placeholder="Pegar URL de la imagen (https://...)"
                  value={image.startsWith('data:') ? 'Imagen cargada desde archivo local' : image}
                  onChange={(e) => setImage(e.target.value)}
                  disabled={image.startsWith('data:')}
                  className="h-8 text-xs"
                />
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs bg-white"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-3" />
                    Subir foto
                  </Button>
                  {image && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-red-500"
                      onClick={() => setImage('')}
                    >
                      Quitar
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  JPG, PNG o WebP (máx. 2MB) o enlace URL directo.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {isEdit ? 'Guardar cambios' : 'Registrar producto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

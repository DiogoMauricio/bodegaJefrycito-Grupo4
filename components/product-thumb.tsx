import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProductThumb({
  src,
  alt,
  className,
}: {
  src?: string
  alt: string
  className?: string
}) {
  if (!src) {
    return (
      <span
        className={cn(
          'flex items-center justify-center rounded-md bg-muted text-muted-foreground',
          className,
        )}
      >
        <Package className="size-1/2" aria-hidden />
        <span className="sr-only">{alt}</span>
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || '/placeholder.svg'}
      alt={alt}
      className={cn('rounded-md object-cover', className)}
    />
  )
}

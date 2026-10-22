import { Boxes } from 'lucide-react'
import { cn } from '@/lib/utils'

export function GestockLogo({
  className,
  showText = true,
  variant = 'default',
}: {
  className?: string
  showText?: boolean
  variant?: 'default' | 'invert'
}) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Boxes className="size-5" aria-hidden />
      </span>
      {showText && (
        <span
          className={cn(
            'text-lg font-semibold tracking-tight',
            variant === 'invert' ? 'text-sidebar-foreground' : 'text-foreground',
          )}
        >
          Gestock
        </span>
      )}
    </span>
  )
}

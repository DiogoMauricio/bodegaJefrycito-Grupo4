import { Sparkles } from 'lucide-react'

export function PageHeader({
  hu,
  tag,
  title,
  description,
  action,
}: {
  hu?: string
  tag?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  // Solo mostramos tag si está definido explícitamente o si no es un código tipo "HU-xx"
  const displayTag = tag || (hu && !hu.toUpperCase().startsWith('HU') ? hu : null)

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1.5">
        {displayTag && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3" />
            {displayTag}
          </span>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

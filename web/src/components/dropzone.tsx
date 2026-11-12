import { CloudUpload } from 'lucide-react'
import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react'

import { formatBytes } from '@/lib/upload'
import { cn } from '@/lib/utils'

/**
 * Área de arrastar e soltar (D15). Também funciona por clique e pelo teclado.
 * Valida tipo e tamanho no navegador e devolve só os arquivos aceitos.
 */
export function Dropzone({
  accept,
  maxSize,
  multiple = false,
  disabled = false,
  title,
  hint,
  icon,
  compact = false,
  className,
  onFiles,
  onReject,
}: {
  accept: readonly string[]
  maxSize: number
  multiple?: boolean
  disabled?: boolean
  title: string
  hint: string
  icon?: ReactNode
  compact?: boolean
  className?: string
  onFiles: (files: File[]) => void
  onReject?: (messages: string[]) => void
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  // O dragenter/dragleave dispara nos filhos; o contador evita o estado piscar.
  const depth = useRef(0)

  function handle(list: FileList | File[]) {
    const files = Array.from(list)
    const accepted: File[] = []
    const problems: string[] = []

    for (const file of files) {
      if (!accept.includes(file.type)) problems.push(`${file.name}: formato não aceito.`)
      else if (file.size > maxSize) problems.push(`${file.name}: tem ${formatBytes(file.size)}, o limite é ${formatBytes(maxSize)}.`)
      else if (file.size === 0) problems.push(`${file.name}: o arquivo está vazio.`)
      else accepted.push(file)
    }

    if (problems.length) onReject?.(problems)
    if (accepted.length) onFiles(multiple ? accepted : accepted.slice(0, 1))
    if (inputRef.current) inputRef.current.value = ''
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    depth.current = 0
    setDragging(false)
    if (!disabled) handle(event.dataTransfer.files)
  }

  return (
    <label
      htmlFor={inputId}
      onDragEnter={(e) => {
        e.preventDefault()
        depth.current += 1
        if (!disabled) setDragging(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current -= 1
        if (depth.current <= 0) setDragging(false)
      }}
      onDrop={onDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-input bg-faint text-center transition-colors hover:border-primary hover:bg-primary-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
        compact ? 'px-4 py-5' : 'px-6 py-10',
        dragging && 'border-primary bg-primary-soft',
        disabled && 'pointer-events-none opacity-55',
        className,
      )}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={accept.join(',')}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => e.target.files && handle(e.target.files)}
      />
      <span className={cn('grid place-items-center rounded-lg bg-primary-soft text-primary', compact ? 'size-9' : 'size-11')}>{icon ?? <CloudUpload className={compact ? 'size-4' : 'size-5'} />}</span>
      <span className="space-y-0.5">
        <b className="block text-sm font-semibold">{dragging ? 'Solte para enviar' : title}</b>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  )
}

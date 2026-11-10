import { Link } from 'react-router-dom'

import type { CourseSummary } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'

/** Capas geradas para cursos sem imagem: formas abstratas em pastel, escolhidas pelo título. */
const covers = [
  { bg: 'bg-lilac-soft', fg: 'var(--primary)' },
  { bg: 'bg-sand-soft', fg: 'var(--orange)' },
  { bg: 'bg-mint-soft', fg: 'var(--success)' },
  { bg: 'bg-orange-soft', fg: 'var(--orange)' },
]

function hash(text: string) {
  let value = 0
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return value
}

function CoverArt({ variant, color }: { variant: number; color: string }) {
  const shapes = [
    <>
      <circle cx="240" cy="50" r="52" fill={color} opacity=".18" />
      <rect x="30" y="86" width="130" height="56" rx="10" fill={color} opacity=".22" />
      <rect x="44" y="30" width="86" height="12" rx="6" fill={color} opacity=".3" />
    </>,
    <>
      <rect x="40" y="30" width="110" height="120" rx="12" fill={color} opacity=".22" />
      <circle cx="230" cy="86" r="48" fill={color} opacity=".18" />
      <rect x="180" y="132" width="100" height="16" rx="8" fill={color} opacity=".28" />
    </>,
    <>
      <circle cx="160" cy="90" r="58" fill={color} opacity=".16" />
      <circle cx="160" cy="90" r="26" fill={color} opacity=".26" />
      <rect x="36" y="38" width="42" height="42" rx="9" fill={color} opacity=".2" />
    </>,
    <>
      <path d="M28 142 L110 92 L172 122 L292 40" stroke={color} strokeWidth="10" strokeLinecap="round" fill="none" opacity=".35" />
      <circle cx="292" cy="40" r="12" fill={color} opacity=".4" />
    </>,
  ]
  return (
    <svg viewBox="0 0 320 180" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {shapes[variant % shapes.length]}
    </svg>
  )
}

export function CourseCover({ url, title, seed: seedText, className }: { url: string | null; title: string; seed?: string; className?: string }) {
  if (url) {
    return <img src={url} alt={`Capa do curso ${title}`} className={cn('aspect-video w-full object-cover', className)} loading="lazy" />
  }
  const seed = hash(seedText ?? title)
  const cover = covers[seed % covers.length]!
  return (
    <div className={cn('relative aspect-video w-full overflow-hidden', cover.bg, className)} role="img" aria-label={`Capa do curso ${title}`}>
      <CoverArt variant={seed >>> 3} color={cover.fg} />
    </div>
  )
}

export function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <Link
      to={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card outline-none transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CourseCover url={course.coverUrl} title={course.title} seed={course.slug} />
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold">{course.title}</h3>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="grid size-[22px] place-items-center rounded-full bg-lilac-soft text-[10px] font-semibold text-primary">{course.mentorName.charAt(0).toUpperCase()}</span>
          <span className="truncate">{course.mentorName}</span>
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="font-heading text-base font-semibold tabular">{formatCurrency(course.priceInCents)}</span>
          <span className="rounded-md bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">Ver curso</span>
        </div>
      </div>
    </Link>
  )
}

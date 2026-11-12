/** Tipos das telas da empresa e do admin (respostas da API). */

export type InvitationStatus = 'sent' | 'accepted' | 'declined' | 'hired' | 'withdrawn'

export type TalentCard = {
  id: string
  displayName: string
  headline: string | null
  city: string | null
  neighborhood: string | null
  age: number | null
  interests: string[]
  validatedProjects: number
  certificates: number
}

export type TalentList = { talents: TalentCard[]; total: number; page: number; pageSize: number }

export type PortfolioItem = {
  id: string
  title: string
  description: string | null
  links: string[]
  coverUrl: string | null
  isPublic: boolean
  validated: boolean
  validatedByName: string | null
  validatedAt: string | null
  courseTitle: string | null
}

export type TalentProfile = TalentCard & {
  fullName: string | null
  bio: string | null
  goal: string | null
  portfolio: PortfolioItem[]
  courses: string[]
  invitation: { id: string; status: InvitationStatus; roleTitle: string } | null
  contact: { email: string; phone: string | null } | null
}

export type CompanyInvitation = {
  id: string
  studentId: string
  studentName: string
  roleTitle: string
  status: InvitationStatus
  createdAt: string
  respondedAt: string | null
  contact: { email: string; phone: string | null } | null
}

export type CompanyOverview = {
  talentsAvailable: number
  invitations: { sent: number; accepted: number; declined: number; hired: number }
}

export type AdminOverview = {
  users: { student: number; mentor: number; company: number; newLast7Days: number }
  courses: { total: number; published: number }
  sales: { paidOrders: number; grossInCents: number; platformFeeInCents: number; refunded: number }
  withdrawals: { requested: number; requestedInCents: number }
  certificates: number
  invitations: { total: number; hired: number }
  week: { date: string; orders: number; users: number }[]
}

export const invitationStatusMeta: Record<InvitationStatus, { label: string; variant: 'accent' | 'success' | 'destructive' | 'primary' | 'default' }> = {
  sent: { label: 'Enviado', variant: 'accent' },
  accepted: { label: 'Aceito', variant: 'success' },
  declined: { label: 'Recusado', variant: 'destructive' },
  hired: { label: 'Contratado', variant: 'primary' },
  withdrawn: { label: 'Retirado', variant: 'default' },
}

export function initialsOf(name: string) {
  return name
    .replace(/\./g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

/** Cores pastel estáveis para o círculo de iniciais, escolhidas pelo id. */
const tones = ['bg-lilac-soft text-primary', 'bg-sand-soft text-warning', 'bg-mint-soft text-success', 'bg-orange-soft text-orange']
export function toneFor(id: string) {
  let value = 0
  for (const char of id) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return tones[value % tones.length]!
}

/** Link do WhatsApp a partir de um telefone brasileiro qualquer. */
export function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, '')
  const national = digits.startsWith('55') && digits.length > 11 ? digits : `55${digits}`
  return `https://wa.me/${national}`
}

/** Estado do acesso da empresa, pelo responsável principal (D23). */
export type CompanyAccessStatus = 'active' | 'pending' | 'expired' | 'no_manager'

export const companyAccessMeta: Record<CompanyAccessStatus, { label: string; variant: 'success' | 'accent' | 'destructive' | 'default' }> = {
  active: { label: 'Acesso ativo', variant: 'success' },
  pending: { label: 'Convite pendente', variant: 'accent' },
  expired: { label: 'Convite vencido', variant: 'destructive' },
  no_manager: { label: 'Sem responsável', variant: 'default' },
}

export type AdminCompanySummary = {
  id: string
  cnpj: string
  legalName: string
  tradeName: string
  city: string
  state: string
  createdAt: string
  status: CompanyAccessStatus
  manager: { name: string; email: string; jobTitle: string } | null
  membersCount: number
}

export type AdminCompanyDetail = Omit<AdminCompanySummary, 'manager' | 'membersCount'> & {
  size: 'mei' | 'micro' | 'small' | 'medium' | 'large'
  sector: string
  website: string | null
  about: string | null
  members: {
    id: string
    name: string
    jobTitle: string
    email: string
    phone: string | null
    isPrimary: boolean
    status: 'active' | 'pending' | 'expired'
  }[]
  managerChanges: { id: string; createdAt: string; origin: 'company' | 'admin'; fromName: string | null; toName: string | null; note: string | null }[]
}

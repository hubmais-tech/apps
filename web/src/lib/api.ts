import axios, { AxiosError } from 'axios'

const TOKEN_KEY = 'hubmais.token'

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3333',
})

api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Extrai a mensagem em português devolvida pela API. */
export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.') {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message
    if (typeof message === 'string') return message
    if (!error.response) return 'Não foi possível conectar ao servidor.'
  }
  return fallback
}

export type Role = 'student' | 'mentor' | 'company' | 'admin'

export type User = { id: string; name: string; email: string; role: Role }

export type CourseSummary = {
  id: string
  slug: string
  title: string
  description: string | null
  coverUrl: string | null
  priceInCents: number
  mentorName: string
}

export type StructureModule = {
  id: string
  title: string
  position: number
  lessons: {
    id: string
    title: string
    durationInSeconds: number
    position: number
    hasVideo: boolean
  }[]
}

export type WalletEntry = {
  id: string
  type: 'sale' | 'platform_fee' | 'refund' | 'withdrawal' | 'withdrawal_reversal'
  amountInCents: number
  availableAt: string
  description: string | null
  createdAt: string
}

export type Withdrawal = {
  id: string
  amountInCents: number
  pixKey: string
  pixKeyType: string
  status: 'requested' | 'paid' | 'rejected'
  note: string | null
  requestedAt: string
  processedAt: string | null
}

export type WalletData = {
  holdDays: number
  minimumWithdrawalInCents: number
  availableInCents: number
  pendingInCents: number
  entries: WalletEntry[]
  withdrawals: Withdrawal[]
}

export type Onboarding = { required: boolean; completed: boolean; path: string | null }

export type StudentProfile = {
  birthDate: string | null
  city: string | null
  neighborhood: string | null
  phone: string | null
  interests: string[]
  goal: string | null
  headline: string | null
  bio: string | null
  talentVisible: boolean
  onboardingCompleted: boolean
  onboardingSkipped: boolean
}

export type MentorAccount = {
  fullName: string
  cpfMasked: string
  birthDate: string
  phone: string
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
  pixKeyMasked: string
  bio: string
  expertise: string[]
  openedAt: string
}

export type CompanyMember = {
  id: string
  name: string
  jobTitle: string
  email: string
  phone: string | null
  isPrimary: boolean
  status: 'active' | 'pending' | 'expired'
}

export type Company = {
  id: string
  cnpj: string
  legalName: string
  tradeName: string
  sector: string
  size: 'mei' | 'micro' | 'small' | 'medium' | 'large'
  city: string
  state: string
  website: string | null
  about: string | null
  isOwner: boolean
  members: CompanyMember[]
}

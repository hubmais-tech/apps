import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability'

import type { Role } from './roles'

export type Action = 'manage' | 'get' | 'create' | 'update' | 'delete' | 'publish' | 'withdraw'
export type SubjectName =
  | 'all'
  | 'User'
  | 'Course'
  | 'Order'
  | 'Wallet'
  | 'Withdrawal'
  | 'PlatformWallet'
  | 'MentorAccount'
  | 'Company'
  | 'Talent'

// Subject solto (any) para que o CASL aceite condições por campo (ex.: { mentorId }).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppAbility = MongoAbility<[Action, any]>

export type AuthUser = {
  id: string
  role: Role
  /** Mentor com a carteira aberta (D13). Sem isso, não cria curso nem vê a carteira. */
  walletOpened?: boolean
  /** Empresa do representante, quando o cadastro da empresa já foi feito (D14). */
  companyId?: string | null
}

type PermissionsByRole = (user: AuthUser, builder: AbilityBuilder<AppAbility>) => void

const permissions: Record<Role, PermissionsByRole> = {
  student(user, { can }) {
    can(['get', 'update'], 'User', { id: user.id })
    can('get', 'Course', { isPublished: true })
    can('create', 'Order')
    can('get', 'Order', { buyerId: user.id })
  },
  mentor(user, { can }) {
    can(['get', 'update'], 'User', { id: user.id })
    can('get', 'Course', { isPublished: true })
    can('create', 'Order')
    can(['get', 'update'], 'MentorAccount', { userId: user.id })
    // Tudo abaixo exige a carteira aberta (D13).
    if (!user.walletOpened) return
    can('get', 'Course', { mentorId: user.id })
    can('create', 'Course')
    can(['update', 'delete', 'publish'], 'Course', { mentorId: user.id })
    can('get', 'Wallet', { userId: user.id })
    can('create', 'Withdrawal', { userId: user.id })
    can('get', 'Withdrawal', { userId: user.id })
  },
  company(user, { can }) {
    can(['get', 'update'], 'User', { id: user.id })
    can('get', 'Course', { isPublished: true })
    can('create', 'Order')
    if (user.companyId) {
      can(['get', 'update'], 'Company', { id: user.companyId })
      // Banco de Talentos: só para empresa com cadastro completo (D18).
      can('get', 'Talent')
    }
  },
  admin(_user, { can }) {
    can('manage', 'all')
  },
}

export function defineAbilityFor(user: AuthUser) {
  const builder = new AbilityBuilder<AppAbility>(createMongoAbility)
  permissions[user.role](user, builder)

  return builder.build({
    detectSubjectType: (subject) =>
      (typeof subject === 'string' ? subject : subject.__typename) as SubjectName,
  })
}

/** Marca um objeto com o tipo de subject para o CASL avaliar as condições. */
export function asSubject<T extends object>(typename: SubjectName, value: T) {
  return { ...value, __typename: typename } as T & { __typename: SubjectName }
}

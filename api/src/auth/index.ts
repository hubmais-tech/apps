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

// Subject solto (any) para que o CASL aceite condições por campo (ex.: { mentorId }).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppAbility = MongoAbility<[Action, any]>

export type AuthUser = { id: string; role: Role }

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
    can('get', 'Course', { mentorId: user.id })
    can('create', 'Course')
    can('create', 'Order')
    can(['update', 'delete', 'publish'], 'Course', { mentorId: user.id })
    can('get', 'Wallet', { userId: user.id })
    can('create', 'Withdrawal', { userId: user.id })
    can('get', 'Withdrawal', { userId: user.id })
  },
  company(user, { can }) {
    can(['get', 'update'], 'User', { id: user.id })
    can('get', 'Course', { isPublished: true })
    can('create', 'Order')
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

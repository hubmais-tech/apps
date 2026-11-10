import { courses, enrollments, lessonProgress, lessons, modules } from './courses'
import { ledgerEntries, orders, withdrawals } from './finance'
import { users } from './users'

export * from './courses'
export * from './finance'
export * from './users'

export const schema = {
  users,
  courses,
  modules,
  lessons,
  enrollments,
  lessonProgress,
  orders,
  ledgerEntries,
  withdrawals,
}

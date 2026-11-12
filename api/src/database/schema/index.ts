import { courses, enrollments, lessonProgress, lessons, modules } from './courses'
import { ledgerEntries, orders, withdrawals } from './finance'
import { certificates, challenges, invitations, portfolioItems, submissions } from './engagement'
import { companies, companyManagerChanges, companyMembers, mentorAccounts, studentProfiles } from './profiles'
import { users } from './users'

export * from './courses'
export * from './engagement'
export * from './finance'
export * from './profiles'
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
  studentProfiles,
  mentorAccounts,
  companies,
  companyMembers,
  companyManagerChanges,
  challenges,
  submissions,
  certificates,
  portfolioItems,
  invitations,
}

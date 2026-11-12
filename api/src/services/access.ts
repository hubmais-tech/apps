import { and, eq } from 'drizzle-orm'

import { asSubject, defineAbilityFor, type AuthUser } from '@/auth'
import { database } from '@/database/connection'
import { courses, enrollments } from '@/database/schema'

/** O mentor dono do curso e o aluno matriculado têm acesso ao conteúdo. */
export async function canAccessCourse(user: AuthUser, course: typeof courses.$inferSelect) {
  if (defineAbilityFor(user).can('update', asSubject('Course', course))) return true
  const [enrollment] = await database
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, course.id)))
  return Boolean(enrollment)
}

export async function isEnrolled(userId: string, courseId: string) {
  const [enrollment] = await database
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
  return Boolean(enrollment)
}

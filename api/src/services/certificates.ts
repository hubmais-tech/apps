import { randomBytes } from 'node:crypto'

import { and, eq, inArray } from 'drizzle-orm'

import { database, type DbOrTx } from '@/database/connection'
import { certificates, challenges, courses, lessonProgress, lessons, modules, submissions } from '@/database/schema'

/** Código curto e legível do certificado, no formato HUB-XXXX-XXXX (sem caracteres ambíguos). */
export function newCertificateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const pick = () => Array.from(randomBytes(4), (b) => alphabet[b % alphabet.length]).join('')
  return `HUB-${pick()}-${pick()}`
}

export type CourseCompletion = {
  totalLessons: number
  completedLessons: number
  totalChallenges: number
  approvedChallenges: number
  complete: boolean
}

/** Concluído = todas as aulas concluídas e todos os desafios aprovados (D16). Curso sem aula nunca conclui. */
export async function getCompletion(db: DbOrTx, userId: string, courseId: string): Promise<CourseCompletion> {
  const lessonRows = await db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(eq(modules.courseId, courseId))

  const done = lessonRows.length
    ? await db
        .select({ lessonId: lessonProgress.lessonId })
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.userId, userId),
            inArray(
              lessonProgress.lessonId,
              lessonRows.map((l) => l.id),
            ),
          ),
        )
    : []

  const challengeRows = await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.courseId, courseId))
  const approved = challengeRows.length
    ? await db
        .select({ challengeId: submissions.challengeId })
        .from(submissions)
        .where(
          and(
            eq(submissions.userId, userId),
            eq(submissions.status, 'approved'),
            inArray(
              submissions.challengeId,
              challengeRows.map((c) => c.id),
            ),
          ),
        )
    : []

  const completion = {
    totalLessons: lessonRows.length,
    completedLessons: done.length,
    totalChallenges: challengeRows.length,
    approvedChallenges: approved.length,
  }
  return {
    ...completion,
    complete: completion.totalLessons > 0 && completion.completedLessons >= completion.totalLessons && completion.approvedChallenges >= completion.totalChallenges,
  }
}

/** Emite o certificado se o aluno concluiu o curso e ainda não tem um. Devolve o certificado (novo ou existente). */
export async function issueCertificateIfComplete(userId: string, courseId: string) {
  const [existing] = await database.select().from(certificates).where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)))
  if (existing) return { certificate: existing, issuedNow: false }

  const completion = await getCompletion(database, userId, courseId)
  if (!completion.complete) return { certificate: null, issuedNow: false }

  // Tenta de novo se o código colidir (muito improvável) e ignora corrida entre duas conclusões simultâneas.
  for (let attempt = 0; attempt < 5; attempt++) {
    const [created] = await database
      .insert(certificates)
      .values({ userId, courseId, code: newCertificateCode() })
      .onConflictDoNothing()
      .returning()
    if (created) return { certificate: created, issuedNow: true }

    const [again] = await database.select().from(certificates).where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)))
    if (again) return { certificate: again, issuedNow: false }
  }
  return { certificate: null, issuedNow: false }
}

export async function courseTitle(courseId: string) {
  const [course] = await database.select({ title: courses.title }).from(courses).where(eq(courses.id, courseId))
  return course?.title ?? ''
}

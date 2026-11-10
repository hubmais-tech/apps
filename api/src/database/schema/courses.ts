import { boolean, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

import { users } from './users'

export const courses = pgTable('courses', {
  id: uuid().primaryKey().defaultRandom(),
  mentorId: uuid()
    .references(() => users.id, { onDelete: 'restrict' })
    .notNull(),
  title: text().notNull(),
  slug: text().notNull().unique(),
  description: text(),
  coverKey: text(),
  priceInCents: integer().notNull(),
  isPublished: boolean().default(false).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
})

export const modules = pgTable('modules', {
  id: uuid().primaryKey().defaultRandom(),
  courseId: uuid()
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull(),
  title: text().notNull(),
  position: integer().default(0).notNull(),
})

export const lessons = pgTable('lessons', {
  id: uuid().primaryKey().defaultRandom(),
  moduleId: uuid()
    .references(() => modules.id, { onDelete: 'cascade' })
    .notNull(),
  title: text().notNull(),
  videoKey: text(),
  durationInSeconds: integer().default(0).notNull(),
  position: integer().default(0).notNull(),
})

export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    courseId: uuid()
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.courseId)],
)

export const lessonProgress = pgTable(
  'lesson_progress',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    lessonId: uuid()
      .references(() => lessons.id, { onDelete: 'cascade' })
      .notNull(),
    completedAt: timestamp().defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.lessonId)],
)

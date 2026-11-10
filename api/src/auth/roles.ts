import { z } from 'zod'

export const roleSchema = z.enum(['student', 'mentor', 'company', 'admin'])
export type Role = z.infer<typeof roleSchema>

/** Perfis que a própria pessoa pode escolher no cadastro. Admin só é criado pelo seed. */
export const selfRegisterRoleSchema = z.enum(['student', 'mentor', 'company'])

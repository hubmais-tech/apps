import { z } from 'zod'

export const roleSchema = z.enum(['student', 'mentor', 'company', 'admin'])
export type Role = z.infer<typeof roleSchema>

/**
 * Perfis que a própria pessoa pode escolher no cadastro. Admin só é criado pelo seed.
 * Empresa não se cadastra sozinha: o Hub+ cadastra e convida o responsável (D23).
 */
export const selfRegisterRoleSchema = z.enum(['student', 'mentor'])

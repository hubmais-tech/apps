import { eq } from 'drizzle-orm'

import { env } from '@/env'
import { hashPassword } from '@/utils/password'

import { database, sql } from './connection'
import { users } from './schema'

async function seed() {
  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
    throw new Error('Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no .env')
  }

  const email = env.SEED_ADMIN_EMAIL.toLowerCase()
  const [existing] = await database.select({ id: users.id }).from(users).where(eq(users.email, email))

  if (existing) {
    console.log('Admin já existe:', email)
  } else {
    await database.insert(users).values({
      name: 'Admin Hub+',
      email,
      role: 'admin',
      passwordHash: await hashPassword(env.SEED_ADMIN_PASSWORD),
    })
    console.log('Admin criado:', email)
  }

  await sql.end()
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})

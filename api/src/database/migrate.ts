import { migrate } from 'drizzle-orm/postgres-js/migrator'

import { database, sql } from './connection'

/**
 * Aplica as migrações pendentes. Usado no deploy (imagem Docker), onde o drizzle-kit não existe.
 * Usa a mesma tabela de controle do `drizzle-kit migrate`, então os dois podem se alternar.
 */
const folder = process.env.MIGRATIONS_DIR ?? 'src/database/migrations'

migrate(database, { migrationsFolder: folder })
  .then(() => console.log(`Migrações aplicadas (${folder}).`))
  .catch((error) => {
    console.error('Falha ao aplicar as migrações:', error)
    process.exitCode = 1
  })
  .finally(() => sql.end())

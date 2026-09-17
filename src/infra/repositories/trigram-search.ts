import { type SQL, sql } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'

// Os índices GIN da migration 0006 são sobre immutable_unaccent(coluna), sem lower(): o pg_trgm
// já rebaixa a caixa ao extrair trigramas. Escrever a expressão de qualquer outro jeito troca o
// índice por um seq scan, sem erro nenhum.
export function matchesTerm(column: PgColumn, term: string): SQL {
  return sql`(
    immutable_unaccent(${column}) ilike '%' || immutable_unaccent(${term}) || '%'
    or immutable_unaccent(${column}) % immutable_unaccent(${term})
  )`
}

export function similarityTo(column: PgColumn, term: string): SQL {
  return sql`similarity(immutable_unaccent(${column}), immutable_unaccent(${term})) desc`
}

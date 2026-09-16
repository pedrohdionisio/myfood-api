const UNIQUE_VIOLATION = '23505'

// O Drizzle embrulha o erro do postgres.js em DrizzleQueryError, então `code` e
// `constraint_name` ficam em `cause`, não no topo.
export function violatesUniqueConstraint(error: unknown, constraint: string): boolean {
  let current: unknown = error

  while (typeof current === 'object' && current !== null) {
    const {
      code,
      constraint_name: constraintName,
      cause
    } = current as {
      code?: unknown
      constraint_name?: unknown
      cause?: unknown
    }

    if (code === UNIQUE_VIOLATION && constraintName === constraint) {
      return true
    }

    current = cause
  }

  return false
}

import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let sql: NeonQueryFunction<false, false> | null = null;

/**
 * Returns a Neon SQL tagged-template client, reusing the same instance.
 * Reads DATABASE_URL from env (set automatically by Vercel/Neon integration).
 *
 * Usage:
 *   const sql = getDb();
 *   const { rows } = await sql`SELECT * FROM eoi_template_values WHERE state = ${state}`;
 */
export function getDb(): NeonQueryFunction<false, false> {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    sql = neon(url);
  }
  return sql;
}

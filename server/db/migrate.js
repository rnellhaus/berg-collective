import { migrations } from './migrations/index.js';

export async function runMigrations(pool) {
  const client = await pool.connect();
  const applied = [];

  try {
    await client.query('BEGIN');
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('berg_schema_migrations'))"
    );
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const migration of migrations) {
      const { rows } = await client.query(
        'SELECT id FROM schema_migrations WHERE id = $1',
        [migration.id]
      );
      if (rows[0]) continue;

      await client.query(migration.up);
      await client.query(
        'INSERT INTO schema_migrations (id) VALUES ($1)',
        [migration.id]
      );
      applied.push(migration.id);
    }

    await client.query('COMMIT');
    for (const migrationId of applied) {
      console.log(`Applied database migration: ${migrationId}`);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

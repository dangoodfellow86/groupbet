import fs from 'fs';
import path from 'path';
import { pool } from './pool';

async function runMigrations() {
  console.log('--- Starting Groupbet Database Migrations ---');
  const migrationsDir = path.join(process.cwd(), 'src/server/db/migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();

  try {
    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (const file of files) {
      const res = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [file]
      );

      if (res.rowCount && res.rowCount > 0) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`Applying migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`✓ Migration applied successfully: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`✗ Error applying migration ${file}:`, err);
        throw err;
      }
    }

    console.log('--- All migrations applied successfully ---');
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

export { runMigrations };

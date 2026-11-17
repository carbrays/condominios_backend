const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function runMigrations() {
  console.log('[MIGRATION] Iniciando ejecución de migraciones PostgreSQL...');
  const client = await pool.connect();

  try {
    // 1. Crear tabla de control de migraciones
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT filename FROM schema_migrations WHERE filename = $1',
        [file]
      );

      if (rows.length === 0) {
        console.log(`[MIGRATION] Aplicando: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[MIGRATION] ✓ ${file} ejecutada exitosamente.`);
      } else {
        console.log(`[MIGRATION] - ${file} ya fue aplicada previamente.`);
      }
    }

    console.log('[MIGRATION] Todas las migraciones fueron completadas.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION ERROR] Error ejecutando migraciones:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };

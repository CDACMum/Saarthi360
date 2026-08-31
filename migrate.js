// VNS Labs — Run Security Migrations
// Usage: node migrate.js
// Set PGPASS env var before running (see run_migrate.bat)

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PASS = process.env.PGPASS;
if (!PASS) { console.error('ERROR: Set PGPASS env var first'); process.exit(1); }

const client = new Client({
  host: 'db.cdefohsbowuuafbohiyc.supabase.co',
  port: 5432,
  user: 'postgres',
  password: PASS,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

const MIGRATIONS = [
  'supabase_rls_migration.sql',
  'security_hardening_now.sql',
  'security_phase1.sql',
];

async function run() {
  console.log('\n=== VNS Labs Security Migration Runner ===\n');
  await client.connect();
  console.log('✓ Connected to Supabase\n');

  for (const file of MIGRATIONS) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠ Skipping ${file} (not found)`);
      continue;
    }
    console.log(`Running: ${file} ...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      const results = await client.query(sql);
      const rows = Array.isArray(results)
        ? results.flatMap(r => r.rows || [])
        : (results.rows || []);
      if (rows.length) {
        console.log('  Result:');
        console.table(rows);
      }
      console.log(`  ✓ Done\n`);
    } catch (err) {
      console.error(`  ✗ Error in ${file}:`, err.message);
      await client.end();
      process.exit(1);
    }
  }

  // Final verification
  console.log('=== Verification ===');
  const rls = await client.query(`
    SELECT tablename, rowsecurity AS rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('modules','sets','mcq_bank','students','scores','answers','config')
    ORDER BY tablename;
  `);
  console.log('\nRLS Status:');
  console.table(rls.rows);

  const cols = await client.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND ((table_name = 'students' AND column_name = 'passHash')
        OR (table_name = 'scores'   AND column_name = 'tabSwitches'))
    ORDER BY table_name, column_name;
  `);
  console.log('\nNew Columns:');
  console.table(cols.rows);

  await client.end();
  console.log('\n✅ All migrations complete!\n');
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

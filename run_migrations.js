/**
 * VNS Labs — Migration Runner
 * Run: node run_migrations.js
 *
 * This script applies all pending security migrations to the Supabase project.
 * It needs the DB password — set it as an environment variable:
 *
 *   Windows PowerShell:
 *     $env:SUPABASE_DB_PASS = "your_db_password_here"
 *     node run_migrations.js
 *
 *   Git Bash / CMD:
 *     set SUPABASE_DB_PASS=your_db_password_here
 *     node run_migrations.js
 *
 * Where to find the DB password:
 *   Supabase Dashboard → project cdefohsbowuuafbohiyc
 *   → Settings → Database → Database password
 *   (or reset it there if forgotten)
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'cdefohsbowuuafbohiyc';
const DB_PASS = process.env.SUPABASE_DB_PASS;

if (!DB_PASS) {
  console.error('\n❌  SUPABASE_DB_PASS environment variable not set.');
  console.error('    Set it first, then re-run:\n');
  console.error('    PowerShell:  $env:SUPABASE_DB_PASS = "your_password"');
  console.error('    Git Bash:    export SUPABASE_DB_PASS=your_password\n');
  process.exit(1);
}

const connectionString =
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASS)}` +
  `@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

// Migrations to run IN ORDER
const MIGRATIONS = [
  'supabase_rls_migration.sql',
  'security_hardening_now.sql',
  'security_phase1.sql',
  'sql_questions_v2_migration.sql',
];

async function runMigrations() {
  const client = new Client({ connectionString });

  try {
    console.log('\n🔌  Connecting to Supabase...');
    await client.connect();
    console.log('✅  Connected.\n');

    for (const file of MIGRATIONS) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️   Skipping ${file} (not found)`);
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`▶   Running ${file}...`);

      try {
        await client.query(sql);
        console.log(`✅  ${file} — done\n`);
      } catch (err) {
        // "already exists" errors are safe to ignore
        if (err.message.includes('already exists') || err.message.includes('does not exist')) {
          console.log(`ℹ️   ${file} — skipped (${err.message.split('\n')[0]})\n`);
        } else {
          console.error(`❌  ${file} FAILED: ${err.message}\n`);
        }
      }
    }

    // Final verification
    console.log('🔍  Verifying RLS status...');
    const { rows } = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('students','scores','mcq_bank','config','coding_questions','answers','modules','sets')
      ORDER BY tablename;
    `);

    console.log('\n  Table               | RLS Enabled');
    console.log('  -------------------|-------------');
    rows.forEach(r => {
      const status = r.rowsecurity ? '✅  YES' : '❌  NO';
      console.log(`  ${r.tablename.padEnd(19)}| ${status}`);
    });

    // Check passHash column
    const { rows: cols } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='students'
        AND column_name IN ('pass','passHash');
    `);
    console.log('\n  Students columns:', cols.map(c => c.column_name).join(', '));

    console.log('\n✅  All migrations complete.\n');

  } catch (err) {
    console.error('\n❌  Connection failed:', err.message);
    console.error('    Check your DB password and try again.\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();

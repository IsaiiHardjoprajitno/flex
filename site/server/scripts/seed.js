/**
 * Database Seed Script
 * Reads and executes schema.sql to initialize the database with tables and seed data.
 *
 * Usage: node scripts/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function seed() {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');

  console.log('[Seed] Reading schema.sql...');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('[Seed] Executing schema against database...');

  try {
    await pool.query(sql);
    console.log('[Seed] ✅ Database initialized successfully with tables and seed data.');
  } catch (err) {
    console.error('[Seed] ❌ Error executing schema:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('[Seed] Connection pool closed.');
  }
}

seed();

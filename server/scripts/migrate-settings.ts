/**
 * migrate-settings.ts
 * 
 * This script creates the settings table in the database.
 * Run this script before starting the application to ensure the settings table exists.
 */

import { db, pool } from '../db';
import { settings } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { log } from '../vite';

// Export function to be used in server/index.ts
export async function createSettingsTable() {
  try {
    // Check if the settings table exists
    const tableExists = await checkIfTableExists('settings');
    
    if (tableExists) {
      log('Settings table already exists');
      return;
    }
    
    // Create the settings table
    log('Creating settings table...');
    
    const createTableSQL = sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value JSONB,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    
    await db.execute(createTableSQL);
    log('Settings table created successfully');
    
  } catch (error) {
    log(`Error creating settings table: ${error}`);
    throw error;
  }
}

export async function checkIfTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = $1
      )
    `, [tableName]);
    
    return result.rows[0].exists;
  } catch (error) {
    log(`Error checking if table exists: ${error}`);
    return false;
  }
}

// For ES modules, we need a different way to check if the file is executed directly
// This code will only run when the script is executed directly from command line
// and not when imported as a module
import { fileURLToPath } from 'url';

// Detect if this file is being run directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  createSettingsTable()
    .then(() => {
      log('Settings table migration completed');
      process.exit(0);
    })
    .catch((error) => {
      log(`Settings table migration failed: ${error}`);
      process.exit(1);
    });
}
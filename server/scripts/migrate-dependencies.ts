/**
 * migrate-dependencies.ts
 * 
 * This script creates the cluster_dependencies table in the database.
 * Run this script before using any cluster dependency features.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { clusterDependencies } from '@shared/schema';
import { sql } from 'drizzle-orm';
import ws from 'ws';

// Configure Neon to use the WebSocket library
neonConfig.webSocketConstructor = ws;

// Check if the environment variable is set
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set. Please set this environment variable.');
  process.exit(1);
}

// Create a connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export async function checkIfTableExists(tableName: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = $1
      )
    `, [tableName]);
    return result.rows[0].exists;
  } finally {
    client.release();
  }
}

export async function createDependenciesTable() {
  console.log('Checking if cluster_dependencies table exists...');
  const tableExists = await checkIfTableExists('cluster_dependencies');
  
  if (tableExists) {
    console.log('cluster_dependencies table already exists.');
    return;
  }
  
  console.log('Creating cluster_dependencies table...');
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS cluster_dependencies (
        id SERIAL PRIMARY KEY,
        cluster_id TEXT NOT NULL REFERENCES clusters(cluster_id),
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        namespace TEXT NOT NULL,
        version TEXT,
        status TEXT NOT NULL,
        detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata JSONB
      )
    `);
    console.log('Successfully created cluster_dependencies table.');
  } catch (error) {
    console.error('Error creating cluster_dependencies table:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Main function to run when the script is executed directly
async function main() {
  try {
    await createDependenciesTable();
    console.log('Dependencies table migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during dependencies table migration:', error);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
// In ES modules, we need to detect if this is the main module differently
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  main();
}
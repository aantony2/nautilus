/**
 * scheduler.ts
 * 
 * This script sets up a scheduler to run the cloud data update script at the specified interval.
 * The update schedule is stored in the database as part of the cloud provider credentials.
 */

import { scheduleJob } from 'node-schedule';
import { exec } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { log } from '../vite';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { settings } from '@shared/schema';
import { CloudProviderCredentials } from '../settings';

// Get current file directory (ES modules compatible replacement for __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPDATE_SCRIPT_PATH = join(__dirname, 'update-cloud-data.ts');

// Setting key for cloud credentials in the database
const CLOUD_CREDENTIALS_KEY = 'cloud_credentials';

/**
 * Check if any cloud provider is enabled and configured
 */
function isAnyCloudProviderEnabled(credentials: CloudProviderCredentials): boolean {
  return !!(
    (credentials.gcpEnabled && credentials.gcpProjectId && credentials.gcpCredentialsJson) ||
    (credentials.azureEnabled && credentials.azureTenantId && credentials.azureClientId && 
     credentials.azureClientSecret && credentials.azureSubscriptionId) ||
    (credentials.awsEnabled && credentials.awsAccessKeyId && credentials.awsSecretAccessKey)
  );
}

/**
 * Execute the cloud data update script
 */
function executeUpdateScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    log('Executing cloud data update script...');
    
    exec(`npx tsx ${UPDATE_SCRIPT_PATH}`, (error, stdout, stderr) => {
      if (error) {
        log(`Error executing update script: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        log(`Update script stderr: ${stderr}`);
      }
      
      log(`Update script stdout: ${stdout}`);
      log('Cloud data update completed successfully');
      resolve();
    });
  });
}

/**
 * Get the cloud credentials from the database
 */
async function getCloudCredentials(): Promise<CloudProviderCredentials | null> {
  try {
    const result = await db.select().from(settings).where(eq(settings.key, CLOUD_CREDENTIALS_KEY));
    
    if (result.length > 0 && result[0].value) {
      return result[0].value as CloudProviderCredentials;
    }
    
    return null;
  } catch (error) {
    log(`Error getting cloud credentials: ${error}`);
    return null;
  }
}

/**
 * Initialize the scheduler based on the update schedule in the cloud credentials
 */
export async function initializeScheduler(): Promise<void> {
  try {
    // Get cloud credentials from database
    const credentials = await getCloudCredentials();
    
    if (!credentials) {
      log('No cloud credentials found in database. Scheduler not initialized.');
      return;
    }
    
    if (!isAnyCloudProviderEnabled(credentials)) {
      log('No cloud provider is enabled and configured. Scheduler not initialized.');
      return;
    }
    
    const schedule = credentials.updateSchedule || '0 2 * * *'; // Default: every day at 2 AM
    
    // Schedule the job with node-schedule
    const job = scheduleJob(schedule, async () => {
      try {
        log(`Scheduled job triggered with schedule: ${schedule}`);
        await executeUpdateScript();
      } catch (error) {
        log(`Error in scheduled job: ${error}`);
      }
    });
    
    log(`Scheduler initialized with schedule: ${schedule}`);
    
    // Also run the update immediately if there are enabled cloud providers
    log('Running initial cloud data update...');
    executeUpdateScript().catch(error => {
      log(`Error in initial cloud data update: ${error}`);
    });
    
  } catch (error) {
    log(`Error initializing scheduler: ${error}`);
  }
}
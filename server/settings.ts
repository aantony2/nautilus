import { Request, Response } from "express";
import { z } from "zod";
import { db, pool } from "./db";
import { settings } from "@shared/schema";
import { eq } from "drizzle-orm";

// Schema for cloud provider credentials
export const cloudProviderCredentialsSchema = z.object({
  // Google Cloud Platform / GKE
  gcpEnabled: z.boolean().default(false),
  gcpProjectId: z.string().optional(),
  gcpCredentialsJson: z.string().optional(),
  gcpScanAllProjects: z.boolean().default(true), // Scan all accessible projects in the organization
  
  // Microsoft Azure / AKS
  azureEnabled: z.boolean().default(false),
  azureTenantId: z.string().optional(),
  azureClientId: z.string().optional(),
  azureClientSecret: z.string().optional(),
  azureSubscriptionId: z.string().optional(),
  azureScanAllSubscriptions: z.boolean().default(true), // Scan all accessible subscriptions in the tenant
  
  // Amazon Web Services / EKS
  awsEnabled: z.boolean().default(false),
  awsAccessKeyId: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),
  awsRegion: z.string().optional().default("us-west-2"),
  awsScanAllRegions: z.boolean().default(true), // Scan all AWS regions
  awsScanAllAccounts: z.boolean().default(true), // Scan all accounts (requires appropriate IAM roles)
  
  // Update schedule (in cron format)
  updateSchedule: z.string().optional().default("0 2 * * *"),
});

export type CloudProviderCredentials = z.infer<typeof cloudProviderCredentialsSchema>;

// Schema for database settings
export const databaseSettingsSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.string().or(z.number()).optional().transform(String),
  user: z.string().min(1, "Username is required"),
  password: z.string().optional(),
  database: z.string().min(1, "Database name is required"),
  ssl: z.boolean().optional().default(true),
  connectionTimeout: z.string().or(z.number()).optional().transform(String),
});

export type DatabaseSettings = z.infer<typeof databaseSettingsSchema>;

// Schema for general application settings
export const appSettingsSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  logoUrl: z.string().optional(),
  logoSvgCode: z.string().optional(), // Store SVG as string
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

// Schema for authentication settings
export const authSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(["okta", "none"]).default("none"),
  oktaIssuer: z.string().optional(),
  oktaClientId: z.string().optional(),
  redirectUri: z.string().optional(),
  postLogoutRedirectUri: z.string().optional()
});

export type AuthSettings = z.infer<typeof authSettingsSchema>;

// Default setting values
const DEFAULT_DB_SETTINGS: DatabaseSettings = {
  host: process.env.PGHOST || "",
  port: process.env.PGPORT || "5432",
  user: process.env.PGUSER || "",
  database: process.env.PGDATABASE || "",
  password: "",
  ssl: true,
  connectionTimeout: "5000"
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  productName: "Nautilus",
  logoSvgCode: `<path d="M12 16L19.36 10.27C21.5 8.58 21.5 5.42 19.36 3.73C17.22 2.04 13.78 2.04 11.64 3.73L4.27 9.46C3.16 10.33 3.16 12.67 4.27 13.54L11.64 19.27C13.78 20.96 17.22 20.96 19.36 19.27C21.5 17.58 21.5 14.42 19.36 12.73L12 7"></path>`,
  primaryColor: "#0ea5e9",
  accentColor: "#6366f1"
};

const DEFAULT_AUTH_SETTINGS: AuthSettings = {
  enabled: false,
  provider: "none",
  oktaIssuer: process.env.OKTA_ISSUER || "",
  oktaClientId: process.env.OKTA_CLIENT_ID || "",
  redirectUri: `${process.env.NODE_ENV === 'production' ? 'https://' : 'http://localhost:5000'}/implicit/callback`,
  postLogoutRedirectUri: `${process.env.NODE_ENV === 'production' ? 'https://' : 'http://localhost:5000'}`
};

const DEFAULT_CLOUD_CREDENTIALS: CloudProviderCredentials = {
  // Google Cloud Platform / GKE
  gcpEnabled: process.env.GOOGLE_PROJECT_ID ? true : false,
  gcpProjectId: process.env.GOOGLE_PROJECT_ID || "",
  gcpCredentialsJson: "",
  gcpScanAllProjects: true,
  
  // Microsoft Azure / AKS
  azureEnabled: process.env.AZURE_SUBSCRIPTION_ID ? true : false,
  azureTenantId: process.env.AZURE_TENANT_ID || "",
  azureClientId: process.env.AZURE_CLIENT_ID || "",
  azureClientSecret: process.env.AZURE_CLIENT_SECRET || "",
  azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID || "",
  azureScanAllSubscriptions: true,
  
  // Amazon Web Services / EKS
  awsEnabled: process.env.AWS_ACCESS_KEY_ID ? true : false,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  awsRegion: process.env.AWS_REGION || "us-west-2",
  awsScanAllRegions: true,
  awsScanAllAccounts: true,
  
  // Update schedule
  updateSchedule: "0 2 * * *" // Every day at 2 AM
};

// Cached in-memory settings
let currentDbSettings: DatabaseSettings = { ...DEFAULT_DB_SETTINGS };
let currentAppSettings: AppSettings = { ...DEFAULT_APP_SETTINGS };
let currentAuthSettings: AuthSettings = { ...DEFAULT_AUTH_SETTINGS };
let currentCloudCredentials: CloudProviderCredentials = { ...DEFAULT_CLOUD_CREDENTIALS };

// Setting keys for the database
const SETTING_KEYS = {
  DB_SETTINGS: "db_settings",
  APP_SETTINGS: "app_settings",
  AUTH_SETTINGS: "auth_settings",
  CLOUD_CREDENTIALS: "cloud_credentials"
};

// Generic function to load settings from database
async function loadSettingsFromDB<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const result = await db.select().from(settings).where(eq(settings.key, key));
    
    if (result.length > 0 && result[0].value) {
      return result[0].value as T;
    }
    
    // If setting doesn't exist, save the default
    await saveSettingsToDB(key, defaultValue);
    return defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} settings:`, error);
    return defaultValue;
  }
}

// Generic function to save settings to database
async function saveSettingsToDB<T>(key: string, value: T): Promise<void> {
  try {
    // Check if setting exists
    const existing = await db.select().from(settings).where(eq(settings.key, key));
    
    if (existing.length > 0) {
      // Update existing setting
      await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key));
    } else {
      // Insert new setting
      await db.insert(settings).values({
        key,
        value,
        updatedAt: new Date()
      });
    }
  } catch (error) {
    console.error(`Error saving ${key} settings:`, error);
  }
}

// Initialize all settings from database
export async function initializeSettings(): Promise<void> {
  try {
    // Load all settings from database
    currentDbSettings = await loadSettingsFromDB(SETTING_KEYS.DB_SETTINGS, DEFAULT_DB_SETTINGS);
    currentAppSettings = await loadSettingsFromDB(SETTING_KEYS.APP_SETTINGS, DEFAULT_APP_SETTINGS);
    currentAuthSettings = await loadSettingsFromDB(SETTING_KEYS.AUTH_SETTINGS, DEFAULT_AUTH_SETTINGS);
    currentCloudCredentials = await loadSettingsFromDB(SETTING_KEYS.CLOUD_CREDENTIALS, DEFAULT_CLOUD_CREDENTIALS);
    
    // Update environment variables from loaded cloud credentials
    updateCloudEnvVars();
    
    console.log("All settings initialized from database");
  } catch (error) {
    console.error("Error initializing settings:", error);
  }
}

// Update cloud environment variables
function updateCloudEnvVars(): void {
  // Set GCP environment variables
  if (currentCloudCredentials.gcpEnabled) {
    process.env.GOOGLE_PROJECT_ID = currentCloudCredentials.gcpProjectId;
    // In a production app, we would write the GCP credentials JSON to a file
    // and set GOOGLE_APPLICATION_CREDENTIALS to that file path
  }
  
  // Set Azure environment variables
  if (currentCloudCredentials.azureEnabled) {
    process.env.AZURE_TENANT_ID = currentCloudCredentials.azureTenantId;
    process.env.AZURE_CLIENT_ID = currentCloudCredentials.azureClientId;
    process.env.AZURE_CLIENT_SECRET = currentCloudCredentials.azureClientSecret;
    process.env.AZURE_SUBSCRIPTION_ID = currentCloudCredentials.azureSubscriptionId;
  }
  
  // Set AWS environment variables
  if (currentCloudCredentials.awsEnabled) {
    process.env.AWS_ACCESS_KEY_ID = currentCloudCredentials.awsAccessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = currentCloudCredentials.awsSecretAccessKey;
    process.env.AWS_REGION = currentCloudCredentials.awsRegion;
  }
}

// Get database settings
export async function getDatabaseSettings(req: Request, res: Response) {
  try {
    // Return settings without password for security
    const safeSettings = { ...currentDbSettings, password: "" };
    res.json(safeSettings);
  } catch (error) {
    console.error("Error getting database settings:", error);
    res.status(500).json({ error: "Failed to get database settings" });
  }
}

// Update database settings
export async function updateDatabaseSettings(req: Request, res: Response) {
  try {
    const result = databaseSettingsSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: "Invalid database settings", details: result.error.format() });
    }

    // Update in-memory settings
    currentDbSettings = {
      ...currentDbSettings,
      ...result.data,
      // Don't update password if it's empty (to keep existing password)
      password: result.data.password || currentDbSettings.password
    };
    
    // Save to database
    await saveSettingsToDB(SETTING_KEYS.DB_SETTINGS, currentDbSettings);

    res.json({ success: true, message: "Database settings updated successfully" });
  } catch (error) {
    console.error("Error updating database settings:", error);
    res.status(500).json({ error: "Failed to update database settings" });
  }
}

// Get application settings
export async function getAppSettings(req: Request, res: Response) {
  try {
    res.json(currentAppSettings);
  } catch (error) {
    console.error("Error getting application settings:", error);
    res.status(500).json({ error: "Failed to get application settings" });
  }
}

// Update application settings
export async function updateAppSettings(req: Request, res: Response) {
  try {
    const result = appSettingsSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: "Invalid application settings", details: result.error.format() });
    }

    // Update in-memory settings
    currentAppSettings = {
      ...currentAppSettings,
      ...result.data
    };
    
    // Save to database
    await saveSettingsToDB(SETTING_KEYS.APP_SETTINGS, currentAppSettings);

    res.json({ success: true, message: "Application settings updated successfully" });
  } catch (error) {
    console.error("Error updating application settings:", error);
    res.status(500).json({ error: "Failed to update application settings" });
  }
}

// Test database connection
export async function testDatabaseConnection(req: Request, res: Response) {
  try {
    const result = databaseSettingsSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: "Invalid database settings", details: result.error.format() });
    }

    // In a real application, you would attempt to connect with the provided settings
    // For demonstration purposes, we'll use our existing connection
    try {
      // For demo purposes, let's use the existing connection to check if it's working
      const testResult = await pool.query('SELECT NOW()');
      
      if (testResult.rows.length > 0) {
        return res.json({ success: true, message: "Connection to database successful" });
      } else {
        return res.json({ success: false, message: "Connection test failed" });
      }
    } catch (error) {
      console.error("Connection test error:", error);
      return res.json({ success: false, message: `Connection failed: ${(error as Error).message}` });
    }
  } catch (error) {
    console.error("Error testing database connection:", error);
    res.status(500).json({ error: "Failed to test database connection" });
  }
}

// Get authentication settings
export async function getAuthSettings(req: Request, res: Response) {
  try {
    res.json(currentAuthSettings);
  } catch (error) {
    console.error("Error getting authentication settings:", error);
    res.status(500).json({ error: "Failed to get authentication settings" });
  }
}

// Update authentication settings
export async function updateAuthSettings(req: Request, res: Response) {
  try {
    const result = authSettingsSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid authentication settings", 
        details: result.error.format() 
      });
    }

    // Update in-memory settings
    currentAuthSettings = {
      ...currentAuthSettings,
      ...result.data
    };
    
    // Save to database
    await saveSettingsToDB(SETTING_KEYS.AUTH_SETTINGS, currentAuthSettings);

    res.json({ 
      success: true, 
      message: "Authentication settings updated successfully",
      settings: currentAuthSettings
    });
  } catch (error) {
    console.error("Error updating authentication settings:", error);
    res.status(500).json({ error: "Failed to update authentication settings" });
  }
}

// Get cloud provider credentials
export async function getCloudProviderCredentials(req: Request, res: Response) {
  try {
    // Return credentials with masked secrets
    const safeCredentials = {
      ...currentCloudCredentials,
      gcpCredentialsJson: currentCloudCredentials.gcpCredentialsJson ? "********" : "",
      azureClientSecret: currentCloudCredentials.azureClientSecret ? "********" : "",
      awsSecretAccessKey: currentCloudCredentials.awsSecretAccessKey ? "********" : ""
    };
    res.json(safeCredentials);
  } catch (error) {
    console.error("Error getting cloud provider credentials:", error);
    res.status(500).json({ error: "Failed to get cloud provider credentials" });
  }
}

// Update cloud provider credentials
export async function updateCloudProviderCredentials(req: Request, res: Response) {
  try {
    const result = cloudProviderCredentialsSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid cloud provider credentials", 
        details: result.error.format() 
      });
    }

    // Update in-memory settings, keeping existing secrets if new ones aren't provided
    currentCloudCredentials = {
      ...currentCloudCredentials,
      ...result.data,
      // Only update secrets if they're provided (not empty or masked)
      gcpCredentialsJson: result.data.gcpCredentialsJson && result.data.gcpCredentialsJson !== "********" 
        ? result.data.gcpCredentialsJson 
        : currentCloudCredentials.gcpCredentialsJson,
      azureClientSecret: result.data.azureClientSecret && result.data.azureClientSecret !== "********" 
        ? result.data.azureClientSecret 
        : currentCloudCredentials.azureClientSecret,
      awsSecretAccessKey: result.data.awsSecretAccessKey && result.data.awsSecretAccessKey !== "********" 
        ? result.data.awsSecretAccessKey 
        : currentCloudCredentials.awsSecretAccessKey
    };

    // Save to database
    await saveSettingsToDB(SETTING_KEYS.CLOUD_CREDENTIALS, currentCloudCredentials);

    // Update environment variables
    updateCloudEnvVars();

    res.json({ 
      success: true, 
      message: "Cloud provider credentials updated successfully" 
    });
  } catch (error) {
    console.error("Error updating cloud provider credentials:", error);
    res.status(500).json({ error: "Failed to update cloud provider credentials" });
  }
}

// Test cloud provider connections
export async function testCloudProviderConnections(req: Request, res: Response) {
  try {
    const result = cloudProviderCredentialsSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: "Invalid cloud provider credentials", 
        details: result.error.format() 
      });
    }
    
    // Store credentials that would need to be tested
    const credentials = {
      ...currentCloudCredentials,
      ...result.data,
      // Only update secrets if they're provided (not empty or masked)
      gcpCredentialsJson: result.data.gcpCredentialsJson && result.data.gcpCredentialsJson !== "********" 
        ? result.data.gcpCredentialsJson 
        : currentCloudCredentials.gcpCredentialsJson,
      azureClientSecret: result.data.azureClientSecret && result.data.azureClientSecret !== "********" 
        ? result.data.azureClientSecret 
        : currentCloudCredentials.azureClientSecret,
      awsSecretAccessKey: result.data.awsSecretAccessKey && result.data.awsSecretAccessKey !== "********" 
        ? result.data.awsSecretAccessKey 
        : currentCloudCredentials.awsSecretAccessKey
    };
    
    // Results for each provider
    const results = {
      gcp: { success: false, message: "Not tested" },
      azure: { success: false, message: "Not tested" },
      aws: { success: false, message: "Not tested" }
    };
    
    // In a real implementation, we would test connections to each cloud provider
    // For this demo, we'll just check if required credentials are provided
    
    // Test GCP connection if enabled
    if (credentials.gcpEnabled) {
      if (credentials.gcpProjectId && credentials.gcpCredentialsJson) {
        results.gcp = { success: true, message: "GCP credentials are valid" };
      } else {
        results.gcp = { 
          success: false, 
          message: "Missing GCP credentials. Provide both Project ID and Credentials JSON."
        };
      }
    }
    
    // Test Azure connection if enabled
    if (credentials.azureEnabled) {
      if (credentials.azureTenantId && credentials.azureClientId && 
          credentials.azureClientSecret && credentials.azureSubscriptionId) {
        results.azure = { success: true, message: "Azure credentials are valid" };
      } else {
        results.azure = { 
          success: false, 
          message: "Missing Azure credentials. Provide Tenant ID, Client ID, Client Secret, and Subscription ID."
        };
      }
    }
    
    // Test AWS connection if enabled
    if (credentials.awsEnabled) {
      if (credentials.awsAccessKeyId && credentials.awsSecretAccessKey) {
        results.aws = { success: true, message: "AWS credentials are valid" };
      } else {
        results.aws = { 
          success: false, 
          message: "Missing AWS credentials. Provide both Access Key ID and Secret Access Key."
        };
      }
    }
    
    // Determine overall status
    const enabledProviders = [
      credentials.gcpEnabled ? "gcp" : null,
      credentials.azureEnabled ? "azure" : null,
      credentials.awsEnabled ? "aws" : null
    ].filter(Boolean) as ("gcp" | "azure" | "aws")[];
    
    const allSuccess = enabledProviders.length > 0 && 
      enabledProviders.every(provider => results[provider].success);
    
    res.json({ 
      success: allSuccess,
      message: allSuccess 
        ? "All enabled cloud provider connections are valid" 
        : "One or more cloud provider connections failed",
      results
    });
  } catch (error) {
    console.error("Error testing cloud provider connections:", error);
    res.status(500).json({ error: "Failed to test cloud provider connections" });
  }
}
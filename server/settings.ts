import { Request, Response } from "express";
import { z } from "zod";
import { db, pool } from "./db";

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

// Store current settings (for demo purposes)
let currentDbSettings: DatabaseSettings = {
  host: process.env.PGHOST || "",
  port: process.env.PGPORT || "5432",
  user: process.env.PGUSER || "",
  database: process.env.PGDATABASE || "",
  ssl: true,
  connectionTimeout: "5000"
};

// Default app settings with Nautilus branding
let currentAppSettings: AppSettings = {
  productName: "Nautilus",
  logoSvgCode: `<path d="M12 16L19.36 10.27C21.5 8.58 21.5 5.42 19.36 3.73C17.22 2.04 13.78 2.04 11.64 3.73L4.27 9.46C3.16 10.33 3.16 12.67 4.27 13.54L11.64 19.27C13.78 20.96 17.22 20.96 19.36 19.27C21.5 17.58 21.5 14.42 19.36 12.73L12 7"></path>`,
  primaryColor: "#0ea5e9",
  accentColor: "#6366f1"
};

// Default auth settings - disabled in development
let currentAuthSettings: AuthSettings = {
  enabled: false,
  provider: "none",
  oktaIssuer: process.env.OKTA_ISSUER || "",
  oktaClientId: process.env.OKTA_CLIENT_ID || "",
  redirectUri: `${process.env.NODE_ENV === 'production' ? 'https://' : 'http://localhost:5000'}/implicit/callback`,
  postLogoutRedirectUri: `${process.env.NODE_ENV === 'production' ? 'https://' : 'http://localhost:5000'}`
};

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

    // In a real application, you would update the connection pool here
    // For now, we'll just update our in-memory settings
    currentDbSettings = {
      ...currentDbSettings,
      ...result.data,
      // Don't update password if it's empty (to keep existing password)
      password: result.data.password || currentDbSettings.password
    };

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
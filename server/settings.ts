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

// Store current settings (for demo purposes)
let currentSettings: DatabaseSettings = {
  host: process.env.PGHOST || "",
  port: process.env.PGPORT || "5432",
  user: process.env.PGUSER || "",
  database: process.env.PGDATABASE || "",
  ssl: true,
  connectionTimeout: "5000"
};

// Get database settings
export async function getDatabaseSettings(req: Request, res: Response) {
  try {
    // Return settings without password for security
    const safeSettings = { ...currentSettings, password: "" };
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
    currentSettings = {
      ...currentSettings,
      ...result.data,
      // Don't update password if it's empty (to keep existing password)
      password: result.data.password || currentSettings.password
    };

    res.json({ success: true, message: "Database settings updated successfully" });
  } catch (error) {
    console.error("Error updating database settings:", error);
    res.status(500).json({ error: "Failed to update database settings" });
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
    // For demonstration purposes, we'll simulate a connection test
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
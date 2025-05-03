import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { db, pool } from "./db";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { initializeSettings } from "./settings";
import { initializeScheduler } from "./scripts/scheduler";
import { createSettingsTable } from "./scripts/migrate-settings";

// Function to check if a table exists
async function checkIfTableExists(tableName: string): Promise<boolean> {
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

// Function to create the cluster_dependencies table
async function createClusterDependenciesTable(): Promise<void> {
  log('Checking if cluster_dependencies table exists...');
  const tableExists = await checkIfTableExists('cluster_dependencies');
  
  if (tableExists) {
    log('cluster_dependencies table already exists.');
    return;
  }
  
  log('Creating cluster_dependencies table...');
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
    log('Successfully created cluster_dependencies table.');
  } catch (error) {
    log(`Error creating cluster_dependencies table: ${error}`);
    throw error;
  } finally {
    client.release();
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log("Initializing database...");
    
    // Check if we're using a DatabaseStorage instance
    if ('initializeWithSampleData' in storage) {
      // Type assertion to access the method
      await (storage as any).initializeWithSampleData();
    }
    
    log("Database initialization complete");
    
    // Create settings table if it doesn't exist
    await createSettingsTable();
    log("Settings table migration complete");

    // Create dependencies table if it doesn't exist
    await createClusterDependenciesTable();
    log("Dependencies table migration complete");
    
    // Initialize application settings from database
    await initializeSettings();
    log("Settings initialized from database");
    
    // Initialize the scheduler for cloud data updates
    await initializeScheduler();
    log("Cloud data scheduler initialized");
  } catch (error) {
    log(`Error initializing database: ${error}`);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

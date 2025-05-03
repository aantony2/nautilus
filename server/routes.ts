import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getGkeData, getAksData, getClusterMetrics } from "./services/kubernetes";
import { getCluster, getResourceUtilization } from "./services/kubernetes";
import { 
  getDatabaseSettings, 
  updateDatabaseSettings, 
  testDatabaseConnection,
  getAppSettings,
  updateAppSettings,
  getAuthSettings,
  updateAuthSettings,
  getCloudProviderCredentials,
  updateCloudProviderCredentials,
  testCloudProviderConnections
} from "./settings";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getOverviewStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ message: 'Failed to fetch overview statistics' });
    }
  });

  app.get('/api/clusters', async (req, res) => {
    try {
      const clusters = await storage.getClusters();
      res.json(clusters);
    } catch (error) {
      console.error('Error fetching clusters:', error);
      res.status(500).json({ message: 'Failed to fetch cluster data' });
    }
  });

  app.get('/api/clusters/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const cluster = await storage.getClusterById(id);
      
      if (!cluster) {
        return res.status(404).json({ message: 'Cluster not found' });
      }
      
      res.json(cluster);
    } catch (error) {
      console.error(`Error fetching cluster ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to fetch cluster data' });
    }
  });

  app.get('/api/clusters/:id/metrics', async (req, res) => {
    try {
      const { id } = req.params;
      const metrics = await getClusterMetrics(id);
      res.json(metrics);
    } catch (error) {
      console.error(`Error fetching metrics for cluster ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to fetch cluster metrics' });
    }
  });

  app.get('/api/utilization', async (req, res) => {
    try {
      const utilization = await getResourceUtilization();
      res.json(utilization);
    } catch (error) {
      console.error('Error fetching utilization data:', error);
      res.status(500).json({ message: 'Failed to fetch resource utilization data' });
    }
  });

  app.get('/api/services', async (req, res) => {
    try {
      const services = await storage.getServiceHealth();
      res.json(services);
    } catch (error) {
      console.error('Error fetching service health:', error);
      res.status(500).json({ message: 'Failed to fetch service health data' });
    }
  });

  app.get('/api/events', async (req, res) => {
    try {
      const events = await storage.getRecentEvents();
      res.json(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ message: 'Failed to fetch recent events' });
    }
  });

  app.get('/api/workloads', async (req, res) => {
    try {
      const workloads = await storage.getWorkloadStatus();
      res.json(workloads);
    } catch (error) {
      console.error('Error fetching workload status:', error);
      res.status(500).json({ message: 'Failed to fetch workload status data' });
    }
  });

  // Namespace routes
  app.get('/api/namespaces', async (req, res) => {
    try {
      const namespaces = await storage.getNamespaces();
      res.json(namespaces);
    } catch (error) {
      console.error('Error fetching namespaces:', error);
      res.status(500).json({ message: 'Failed to fetch namespace data' });
    }
  });

  app.get('/api/clusters/:clusterId/namespaces', async (req, res) => {
    try {
      const { clusterId } = req.params;
      const namespaces = await storage.getNamespacesByCluster(clusterId);
      res.json(namespaces);
    } catch (error) {
      console.error(`Error fetching namespaces for cluster ${req.params.clusterId}:`, error);
      res.status(500).json({ message: 'Failed to fetch namespace data for this cluster' });
    }
  });

  app.get('/api/namespaces/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid namespace ID' });
      }

      const namespace = await storage.getNamespaceById(id);
      
      if (!namespace) {
        return res.status(404).json({ message: 'Namespace not found' });
      }
      
      res.json(namespace);
    } catch (error) {
      console.error(`Error fetching namespace ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to fetch namespace data' });
    }
  });

  // Cluster dependency routes
  app.get('/api/dependencies', async (req, res) => {
    try {
      const dependencies = await storage.getClusterDependencies();
      res.json(dependencies);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
      res.status(500).json({ message: 'Failed to fetch dependency data' });
    }
  });

  app.get('/api/dependencies/type/:type', async (req, res) => {
    try {
      const { type } = req.params;
      const dependencies = await storage.getClusterDependenciesByType(type);
      res.json(dependencies);
    } catch (error) {
      console.error(`Error fetching dependencies of type ${req.params.type}:`, error);
      res.status(500).json({ message: 'Failed to fetch dependencies by type' });
    }
  });

  app.get('/api/clusters/:clusterId/dependencies', async (req, res) => {
    try {
      const { clusterId } = req.params;
      const dependencies = await storage.getClusterDependenciesByCluster(clusterId);
      res.json(dependencies);
    } catch (error) {
      console.error(`Error fetching dependencies for cluster ${req.params.clusterId}:`, error);
      res.status(500).json({ message: 'Failed to fetch dependencies for this cluster' });
    }
  });

  app.get('/api/dependencies/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid dependency ID' });
      }

      const dependency = await storage.getClusterDependencyById(id);
      
      if (!dependency) {
        return res.status(404).json({ message: 'Dependency not found' });
      }
      
      res.json(dependency);
    } catch (error) {
      console.error(`Error fetching dependency ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to fetch dependency data' });
    }
  });

  // Settings routes
  app.get('/api/settings/database', getDatabaseSettings);
  app.post('/api/settings/database', updateDatabaseSettings);
  app.post('/api/settings/database/test', testDatabaseConnection);
  
  // App settings routes
  app.get('/api/settings/app', getAppSettings);
  app.post('/api/settings/app', updateAppSettings);
  
  // Authentication settings routes
  app.get('/api/settings/auth', getAuthSettings);
  app.post('/api/settings/auth', updateAuthSettings);
  
  // Cloud provider credentials routes
  app.get('/api/settings/cloud-credentials', getCloudProviderCredentials);
  app.post('/api/settings/cloud-credentials', updateCloudProviderCredentials);
  app.post('/api/settings/cloud-credentials/test', testCloudProviderConnections);

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}

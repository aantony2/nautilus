import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getGkeData, getAksData, getClusterMetrics } from "./services/kubernetes";
import { getCluster, getResourceUtilization } from "./services/kubernetes";

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

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}

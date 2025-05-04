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

  // Combined network resources endpoint for the Networking page
  app.get('/api/network/resources', async (req, res) => {
    try {
      const [ingressControllers, loadBalancers, routes, policies] = await Promise.all([
        storage.getNetworkIngressControllers(),
        storage.getNetworkLoadBalancers(),
        storage.getNetworkRoutes(),
        storage.getNetworkPolicies()
      ]);
      
      res.json({
        ingressControllers,
        loadBalancers,
        routes,
        policies
      });
    } catch (error) {
      console.error('Error fetching network resources:', error);
      res.status(500).json({ message: 'Failed to fetch network resources data' });
    }
  });
  
  // Network Ingress Controllers routes
  app.get('/api/network/ingress-controllers', async (req, res) => {
    try {
      const controllers = await storage.getNetworkIngressControllers();
      res.json(controllers);
    } catch (error) {
      console.error('Error fetching ingress controllers:', error);
      res.status(500).json({ message: 'Failed to fetch ingress controller data' });
    }
  });

  // Combined network resources for a specific cluster
  app.get('/api/clusters/:clusterId/network/resources', async (req, res) => {
    try {
      const { clusterId } = req.params;
      const [ingressControllers, loadBalancers, routes, policies] = await Promise.all([
        storage.getNetworkIngressControllersByCluster(clusterId),
        storage.getNetworkLoadBalancersByCluster(clusterId),
        storage.getNetworkRoutesByCluster(clusterId),
        storage.getNetworkPoliciesByCluster(clusterId)
      ]);
      
      res.json({
        ingressControllers,
        loadBalancers,
        routes,
        policies
      });
    } catch (error) {
      console.error(`Error fetching network resources for cluster ${req.params.clusterId}:`, error);
      res.status(500).json({ message: 'Failed to fetch network resources for this cluster' });
    }
  });

  app.get('/api/clusters/:clusterId/network/ingress-controllers', async (req, res) => {
    try {
      const { clusterId } = req.params;
      const controllers = await storage.getNetworkIngressControllersByCluster(clusterId);
      res.json(controllers);
    } catch (error) {
      console.error(`Error fetching ingress controllers for cluster ${req.params.clusterId}:`, error);
      res.status(500).json({ message: 'Failed to fetch ingress controllers for this cluster' });
    }
  });

  app.get('/api/network/ingress-controllers/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ingress controller ID' });
      }

      const controller = await storage.getNetworkIngressControllerById(id);
      
      if (!controller) {
        return res.status(404).json({ message: 'Ingress controller not found' });
      }
      
      res.json(controller);
    } catch (error) {
      console.error(`Error fetching ingress controller ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to fetch ingress controller data' });
    }
  });

  // Network Load Balancers routes
  app.get('/api/network/load-balancers', async (req, res) => {
    try {
      const loadBalancers = await storage.getNetworkLoadBalancers();
      res.json(loadBalancers);
    } catch (error) {
      console.error('Error fetching load balancers:', error);
      res.status(500).json({ message: 'Failed to fetch load balancer data' });
    }
  });

  app.get('/api/clusters/:clusterId/network/load-balancers', async (req, res) => {
    try {
      const { clusterId } = req.params;
      const loadBalancers = await storage.getNetworkLoadBalancersByCluster(clusterId);
      res.json(loadBalancers);
    } catch (error) {
      console.error(`Error fetching load balancers for cluster ${req.params.clusterId}:`, error);
      res.status(500).json({ message: 'Failed to fetch load balancers for this cluster' });
    }
  });

  app.get('/api/network/load-balancers/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid load balancer ID' });
      }

      const loadBalancer = await storage.getNetworkLoadBalancerById(id);
      
      if (!loadBalancer) {
        return res.status(404).json({ message: 'Load balancer not found' });
      }
      
      res.json(loadBalancer);
    } catch (error) {
      console.error(`Error fetching load balancer ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to fetch load balancer data' });
    }
  });

  // Network Routes
  app.get('/api/network/routes', async (req, res) => {
    try {
      const routes = await storage.getNetworkRoutes();
      res.json(routes);
    } catch (error) {
      console.error('Error fetching network routes:', error);
      res.status(500).json({ message: 'Failed to fetch network route data' });
    }
  });

  app.get('/api/clusters/:clusterId/network/routes', async (req, res) => {
    try {
      const { clusterId } = req.params;
      const routes = await storage.getNetworkRoutesByCluster(clusterId);
      res.json(routes);
    } catch (error) {
      console.error(`Error fetching network routes for cluster ${req.params.clusterId}:`, error);
      res.status(500).json({ message: 'Failed to fetch network routes for this cluster' });
    }
  });

  app.get('/api/network/routes/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid network route ID' });
      }

      const route = await storage.getNetworkRouteById(id);
      
      if (!route) {
        return res.status(404).json({ message: 'Network route not found' });
      }
      
      res.json(route);
    } catch (error) {
      console.error(`Error fetching network route ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to fetch network route data' });
    }
  });

  // Network Policies
  app.get('/api/network/policies', async (req, res) => {
    try {
      const policies = await storage.getNetworkPolicies();
      res.json(policies);
    } catch (error) {
      console.error('Error fetching network policies:', error);
      res.status(500).json({ message: 'Failed to fetch network policy data' });
    }
  });

  app.get('/api/clusters/:clusterId/network/policies', async (req, res) => {
    try {
      const { clusterId } = req.params;
      const policies = await storage.getNetworkPoliciesByCluster(clusterId);
      res.json(policies);
    } catch (error) {
      console.error(`Error fetching network policies for cluster ${req.params.clusterId}:`, error);
      res.status(500).json({ message: 'Failed to fetch network policies for this cluster' });
    }
  });

  app.get('/api/network/policies/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid network policy ID' });
      }

      const policy = await storage.getNetworkPolicyById(id);
      
      if (!policy) {
        return res.status(404).json({ message: 'Network policy not found' });
      }
      
      res.json(policy);
    } catch (error) {
      console.error(`Error fetching network policy ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to fetch network policy data' });
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

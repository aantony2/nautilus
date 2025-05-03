import { 
  users, 
  User, 
  InsertUser, 
  OverviewStatsData, 
  ClusterData,
  ServiceHealthData,
  EventData,
  WorkloadData,
  ClusterMetrics,
  clusters
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Interface for storage methods
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Dashboard data methods
  getOverviewStats(): Promise<OverviewStatsData>;
  getClusters(): Promise<ClusterData[]>;
  getClusterById(id: string): Promise<ClusterData | undefined>;
  getServiceHealth(): Promise<ServiceHealthData[]>;
  getRecentEvents(): Promise<EventData[]>;
  getWorkloadStatus(): Promise<WorkloadData>;
}

// Database implementation of storage
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Dashboard data methods
  async getOverviewStats(): Promise<OverviewStatsData> {
    // Calculate stats based on cluster data in the database
    const clusterData = await this.getClusters();
    
    const gkeClusters = clusterData.filter(c => c.provider === 'GKE').length;
    const aksClusters = clusterData.filter(c => c.provider === 'AKS').length;
    
    let totalNodes = 0;
    let totalPods = 0;
    let runningPods = 0;
    let totalNamespaces = 0;
    
    for (const cluster of clusterData) {
      totalNodes += cluster.nodesTotal;
      totalPods += cluster.podsTotal;
      runningPods += cluster.podsRunning;
      totalNamespaces += cluster.namespaces;
    }
    
    return {
      totalClusters: clusterData.length,
      clustersChange: 0, // Would need historical data to calculate change
      gkeClusters,
      aksClusters,
      
      totalNodes,
      nodesChange: 0,
      
      totalPods,
      podsChange: 0,
      runningPods,
      pendingPods: totalPods - runningPods, // Simplified
      failedPods: 0, // Would need more detailed data
      
      totalNamespaces,
      namespacesChange: 0,
      systemNamespaces: Math.round(totalNamespaces * 0.3), // Approximation
      userNamespaces: Math.round(totalNamespaces * 0.7) // Approximation
    };
  }

  async getClusters(): Promise<ClusterData[]> {
    try {
      const dbClusters = await db.select().from(clusters);
      
      // Convert DB clusters to ClusterData format
      return dbClusters.map(cluster => {
        const metadata = cluster.metadata as any || {}; // Type assertion for metadata
        return {
          id: cluster.cluster_id as string, // Use the column name from the DB
          name: cluster.name,
          provider: cluster.provider,
          version: cluster.version,
          versionStatus: cluster.version_status, // Use the column name from the DB
          region: cluster.region,
          status: cluster.status,
          nodesTotal: cluster.nodes_total, // Use the column name from the DB
          nodesReady: cluster.nodes_ready, // Use the column name from the DB
          podsTotal: cluster.pods_total, // Use the column name from the DB
          podsRunning: cluster.pods_running, // Use the column name from the DB
          namespaces: cluster.namespaces,
          services: cluster.services,
          deployments: cluster.deployments,
          ingresses: cluster.ingresses,
          createdAt: cluster.created_at.toISOString(), // Use the column name from the DB
          // Handle the metadata JSON field which can contain events and nodes
          events: metadata.events || [],
          nodes: metadata.nodes || []
        };
      });
    } catch (error) {
      console.error("Error fetching clusters from database:", error);
      
      // If no data exists yet, return empty array
      return [];
    }
  }

  async getClusterById(id: string): Promise<ClusterData | undefined> {
    try {
      const [cluster] = await db.select().from(clusters).where(eq(clusters.cluster_id, id));
      
      if (!cluster) return undefined;
      
      const metadata = cluster.metadata as any || {}; // Type assertion for metadata
      
      return {
        id: cluster.cluster_id as string,
        name: cluster.name,
        provider: cluster.provider,
        version: cluster.version,
        versionStatus: cluster.version_status,
        region: cluster.region,
        status: cluster.status,
        nodesTotal: cluster.nodes_total,
        nodesReady: cluster.nodes_ready,
        podsTotal: cluster.pods_total,
        podsRunning: cluster.pods_running,
        namespaces: cluster.namespaces,
        services: cluster.services,
        deployments: cluster.deployments,
        ingresses: cluster.ingresses,
        createdAt: cluster.created_at.toISOString(),
        events: metadata.events || [],
        nodes: metadata.nodes || []
      };
    } catch (error) {
      console.error(`Error fetching cluster with ID ${id} from database:`, error);
      return undefined;
    }
  }

  async getServiceHealth(): Promise<ServiceHealthData[]> {
    // For now, return static data as this would typically come from a service mesh or monitoring system
    return [
      {
        name: "Istio Service Mesh",
        status: "Healthy",
        description: "4 Clusters, 24 Namespaces",
        metrics: [
          { label: "Success Rate", value: "99.8%" },
          { label: "Avg. Latency", value: "28ms" }
        ]
      },
      {
        name: "Ingress Controllers",
        status: "Healthy",
        description: "12 Controllers, 36 Rules",
        metrics: [
          { label: "Success Rate", value: "99.9%" },
          { label: "Throughput", value: "3.2K req/s" }
        ]
      },
      {
        name: "Service Discovery",
        status: "Warning",
        description: "76 Services, 156 Endpoints",
        metrics: [
          { label: "Healthy", value: "98.2%" },
          { label: "Issues", value: "2", highlightValue: "warning" }
        ]
      },
      {
        name: "Persistent Volumes",
        status: "Healthy",
        description: "128 Volumes, 4.2TB Total",
        metrics: [
          { label: "Usage", value: "62%" },
          { label: "Bound", value: "118/128" }
        ]
      }
    ];
  }

  async getRecentEvents(): Promise<EventData[]> {
    // For now, return static event data
    // In a real implementation, this might come from a dedicated events table
    return [
      {
        type: "success",
        title: "Cluster Autoscaling Completed",
        time: "10m ago",
        description: "gke-prod-cluster1 scaled from 10 to 12 nodes based on resource demand."
      },
      {
        type: "warning",
        title: "High Memory Usage Alert",
        time: "25m ago",
        description: "aks-prod-eastus:database namespace has pods with memory usage >85%."
      },
      {
        type: "error",
        title: "Node Failure Detected",
        time: "48m ago",
        description: "aks-dev-westeu node 'aks-nodepool1-12345-vmss000003' is not responding."
      },
      {
        type: "info",
        title: "Update Available",
        time: "1h ago",
        description: "Kubernetes v1.26.5 is available for gke-stage-cluster1 (currently on v1.25.8)."
      }
    ];
  }

  async getWorkloadStatus(): Promise<WorkloadData> {
    // For now, return static workload data
    return {
      summary: {
        deployments: [
          { clusterType: "GKE", total: 56, healthy: 54, warning: 2, failed: 0 },
          { clusterType: "AKS", total: 30, healthy: 28, warning: 1, failed: 1 }
        ],
        statefulSets: [
          { clusterType: "GKE", total: 16, healthy: 15, warning: 1, failed: 0 },
          { clusterType: "AKS", total: 8, healthy: 7, warning: 1, failed: 0 }
        ]
      },
      distribution: {
        daemonSets: {
          GKE: 24,
          AKS: 16
        }
      },
      topConsumers: [
        {
          name: "api-gateway",
          cluster: "gke-prod-cluster1",
          resources: {
            cpu: "4.2 cores",
            memory: "8.1 GB"
          }
        },
        {
          name: "elasticsearch",
          cluster: "gke-prod-cluster1",
          resources: {
            cpu: "3.8 cores",
            memory: "12.4 GB"
          }
        },
        {
          name: "postgres-master",
          cluster: "aks-prod-eastus",
          resources: {
            cpu: "2.5 cores",
            memory: "6.8 GB"
          }
        }
      ]
    };
  }

  // Helper method to initialize database with sample data if needed
  async initializeWithSampleData() {
    // Check if we have any clusters already
    const existingClusters = await db.select().from(clusters);
    
    if (existingClusters.length > 0) {
      console.log("Database already contains cluster data, skipping initialization");
      return;
    }
    
    console.log("Initializing database with sample cluster data");
    
    // Sample data to insert
    const sampleClusters = [
      {
        clusterId: "gke-prod-cluster1",
        name: "gke-prod-cluster1",
        provider: "GKE",
        version: "1.26.5-gke.1200",
        versionStatus: "Up to date",
        region: "us-central1",
        status: "Healthy",
        nodesTotal: 12,
        nodesReady: 12,
        podsTotal: 450,
        podsRunning: 324,
        namespaces: 14,
        services: 28,
        deployments: 32,
        ingresses: 8,
        metadata: {
          events: [
            {
              timestamp: "2023-07-20T14:30:00Z",
              severity: "info",
              message: "Autoscaling triggered: scaling up to 12 nodes",
              source: "cluster-autoscaler"
            },
            {
              timestamp: "2023-07-20T13:15:00Z",
              severity: "warning",
              message: "High CPU usage detected in namespace: backend",
              source: "monitoring-controller"
            }
          ],
          nodes: [
            {
              name: "gke-prod-cluster1-default-pool-12345",
              status: "Ready",
              role: "Worker",
              cpu: "4 cores / 75%",
              memory: "16GB / 68%",
              pods: "29/30"
            },
            {
              name: "gke-prod-cluster1-default-pool-67890",
              status: "Ready",
              role: "Worker",
              cpu: "4 cores / 62%",
              memory: "16GB / 55%",
              pods: "26/30"
            }
          ]
        }
      },
      {
        clusterId: "gke-stage-cluster1",
        name: "gke-stage-cluster1",
        provider: "GKE",
        version: "1.25.8-gke.500",
        versionStatus: "Update available",
        region: "us-west1",
        status: "Healthy",
        nodesTotal: 8,
        nodesReady: 8,
        podsTotal: 300,
        podsRunning: 210,
        namespaces: 10,
        services: 18,
        deployments: 24,
        ingresses: 6
      },
      {
        clusterId: "aks-prod-eastus",
        name: "aks-prod-eastus",
        provider: "AKS",
        version: "1.25.6",
        versionStatus: "Update available",
        region: "eastus",
        status: "Warning",
        nodesTotal: 6,
        nodesReady: 6,
        podsTotal: 250,
        podsRunning: 178,
        namespaces: 8,
        services: 14,
        deployments: 18,
        ingresses: 4
      },
      {
        clusterId: "aks-dev-westeu",
        name: "aks-dev-westeu",
        provider: "AKS",
        version: "1.26.0",
        versionStatus: "Up to date",
        region: "westeurope",
        status: "Critical",
        nodesTotal: 4,
        nodesReady: 3,
        podsTotal: 120,
        podsRunning: 86,
        namespaces: 6,
        services: 10,
        deployments: 12,
        ingresses: 2
      }
    ];
    
    try {
      // Insert sample data
      await db.insert(clusters).values(sampleClusters);
      console.log("Sample cluster data inserted successfully");
    } catch (error) {
      console.error("Error inserting sample cluster data:", error);
    }
  }
}

// Create storage instance
export const storage = new DatabaseStorage();

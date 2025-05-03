import { 
  users, 
  User, 
  InsertUser, 
  OverviewStatsData, 
  ClusterData,
  ServiceHealthData,
  EventData,
  WorkloadData,
  ClusterMetrics
} from "@shared/schema";

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

// In-memory implementation of storage
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clusters: Map<string, ClusterData>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.clusters = new Map();
    this.currentId = 1;
    
    // Initialize with demo data
    this.initializeDemoData();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Dashboard data methods
  async getOverviewStats(): Promise<OverviewStatsData> {
    // In a real app, this would calculate based on actual data
    return {
      totalClusters: 12,
      clustersChange: 2,
      gkeClusters: 8,
      aksClusters: 4,
      
      totalNodes: 76,
      nodesChange: 5,
      
      totalPods: 1248,
      podsChange: 32,
      runningPods: 1214,
      pendingPods: 24,
      failedPods: 10,
      
      totalNamespaces: 54,
      namespacesChange: 3,
      systemNamespaces: 18,
      userNamespaces: 36
    };
  }

  async getClusters(): Promise<ClusterData[]> {
    return Array.from(this.clusters.values());
  }

  async getClusterById(id: string): Promise<ClusterData | undefined> {
    return this.clusters.get(id);
  }

  async getServiceHealth(): Promise<ServiceHealthData[]> {
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

  // Private method to initialize demo data
  private initializeDemoData() {
    // Demo clusters
    this.clusters.set("gke-prod-cluster1", {
      id: "gke-prod-cluster1",
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
      createdAt: "2023-03-15T08:00:00Z",
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
    });

    this.clusters.set("gke-stage-cluster1", {
      id: "gke-stage-cluster1",
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
      ingresses: 6,
      createdAt: "2023-04-10T10:30:00Z"
    });

    this.clusters.set("aks-prod-eastus", {
      id: "aks-prod-eastus",
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
      ingresses: 4,
      createdAt: "2023-02-22T09:15:00Z"
    });

    this.clusters.set("aks-dev-westeu", {
      id: "aks-dev-westeu",
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
      ingresses: 2,
      createdAt: "2023-05-05T11:45:00Z"
    });
  }
}

export const storage = new MemStorage();

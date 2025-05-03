import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Kubernetes Clusters
export const clusters = pgTable("clusters", {
  id: serial("id").primaryKey(),
  clusterId: text("cluster_id").notNull().unique(), // External ID (e.g., "gke-prod-cluster1")
  name: text("name").notNull(),
  provider: text("provider").notNull(), // GKE or AKS
  version: text("version").notNull(),
  versionStatus: text("version_status").notNull(), // "Up to date" or "Update available"
  region: text("region").notNull(),
  status: text("status").notNull(), // Healthy, Warning, Critical
  nodesTotal: integer("nodes_total").notNull(),
  nodesReady: integer("nodes_ready").notNull(),
  podsTotal: integer("pods_total").notNull(),
  podsRunning: integer("pods_running").notNull(),
  namespaces: integer("namespaces").notNull(),
  services: integer("services").notNull(),
  deployments: integer("deployments").notNull(),
  ingresses: integer("ingresses").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Store complex data like events and nodes in a JSON field
  metadata: jsonb("metadata"),
});

export const insertClusterSchema = createInsertSchema(clusters).omit({ 
  id: true,
  createdAt: true 
});

export type InsertCluster = z.infer<typeof insertClusterSchema>;
export type Cluster = typeof clusters.$inferSelect;

// Type Definitions for API Responses
export interface ClusterData {
  id: string;
  name: string;
  provider: string;
  version: string;
  versionStatus: string;
  region: string;
  status: string;
  nodesTotal: number;
  nodesReady: number;
  podsTotal: number;
  podsRunning: number;
  namespaces: number;
  services: number;
  deployments: number;
  ingresses: number;
  createdAt: string;
  events?: ClusterEvent[];
  nodes?: ClusterNode[];
}

export interface ClusterEvent {
  timestamp: string;
  severity: string;
  message: string;
  source: string;
}

export interface ClusterNode {
  name: string;
  status: string;
  role: string;
  cpu: string;
  memory: string;
  pods: string;
}

export interface ClusterMetrics {
  cpu: {
    used: number;
    total: number;
    percentage: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface OverviewStatsData {
  totalClusters: number;
  clustersChange: number;
  gkeClusters: number;
  aksClusters: number;
  
  totalNodes: number;
  nodesChange: number;
  
  totalPods: number;
  podsChange: number;
  runningPods: number;
  pendingPods: number;
  failedPods: number;
  
  totalNamespaces: number;
  namespacesChange: number;
  systemNamespaces: number;
  userNamespaces: number;
}

export interface ResourceUtilizationData {
  current: {
    cpu: number;
    memory: number;
    storage: number;
  };
  changes: {
    cpu: number;
    memory: number;
    storage: number;
  };
  utilization: {
    day: Array<{
      time: string;
      cpu: number;
      memory: number;
      storage: number;
    }>;
    week: Array<{
      time: string;
      cpu: number;
      memory: number;
      storage: number;
    }>;
    month: Array<{
      time: string;
      cpu: number;
      memory: number;
      storage: number;
    }>;
  };
}

export interface ServiceHealthData {
  name: string;
  status: string;
  description: string;
  metrics: Array<{
    label: string;
    value: string;
    highlightValue?: string;
  }>;
}

export interface EventData {
  type: string;
  title: string;
  time: string;
  description: string;
}

export interface WorkloadSummaryData {
  clusterType: string;
  total: number;
  healthy: number;
  warning: number;
  failed: number;
}

export interface WorkloadData {
  summary: {
    deployments: WorkloadSummaryData[];
    statefulSets: WorkloadSummaryData[];
  };
  distribution: {
    daemonSets: {
      GKE: number;
      AKS: number;
    };
  };
  topConsumers: Array<{
    name: string;
    cluster: string;
    resources: {
      cpu: string;
      memory: string;
    };
  }>;
}

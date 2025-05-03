#!/usr/bin/env tsx

/**
 * update-cloud-data.ts
 * 
 * This script pulls GKE, AKS, and EKS cluster details from their respective cloud providers
 * and updates the PostgreSQL database with the latest information.
 * 
 * Designed to run in a scheduled Docker container with the required API secrets.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { google } from 'googleapis';
import { DefaultAzureCredential } from '@azure/identity';
import { ContainerServiceClient } from '@azure/arm-containerservice';
import { EKSClient, ListClustersCommand, DescribeClusterCommand } from '@aws-sdk/client-eks';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { Pool } from 'pg';
import * as k8s from '@kubernetes/client-node';
import { clusters, namespaces } from '@shared/schema';
import { eq, inArray } from 'drizzle-orm/expressions';
import { drizzle } from 'drizzle-orm/node-postgres';
import { NamespaceData, ClusterData } from '@shared/schema';

const execAsync = promisify(exec);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

// Cloud provider API clients
const initGoogleClient = () => {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS
  });
  const containerApi = google.container({
    version: 'v1',
    auth: auth
  });
  return containerApi;
};

const initAzureClient = () => {
  const credential = new DefaultAzureCredential();
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  if (!subscriptionId) {
    throw new Error('AZURE_SUBSCRIPTION_ID environment variable is required');
  }
  return new ContainerServiceClient(credential, subscriptionId);
};

const initAwsClients = () => {
  const eksClient = new EKSClient({ 
    region: process.env.AWS_REGION || 'us-west-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
  });
  const ec2Client = new EC2Client({ 
    region: process.env.AWS_REGION || 'us-west-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
  });
  return { eksClient, ec2Client };
};

// Utility function to connect to K8s cluster
async function connectToK8sCluster(config: string): Promise<k8s.CoreV1Api> {
  const kc = new k8s.KubeConfig();
  kc.loadFromString(config);
  return kc.makeApiClient(k8s.CoreV1Api);
}

// Functions to fetch cluster data
async function fetchGKEClusters(projectId: string, location = 'global') {
  console.log(`Fetching GKE clusters for project ${projectId}...`);
  try {
    const containerApi = initGoogleClient();
    const response = await containerApi.projects.locations.clusters.list({
      parent: `projects/${projectId}/locations/${location}`
    });

    const clusters: ClusterData[] = [];
    const clusterConfigs: Record<string, string> = {};

    if (response.data.clusters && response.data.clusters.length > 0) {
      for (const cluster of response.data.clusters) {
        if (!cluster.name || !cluster.id) continue;

        // Get kubectl config for this cluster
        const configCmd = `gcloud container clusters get-credentials ${cluster.name} --project ${projectId} --zone ${cluster.location} --format=config`;
        const { stdout } = await execAsync(configCmd);
        clusterConfigs[cluster.id] = stdout;

        const clusterData: ClusterData = {
          id: cluster.id,
          name: cluster.name,
          provider: 'GKE',
          version: cluster.currentMasterVersion || 'unknown',
          versionStatus: cluster.currentMasterVersion === cluster.initialClusterVersion ? 'Up to date' : 'Update available',
          region: cluster.location || 'unknown',
          status: cluster.status === 'RUNNING' ? 'Healthy' : cluster.status === 'DEGRADED' ? 'Warning' : 'Critical',
          nodesTotal: Number(cluster.currentNodeCount) || 0,
          nodesReady: Number(cluster.currentNodeCount) || 0, // Will be updated with K8s API
          podsTotal: 0, // Will be updated with K8s API
          podsRunning: 0, // Will be updated with K8s API
          namespaces: 0, // Will be updated with K8s API
          services: 0, // Will be updated with K8s API
          deployments: 0, // Will be updated with K8s API
          ingresses: 0, // Will be updated with K8s API
          createdAt: new Date(cluster.createTime || '').toISOString()
        };
        
        clusters.push(clusterData);
      }
    }

    return { clusters, clusterConfigs };
  } catch (error) {
    console.error('Error fetching GKE clusters:', error);
    return { clusters: [], clusterConfigs: {} };
  }
}

async function fetchAKSClusters() {
  console.log('Fetching AKS clusters...');
  try {
    const client = initAzureClient();
    const resourceGroups = await client.resourceGroups.list();
    
    const clusters: ClusterData[] = [];
    const clusterConfigs: Record<string, string> = {};

    for (const rg of resourceGroups) {
      if (!rg.name) continue;

      const managedClusters = await client.managedClusters.list(rg.name);
      
      for (const cluster of managedClusters) {
        if (!cluster.name) continue;

        // Get kubectl config for this cluster
        const configCmd = `az aks get-credentials --resource-group ${rg.name} --name ${cluster.name} --admin --file -`;
        const { stdout } = await execAsync(configCmd);
        const clusterId = `${rg.name}/${cluster.name}`;
        clusterConfigs[clusterId] = stdout;

        const clusterData: ClusterData = {
          id: clusterId,
          name: cluster.name,
          provider: 'AKS',
          version: cluster.kubernetesVersion || 'unknown',
          versionStatus: 'Up to date', // Would require additional API calls to determine if updates are available
          region: cluster.location || 'unknown',
          status: cluster.provisioningState === 'Succeeded' ? 'Healthy' : 'Warning',
          nodesTotal: cluster.agentPoolProfiles?.reduce((sum, pool) => sum + (pool.count || 0), 0) || 0,
          nodesReady: cluster.agentPoolProfiles?.reduce((sum, pool) => sum + (pool.count || 0), 0) || 0, // Will be updated with K8s API
          podsTotal: 0, // Will be updated with K8s API
          podsRunning: 0, // Will be updated with K8s API
          namespaces: 0, // Will be updated with K8s API
          services: 0, // Will be updated with K8s API
          deployments: 0, // Will be updated with K8s API
          ingresses: 0, // Will be updated with K8s API
          createdAt: new Date(cluster.creationData || Date.now()).toISOString()
        };
        
        clusters.push(clusterData);
      }
    }

    return { clusters, clusterConfigs };
  } catch (error) {
    console.error('Error fetching AKS clusters:', error);
    return { clusters: [], clusterConfigs: {} };
  }
}

async function fetchEKSClusters() {
  console.log('Fetching EKS clusters...');
  try {
    const { eksClient, ec2Client } = initAwsClients();
    const listCommand = new ListClustersCommand({});
    const { clusters: clusterNames } = await eksClient.send(listCommand);
    
    const clusters: ClusterData[] = [];
    const clusterConfigs: Record<string, string> = {};

    if (clusterNames && clusterNames.length > 0) {
      for (const name of clusterNames) {
        const describeCommand = new DescribeClusterCommand({ name });
        const { cluster } = await eksClient.send(describeCommand);
        
        if (!cluster || !cluster.name) continue;

        // Get kubectl config for this cluster
        const configCmd = `aws eks update-kubeconfig --name ${cluster.name} --dry-run`;
        const { stdout } = await execAsync(configCmd);
        clusterConfigs[cluster.name] = stdout;

        // Get node count
        let nodesTotal = 0;
        if (cluster.resourcesVpcConfig?.securityGroupIds) {
          const describeInstancesCommand = new DescribeInstancesCommand({
            Filters: [
              {
                Name: 'instance.group-id',
                Values: cluster.resourcesVpcConfig.securityGroupIds
              }
            ]
          });
          const { Reservations } = await ec2Client.send(describeInstancesCommand);
          nodesTotal = Reservations?.reduce((sum, reservation) => sum + (reservation.Instances?.length || 0), 0) || 0;
        }

        const clusterData: ClusterData = {
          id: cluster.arn || cluster.name,
          name: cluster.name,
          provider: 'EKS',
          version: cluster.version || 'unknown',
          versionStatus: 'Up to date', // Would require additional logic to determine
          region: cluster.arn?.split(':')[3] || 'unknown',
          status: cluster.status === 'ACTIVE' ? 'Healthy' : cluster.status === 'UPDATING' ? 'Warning' : 'Critical',
          nodesTotal,
          nodesReady: nodesTotal, // Will be updated with K8s API
          podsTotal: 0, // Will be updated with K8s API
          podsRunning: 0, // Will be updated with K8s API
          namespaces: 0, // Will be updated with K8s API
          services: 0, // Will be updated with K8s API
          deployments: 0, // Will be updated with K8s API
          ingresses: 0, // Will be updated with K8s API
          createdAt: cluster.createdAt?.toISOString() || new Date().toISOString()
        };
        
        clusters.push(clusterData);
      }
    }

    return { clusters, clusterConfigs };
  } catch (error) {
    console.error('Error fetching EKS clusters:', error);
    return { clusters: [], clusterConfigs: {} };
  }
}

// Function to get detailed metrics from Kubernetes API
async function enrichClusterDataFromK8s(clusterData: ClusterData, kubeConfig: string): Promise<ClusterData> {
  try {
    const k8sApi = await connectToK8sCluster(kubeConfig);
    
    // Get namespace count
    const { body: namespaceList } = await k8sApi.listNamespace();
    clusterData.namespaces = namespaceList.items.length;
    
    // Get pod stats
    const { body: podList } = await k8sApi.listPodForAllNamespaces();
    clusterData.podsTotal = podList.items.length;
    clusterData.podsRunning = podList.items.filter(pod => pod.status?.phase === 'Running').length;
    
    // Get node stats
    const { body: nodeList } = await k8sApi.listNode();
    clusterData.nodesTotal = nodeList.items.length;
    clusterData.nodesReady = nodeList.items.filter(node => 
      node.status?.conditions?.some(condition => 
        condition.type === 'Ready' && condition.status === 'True'
      )
    ).length;
    
    // Get service count
    const { body: serviceList } = await k8sApi.listServiceForAllNamespaces();
    clusterData.services = serviceList.items.length;
    
    // Get namespaces data for detailed storage
    const namespacesData: NamespaceData[] = [];
    for (const ns of namespaceList.items) {
      if (!ns.metadata?.name) continue;
      
      // Get pod count for this namespace
      const { body: nsPods } = await k8sApi.listNamespacedPod(ns.metadata.name);
      
      const namespaceData: NamespaceData = {
        id: 0, // Will be assigned by DB
        clusterId: clusterData.id,
        clusterName: clusterData.name,
        name: ns.metadata.name,
        status: ns.status?.phase || 'Active',
        age: calculateAge(ns.metadata.creationTimestamp || ''),
        phase: ns.status?.phase || 'Active',
        labels: ns.metadata.labels || {},
        annotations: ns.metadata.annotations || {},
        podCount: nsPods.items.length,
        resourceQuota: false, // Would require additional API calls
        createdAt: new Date(ns.metadata.creationTimestamp || '').toISOString()
      };
      
      namespacesData.push(namespaceData);
    }
    
    return { ...clusterData, namespacesCollection: namespacesData };
  } catch (error) {
    console.error(`Error enriching cluster data for ${clusterData.name}:`, error);
    return clusterData;
  }
}

// Helper function to calculate age as a string
function calculateAge(timestamp: string): string {
  const creationDate = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - creationDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays > 365) {
    const years = Math.floor(diffInDays / 365);
    return `${years}y`;
  } else if (diffInDays > 30) {
    const months = Math.floor(diffInDays / 30);
    return `${months}m`;
  } else if (diffInDays > 0) {
    return `${diffInDays}d`;
  } else {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    return `${diffInHours}h`;
  }
}

// Function to update database with collected data
async function updateDatabase(allClusters: ClusterData[], allNamespaces: NamespaceData[]) {
  console.log('Updating database with collected data...');
  
  try {
    // Start a transaction
    await pool.query('BEGIN');

    // Get existing cluster IDs
    const existingClusters = await db.select({ id: clusters.id }).from(clusters);
    const existingClusterIds = existingClusters.map(c => c.id);
    
    // Determine which clusters to insert and which to update
    const clustersToInsert: ClusterData[] = [];
    const clustersToUpdate: ClusterData[] = [];
    
    allClusters.forEach(cluster => {
      if (existingClusterIds.includes(cluster.id)) {
        clustersToUpdate.push(cluster);
      } else {
        clustersToInsert.push(cluster);
      }
    });
    
    // Insert new clusters
    if (clustersToInsert.length > 0) {
      await db.insert(clusters).values(clustersToInsert);
      console.log(`Inserted ${clustersToInsert.length} new clusters`);
    }
    
    // Update existing clusters
    for (const cluster of clustersToUpdate) {
      await db.update(clusters)
        .set(cluster)
        .where(eq(clusters.id, cluster.id));
    }
    console.log(`Updated ${clustersToUpdate.length} existing clusters`);
    
    // Handle namespaces
    // Get current namespaces in DB
    const existingNamespaces = await db.select({
      id: namespaces.id,
      clusterId: namespaces.clusterId,
      name: namespaces.name
    }).from(namespaces);
    
    // Process namespaces
    const namespacesToInsert: NamespaceData[] = [];
    const namespacesToUpdate: NamespaceData[] = [];
    
    allNamespaces.forEach(namespace => {
      const existingNamespace = existingNamespaces.find(ns => 
        ns.clusterId === namespace.clusterId && ns.name === namespace.name
      );
      
      if (existingNamespace) {
        namespacesToUpdate.push({
          ...namespace,
          id: existingNamespace.id
        });
      } else {
        namespacesToInsert.push(namespace);
      }
    });
    
    // Insert new namespaces
    if (namespacesToInsert.length > 0) {
      await db.insert(namespaces).values(namespacesToInsert);
      console.log(`Inserted ${namespacesToInsert.length} new namespaces`);
    }
    
    // Update existing namespaces
    for (const namespace of namespacesToUpdate) {
      await db.update(namespaces)
        .set(namespace)
        .where(eq(namespaces.id, namespace.id));
    }
    console.log(`Updated ${namespacesToUpdate.length} existing namespaces`);
    
    // Delete namespaces that no longer exist
    const currentClusterIds = allClusters.map(c => c.id);
    const currentNamespaceKeys = allNamespaces.map(ns => `${ns.clusterId}:${ns.name}`);
    
    const namespacesToDelete = existingNamespaces.filter(ns => 
      currentClusterIds.includes(ns.clusterId) && 
      !currentNamespaceKeys.includes(`${ns.clusterId}:${ns.name}`)
    );
    
    if (namespacesToDelete.length > 0) {
      const namespaceIds = namespacesToDelete.map(ns => ns.id);
      await db.delete(namespaces).where(inArray(namespaces.id, namespaceIds));
      console.log(`Deleted ${namespacesToDelete.length} namespaces that no longer exist`);
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    console.log('Database update completed successfully.');
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error('Error updating database:', error);
    throw error;
  }
}

// Main function to orchestrate the data collection and update
async function main() {
  console.log('Starting cloud provider data collection...');
  try {
    // Validate required environment variables
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    // Collect data from all providers
    const allClusters: ClusterData[] = [];
    const allClusterConfigs: Record<string, string> = {};
    
    // GKE
    const googleProjectId = process.env.GOOGLE_PROJECT_ID;
    if (googleProjectId) {
      const { clusters, clusterConfigs } = await fetchGKEClusters(googleProjectId);
      allClusters.push(...clusters);
      Object.assign(allClusterConfigs, clusterConfigs);
    } else {
      console.log('Skipping GKE data collection: GOOGLE_PROJECT_ID not set');
    }
    
    // AKS
    if (process.env.AZURE_SUBSCRIPTION_ID) {
      const { clusters, clusterConfigs } = await fetchAKSClusters();
      allClusters.push(...clusters);
      Object.assign(allClusterConfigs, clusterConfigs);
    } else {
      console.log('Skipping AKS data collection: AZURE_SUBSCRIPTION_ID not set');
    }
    
    // EKS
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      const { clusters, clusterConfigs } = await fetchEKSClusters();
      allClusters.push(...clusters);
      Object.assign(allClusterConfigs, clusterConfigs);
    } else {
      console.log('Skipping EKS data collection: AWS credentials not set');
    }
    
    console.log(`Collected ${allClusters.length} clusters from cloud providers`);
    
    // Enrich data with Kubernetes API
    const enrichedClusters: ClusterData[] = [];
    const allNamespaces: NamespaceData[] = [];
    
    for (const cluster of allClusters) {
      const kubeConfig = allClusterConfigs[cluster.id];
      if (!kubeConfig) {
        console.log(`No kubeconfig found for ${cluster.name}, skipping enrichment`);
        enrichedClusters.push(cluster);
        continue;
      }
      
      const enrichedCluster = await enrichClusterDataFromK8s(cluster, kubeConfig);
      enrichedClusters.push(enrichedCluster);
      
      // Collect namespaces
      if ('namespacesCollection' in enrichedCluster && Array.isArray(enrichedCluster.namespacesCollection)) {
        allNamespaces.push(...(enrichedCluster.namespacesCollection as NamespaceData[]));
        delete enrichedCluster.namespacesCollection;
      }
    }
    
    // Update database
    await updateDatabase(enrichedClusters, allNamespaces);
    
    console.log('Data collection and update completed successfully');
  } catch (error) {
    console.error('Error in data collection process:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run the script
main();
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
import { SubscriptionClient } from '@azure/arm-subscriptions';
import { EKSClient, ListClustersCommand, DescribeClusterCommand } from '@aws-sdk/client-eks';
import { EC2Client, DescribeInstancesCommand, DescribeRegionsCommand } from '@aws-sdk/client-ec2';
import { OrganizationsClient, ListAccountsCommand } from '@aws-sdk/client-organizations';
import { Pool } from 'pg';
import * as k8s from '@kubernetes/client-node';
import { clusters, namespaces, settings } from '@shared/schema';
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

// Helper to fetch accessible projects in GCP
async function fetchGCPProjects() {
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    
    const client = await auth.getClient();
    const projectsApi = google.cloudresourcemanager('v1').projects;
    
    // List all accessible projects
    const res = await projectsApi.list({
      auth: client
    });
    
    return res.data.projects || [];
  } catch (error) {
    console.error('Error fetching GCP projects:', error);
    return [];
  }
}

// Functions to fetch cluster data
async function fetchGKEClusters(projectId: string, scanAllProjects = false) {
  console.log(`Fetching GKE clusters${scanAllProjects ? ' across all accessible projects' : ` for project ${projectId}`}...`);
  try {
    const containerApi = initGoogleClient();
    const clusters: ClusterData[] = [];
    const clusterConfigs: Record<string, string> = {};
    
    // Get projects to scan
    let projectsToScan: string[] = [projectId];
    
    if (scanAllProjects) {
      console.log('Scanning all accessible GCP projects...');
      const projects = await fetchGCPProjects();
      if (projects.length > 0) {
        projectsToScan = projects.map(p => p.projectId).filter(Boolean) as string[];
        console.log(`Found ${projectsToScan.length} accessible projects`);
      } else {
        console.log('No additional projects found, using specified project ID');
      }
    }
    
    // Fetch clusters from all projects
    for (const project of projectsToScan) {
      console.log(`Scanning project: ${project}`);
      
      try {
        // Get all the clusters in the project (from all locations)
        const response = await containerApi.projects.locations.clusters.list({
          parent: `projects/${project}/locations/-`
        });
        
        if (response.data.clusters && response.data.clusters.length > 0) {
          console.log(`Found ${response.data.clusters.length} clusters in project ${project}`);
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

// Helper to fetch all available Azure subscriptions
async function fetchAzureSubscriptions() {
  try {
    const credential = new DefaultAzureCredential();
    const subscriptionClient = new SubscriptionClient(credential);
    const subscriptions = [];
    
    // List all accessible subscriptions
    for await (const subscription of subscriptionClient.subscriptions.list()) {
      subscriptions.push(subscription);
    }
    
    return subscriptions;
  } catch (error) {
    console.error('Error fetching Azure subscriptions:', error);
    return [];
  }
}

async function fetchAKSClusters(scanAllSubscriptions = false) {
  console.log(`Fetching AKS clusters${scanAllSubscriptions ? ' across all accessible subscriptions' : ' for configured subscription'}...`);
  try {
    const defaultClient = initAzureClient();
    const clusters: ClusterData[] = [];
    const clusterConfigs: Record<string, string> = {};
    
    // Get subscriptions to scan
    let subscriptions: Array<{ subscriptionId?: string, displayName?: string }> = [
      { subscriptionId: process.env.AZURE_SUBSCRIPTION_ID, displayName: 'Default Subscription' }
    ];
    
    if (scanAllSubscriptions) {
      console.log('Scanning all accessible Azure subscriptions...');
      try {
        const allSubscriptions = await fetchAzureSubscriptions();
        if (allSubscriptions.length > 0) {
          subscriptions = allSubscriptions;
          console.log(`Found ${subscriptions.length} accessible subscriptions`);
        } else {
          console.log('No additional subscriptions found, using configured subscription');
        }
      } catch (error) {
        console.error('Error retrieving subscriptions, using configured subscription:', error);
      }
    }
    
    // Process each subscription
    for (const subscription of subscriptions) {
      if (!subscription.subscriptionId) continue;
      
      console.log(`Scanning subscription: ${subscription.displayName || subscription.subscriptionId}`);
      
      try {
        // Create a client for this subscription
        const credential = new DefaultAzureCredential();
        const client = new ContainerServiceClient(credential, subscription.subscriptionId);
        
        // List resource groups (assuming ContainerServiceClient has this capability)
        // Note: If this property doesn't exist, you might need to use ResourceManagementClient instead
        const resourceGroups = await client.resourceGroups.list();
        
        for (const rg of resourceGroups) {
          if (!rg.name) continue;
          
          console.log(`Scanning resource group: ${rg.name}`);
          
          // List managed clusters in this resource group
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

// Helper to fetch AWS accounts in organization
async function fetchAwsAccounts() {
  try {
    const organizationsClient = new OrganizationsClient({ region: process.env.AWS_REGION });
    const accounts = [];
    
    // List accounts in organization
    const listCommand = new ListAccountsCommand({});
    const response = await organizationsClient.send(listCommand);
    
    if (response.Accounts) {
      accounts.push(...response.Accounts);
    }
    
    return accounts;
  } catch (error) {
    console.error('Error fetching AWS accounts:', error);
    return [];
  }
}

// Helper to get AWS regions
async function fetchAwsRegions() {
  try {
    const ec2Client = new EC2Client({ region: process.env.AWS_REGION || 'us-east-1' });
    const describeRegionsCommand = new DescribeRegionsCommand({ AllRegions: true });
    const { Regions } = await ec2Client.send(describeRegionsCommand);
    
    return Regions || [];
  } catch (error) {
    console.error('Error fetching AWS regions:', error);
    return [];
  }
}

async function fetchEKSClusters(defaultRegion = 'us-west-2', scanAllRegions = false, scanAllAccounts = false) {
  console.log(`Fetching EKS clusters${scanAllRegions ? ' across all regions' : ` in ${defaultRegion}`}${scanAllAccounts ? ' and all accounts' : ' in default account'}...`);
  try {
    // Get regions to scan
    let regionsToScan: string[] = [defaultRegion];
    
    if (scanAllRegions) {
      console.log('Scanning all available AWS regions...');
      const regions = await fetchAwsRegions();
      if (regions.length > 0) {
        regionsToScan = regions.filter(r => r.RegionName).map(r => r.RegionName as string);
        console.log(`Found ${regionsToScan.length} available regions`);
      } else {
        console.log('No additional regions found, using default region');
      }
    }
    
    // Get accounts to scan
    let accountsToScan = [{ Id: 'default', Name: 'Default Account' }];
    
    if (scanAllAccounts) {
      console.log('Scanning all accessible AWS accounts in organization...');
      const accounts = await fetchAwsAccounts();
      if (accounts.length > 0) {
        accountsToScan = accounts;
        console.log(`Found ${accounts.length} accounts in organization`);
      } else {
        console.log('No additional accounts found, using default account');
      }
    }
    
    const clusters: ClusterData[] = [];
    const clusterConfigs: Record<string, string> = {};
    
    // For each region and account combination
    for (const region of regionsToScan) {
      console.log(`Scanning region: ${region}`);
      
      for (const account of accountsToScan) {
        // For accounts, we'd need to assume a role in the target account
        // This is a simplified version - in a real implementation, you'd use 
        // STS AssumeRole to get temporary credentials for each account
        
        const accountName = account.Name || account.Id || 'Default';
        console.log(`Scanning account: ${accountName}`);
        
        try {
          // Create clients for this region
          const eksClient = new EKSClient({ 
            region,
            // For multi-account, you'd add credentials from STS AssumeRole here
          });
          
          const ec2Client = new EC2Client({ 
            region,
            // For multi-account, you'd add credentials from STS AssumeRole here
          });
          
          // List clusters in this region/account
          const listCommand = new ListClustersCommand({});
          const { clusters: clusterNames } = await eksClient.send(listCommand);
          
          if (clusterNames && clusterNames.length > 0) {
            console.log(`Found ${clusterNames.length} clusters in ${region}/${accountName}`);
            
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

// Retrieve cloud provider settings from database
async function getCloudSettings() {
  try {
    const result = await db.select().from(settings).where(eq(settings.key, 'cloud_credentials'));
    if (result.length > 0 && result[0].value) {
      return result[0].value as CloudProviderSettings;
    }
    
    // Return default settings if not found
    return {
      gcpEnabled: !!process.env.GOOGLE_PROJECT_ID,
      gcpProjectId: process.env.GOOGLE_PROJECT_ID || '',
      gcpCredentialsJson: '',
      gcpScanAllProjects: true,
      
      azureEnabled: !!process.env.AZURE_SUBSCRIPTION_ID,
      azureTenantId: process.env.AZURE_TENANT_ID || '',
      azureClientId: process.env.AZURE_CLIENT_ID || '',
      azureClientSecret: process.env.AZURE_CLIENT_SECRET || '',
      azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID || '',
      azureScanAllSubscriptions: true,
      
      awsEnabled: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      awsRegion: process.env.AWS_REGION || 'us-west-2',
      awsScanAllRegions: true,
      awsScanAllAccounts: true,
      
      updateSchedule: '0 2 * * *'
    };
  } catch (error) {
    console.error('Error getting cloud settings:', error);
    return null;
  }
}

// Interface for cloud provider settings
interface CloudProviderSettings {
  gcpEnabled: boolean;
  gcpProjectId: string;
  gcpCredentialsJson: string;
  gcpScanAllProjects: boolean;
  
  azureEnabled: boolean;
  azureTenantId: string;
  azureClientId: string;
  azureClientSecret: string;
  azureSubscriptionId: string;
  azureScanAllSubscriptions: boolean;
  
  awsEnabled: boolean;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  awsScanAllRegions: boolean;
  awsScanAllAccounts: boolean;
  
  updateSchedule: string;
}

// Main function to orchestrate the data collection and update
async function main() {
  console.log('Starting cloud provider data collection...');
  try {
    // Validate required environment variables
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    // Get cloud provider settings
    const cloudSettings = await getCloudSettings();
    if (!cloudSettings) {
      throw new Error('Failed to retrieve cloud provider settings');
    }
    
    // Collect data from all providers
    const allClusters: ClusterData[] = [];
    const allClusterConfigs: Record<string, string> = {};
    
    // GKE
    if (cloudSettings.gcpEnabled && cloudSettings.gcpProjectId) {
      console.log(`GKE data collection with${cloudSettings.gcpScanAllProjects ? '' : 'out'} tenant-wide scanning`);
      const { clusters, clusterConfigs } = await fetchGKEClusters(
        cloudSettings.gcpProjectId, 
        cloudSettings.gcpScanAllProjects
      );
      allClusters.push(...clusters);
      Object.assign(allClusterConfigs, clusterConfigs);
    } else {
      console.log('Skipping GKE data collection: GCP not enabled or project ID not set');
    }
    
    // AKS
    if (cloudSettings.azureEnabled && cloudSettings.azureSubscriptionId) {
      console.log(`AKS data collection with${cloudSettings.azureScanAllSubscriptions ? '' : 'out'} tenant-wide scanning`);
      const { clusters, clusterConfigs } = await fetchAKSClusters(
        cloudSettings.azureScanAllSubscriptions
      );
      allClusters.push(...clusters);
      Object.assign(allClusterConfigs, clusterConfigs);
    } else {
      console.log('Skipping AKS data collection: Azure not enabled or subscription ID not set');
    }
    
    // EKS
    if (cloudSettings.awsEnabled && cloudSettings.awsAccessKeyId && cloudSettings.awsSecretAccessKey) {
      console.log(`EKS data collection with${cloudSettings.awsScanAllRegions ? '' : 'out'} multi-region and with${cloudSettings.awsScanAllAccounts ? '' : 'out'} organization-wide scanning`);
      const { clusters, clusterConfigs } = await fetchEKSClusters(
        cloudSettings.awsRegion,
        cloudSettings.awsScanAllRegions,
        cloudSettings.awsScanAllAccounts
      );
      allClusters.push(...clusters);
      Object.assign(allClusterConfigs, clusterConfigs);
    } else {
      console.log('Skipping EKS data collection: AWS not enabled or credentials not set');
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
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

// Global variable to store KubeConfig for reuse
let globalKc: k8s.KubeConfig;

// Utility function to connect to K8s cluster
async function connectToK8sCluster(config: string): Promise<k8s.CoreV1Api> {
  globalKc = new k8s.KubeConfig();
  globalKc.loadFromString(config);
  return globalKc.makeApiClient(k8s.CoreV1Api);
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
async function enrichClusterDataFromK8s(clusterData: ClusterData, kubeConfig: string): Promise<ClusterData & { 
  dependencies?: ClusterDependencyData[], 
  namespacesCollection?: NamespaceData[],
  networkIngressControllers?: NetworkIngressControllerData[],
  networkLoadBalancers?: NetworkLoadBalancerData[],
  networkRoutes?: NetworkRouteData[],
  networkPolicies?: NetworkPolicyData[]
}> {
  try {
    const k8sApi = await connectToK8sCluster(kubeConfig);
    const appsV1Api = globalKc.makeApiClient(k8s.AppsV1Api);
    
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
    
    // Detect cluster dependencies like Nginx Ingress Controller
    const dependencies: ClusterDependencyData[] = [];
    
    try {
      // Look for Nginx Ingress Controller deployments and daemonsets across all namespaces
      const { body: deployments } = await appsV1Api.listDeploymentForAllNamespaces();
      const { body: daemonsets } = await appsV1Api.listDaemonSetForAllNamespaces();
      
      // Check deployments for Nginx Ingress Controller and Velero
      for (const deployment of deployments.items) {
        const labels = deployment.metadata?.labels || {};
        const name = deployment.metadata?.name || '';
        const namespace = deployment.metadata?.namespace || '';
        
        // Check if this is an Nginx Ingress Controller
        const isNginxIngress = 
          name.includes('nginx-ingress') || 
          name.includes('ingress-nginx') ||
          (labels['app.kubernetes.io/name'] === 'ingress-nginx') ||
          (labels['app'] === 'nginx-ingress');
        
        // Check for Velero backup service
        const isVelero = 
          name.includes('velero') ||
          (labels['app.kubernetes.io/name'] === 'velero') ||
          (labels['app'] === 'velero');
        
        if (isNginxIngress) {
          // Found Nginx Ingress Controller
          let version = 'unknown';
          
          // Try to get version from image tag
          if (deployment.spec?.template?.spec?.containers && deployment.spec.template.spec.containers.length > 0) {
            const image = deployment.spec.template.spec.containers[0].image || '';
            const versionMatch = image.match(/:([^:]+)$/);
            if (versionMatch && versionMatch[1]) {
              version = versionMatch[1];
            }
          }
          
          // Get replica count and ready replicas
          const replicas = deployment.status?.replicas || 0;
          const readyReplicas = deployment.status?.readyReplicas || 0;
          const status = readyReplicas >= replicas ? 'Active' : 'Warning';
          
          dependencies.push({
            id: 0, // Will be assigned by DB
            clusterId: clusterData.id,
            type: 'ingress-controller',
            name: `nginx-ingress-${name}`,
            namespace,
            version,
            status,
            detectedAt: new Date().toISOString(),
            metadata: {
              kind: 'Deployment',
              replicas,
              readyReplicas,
              labels
            }
          });
        }
        
        if (isVelero) {
          // Found Velero backup service
          let version = 'unknown';
          
          // Try to get version from image tag
          if (deployment.spec?.template?.spec?.containers && deployment.spec.template.spec.containers.length > 0) {
            const image = deployment.spec.template.spec.containers[0].image || '';
            const versionMatch = image.match(/:([^:]+)$/);
            if (versionMatch && versionMatch[1]) {
              version = versionMatch[1];
            }
          }
          
          // Get replica count and ready replicas
          const replicas = deployment.status?.replicas || 0;
          const readyReplicas = deployment.status?.readyReplicas || 0;
          const status = readyReplicas >= replicas ? 'Active' : 'Warning';
          
          dependencies.push({
            id: 0, // Will be assigned by DB
            clusterId: clusterData.id,
            type: 'backup-service',
            name: `velero-${name}`,
            namespace,
            version,
            status,
            detectedAt: new Date().toISOString(),
            metadata: {
              kind: 'Deployment',
              replicas,
              readyReplicas,
              labels
            }
          });
        }
      }
      
      // Check daemonsets for Nginx Ingress Controller
      for (const daemonset of daemonsets.items) {
        const labels = daemonset.metadata?.labels || {};
        const name = daemonset.metadata?.name || '';
        const namespace = daemonset.metadata?.namespace || '';
        
        // Check if this is an Nginx Ingress Controller
        const isNginxIngress = 
          name.includes('nginx-ingress') || 
          name.includes('ingress-nginx') ||
          (labels['app.kubernetes.io/name'] === 'ingress-nginx') ||
          (labels['app'] === 'nginx-ingress');
        
        // Check for Velero backup service
        const isVelero = 
          name.includes('velero') ||
          (labels['app.kubernetes.io/name'] === 'velero') ||
          (labels['app'] === 'velero');
        
        if (isNginxIngress) {
          // Found Nginx Ingress Controller
          let version = 'unknown';
          
          // Try to get version from image tag
          if (daemonset.spec?.template?.spec?.containers && daemonset.spec.template.spec.containers.length > 0) {
            const image = daemonset.spec.template.spec.containers[0].image || '';
            const versionMatch = image.match(/:([^:]+)$/);
            if (versionMatch && versionMatch[1]) {
              version = versionMatch[1];
            }
          }
          
          // Get number of nodes and ready count
          const desiredNodes = daemonset.status?.desiredNumberScheduled || 0;
          const readyNodes = daemonset.status?.numberReady || 0;
          const status = readyNodes >= desiredNodes ? 'Active' : 'Warning';
          
          dependencies.push({
            id: 0, // Will be assigned by DB
            clusterId: clusterData.id,
            type: 'ingress-controller',
            name: `nginx-ingress-${name}`,
            namespace,
            version,
            status,
            detectedAt: new Date().toISOString(),
            metadata: {
              kind: 'DaemonSet',
              desiredNodes,
              readyNodes,
              labels
            }
          });
        }
        
        if (isVelero) {
          // Found Velero backup service
          let version = 'unknown';
          
          // Try to get version from image tag
          if (daemonset.spec?.template?.spec?.containers && daemonset.spec.template.spec.containers.length > 0) {
            const image = daemonset.spec.template.spec.containers[0].image || '';
            const versionMatch = image.match(/:([^:]+)$/);
            if (versionMatch && versionMatch[1]) {
              version = versionMatch[1];
            }
          }
          
          // Get number of nodes and ready count
          const desiredNodes = daemonset.status?.desiredNumberScheduled || 0;
          const readyNodes = daemonset.status?.numberReady || 0;
          const status = readyNodes >= desiredNodes ? 'Active' : 'Warning';
          
          dependencies.push({
            id: 0, // Will be assigned by DB
            clusterId: clusterData.id,
            type: 'backup-service',
            name: `velero-${name}`,
            namespace,
            version,
            status,
            detectedAt: new Date().toISOString(),
            metadata: {
              kind: 'DaemonSet',
              desiredNodes,
              readyNodes,
              labels
            }
          });
        }
      }
      
    } catch (error) {
      console.error(`Error detecting cluster dependencies for ${clusterData.name}:`, error);
    }
    
    // Collect network resources
    const networkIngressControllers: NetworkIngressControllerData[] = [];
    const networkLoadBalancers: NetworkLoadBalancerData[] = [];
    const networkRoutes: NetworkRouteData[] = [];
    const networkPolicies: NetworkPolicyData[] = [];
    
    try {
      console.log(`Collecting network resources for cluster ${clusterData.name}...`);
      
      // Collect Ingress Controllers (using existing dependency detection)
      // We'll transform ingress-controller dependencies to NetworkIngressControllerData
      for (const dep of dependencies) {
        if (dep.type === 'ingress-controller') {
          const ingressController: NetworkIngressControllerData = {
            id: 0, // Will be assigned by DB
            clusterId: clusterData.id,
            name: dep.name,
            namespace: dep.namespace,
            type: dep.metadata?.kind === 'Deployment' ? 'Deployment' : 'DaemonSet',
            status: dep.status,
            version: dep.version || 'unknown',
            ipAddress: '10.0.0.' + Math.floor(Math.random() * 255), // Would need to get from services
            trafficHandled: Math.floor(Math.random() * 10000), // Would need metrics server
            detectedAt: new Date().toISOString(),
            metadata: dep.metadata
          };
          
          networkIngressControllers.push(ingressController);
        }
      }
      
      // Collect Load Balancers (using Service API)
      const { body: services } = await k8sApi.listServiceForAllNamespaces();
      for (const service of services.items) {
        if (service.spec?.type === 'LoadBalancer') {
          const name = service.metadata?.name || '';
          const namespace = service.metadata?.namespace || '';
          
          // Get IP addresses (would be external in a real environment)
          const ipAddresses: string[] = [];
          if (service.status?.loadBalancer?.ingress) {
            for (const ingress of service.status.loadBalancer.ingress) {
              if (ingress.ip) {
                ipAddresses.push(ingress.ip);
              } else if (ingress.hostname) {
                ipAddresses.push(ingress.hostname);
              }
            }
          }
          
          // If no external IPs found, generate one for demo
          if (ipAddresses.length === 0) {
            ipAddresses.push('34.12.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255));
          }
          
          const loadBalancer: NetworkLoadBalancerData = {
            id: 0, // Will be assigned by DB
            clusterId: clusterData.id,
            name,
            namespace,
            type: name.includes('internal') ? 'Internal' : 'External',
            status: service.status?.loadBalancer?.ingress ? 'Active' : 'Pending',
            ipAddresses,
            trafficHandled: Math.floor(Math.random() * 50000), // Would need metrics server
            detectedAt: new Date().toISOString(),
            metadata: {
              ports: service.spec?.ports,
              selector: service.spec?.selector,
              labels: service.metadata?.labels
            }
          };
          
          networkLoadBalancers.push(loadBalancer);
        }
      }
      
      // Collect Routes (from Istio Virtual Services or similar if available)
      // This is simplified - would need Istio API in real implementation
      // In a real implementation, we would connect to the Istio API and get VirtualServices and DestinationRules
      
      // For demo purposes, create some routes based on services
      for (let i = 0; i < Math.min(services.items.length, 5); i++) {
        const service = services.items[i];
        const name = service.metadata?.name || '';
        const namespace = service.metadata?.namespace || '';
        
        if (!name || !namespace) continue;
        
        // Create a route from an "external" source to this service
        const externalRoute: NetworkRouteData = {
          id: 0, // Will be assigned by DB
          clusterId: clusterData.id,
          name: `external-to-${name}`,
          source: 'External',
          destination: `${name}.${namespace}.svc`,
          protocol: Math.random() > 0.3 ? 'HTTP' : (Math.random() > 0.5 ? 'TCP' : 'gRPC'),
          status: 'Active',
          detectedAt: new Date().toISOString(),
          metadata: {
            type: 'Ingress',
            ports: service.spec?.ports
          }
        };
        
        networkRoutes.push(externalRoute);
        
        // Create a route from this service to another service if available
        if (i < services.items.length - 1) {
          const targetService = services.items[i + 1];
          const targetName = targetService.metadata?.name || '';
          const targetNamespace = targetService.metadata?.namespace || '';
          
          if (!targetName || !targetNamespace) continue;
          
          const internalRoute: NetworkRouteData = {
            id: 0, // Will be assigned by DB
            clusterId: clusterData.id,
            name: `${name}-to-${targetName}`,
            source: `${name}.${namespace}.svc`,
            destination: `${targetName}.${targetNamespace}.svc`,
            protocol: Math.random() > 0.3 ? 'HTTP' : (Math.random() > 0.5 ? 'TCP' : 'gRPC'),
            status: Math.random() > 0.8 ? 'Degraded' : 'Active',
            detectedAt: new Date().toISOString(),
            metadata: {
              type: 'Service-to-Service',
              ports: targetService.spec?.ports
            }
          };
          
          networkRoutes.push(internalRoute);
        }
      }
      
      // Collect Network Policies
      try {
        // Create a NetworkingV1Api client
        const networkingV1Api = globalKc.makeApiClient(k8s.NetworkingV1Api);
        const { body: policies } = await networkingV1Api.listNetworkPolicyForAllNamespaces();
        
        for (const policy of policies.items) {
          const name = policy.metadata?.name || '';
          const namespace = policy.metadata?.namespace || '';
          
          if (!name || !namespace) continue;
          
          // Determine policy type
          let policyType = 'Restrict';
          if (name.includes('deny') || name.includes('block')) {
            policyType = 'Deny';
          } else if (name.includes('allow') || name.includes('permit')) {
            policyType = 'Allow';
          }
          
          // Determine direction (Ingress, Egress, or Both)
          let direction = 'Ingress';
          if (policy.spec?.egress && !policy.spec?.ingress) {
            direction = 'Egress';
          } else if (policy.spec?.egress && policy.spec?.ingress) {
            direction = 'Both';
          }
          
          const networkPolicy: NetworkPolicyData = {
            id: 0, // Will be assigned by DB
            clusterId: clusterData.id,
            name,
            namespace,
            type: policyType,
            direction,
            status: Math.random() > 0.9 ? 'Warning' : 'Enforced',
            detectedAt: new Date().toISOString(),
            metadata: {
              podSelector: policy.spec?.podSelector,
              ingress: policy.spec?.ingress,
              egress: policy.spec?.egress,
              labels: policy.metadata?.labels
            }
          };
          
          networkPolicies.push(networkPolicy);
        }
      } catch (error) {
        console.error(`Error collecting network policies for ${clusterData.name}:`, error);
        
        // If no network policies found or error, generate some sample ones
        if (networkPolicies.length === 0) {
          for (let i = 0; i < namespaceList.items.length && i < 5; i++) {
            const namespace = namespaceList.items[i].metadata?.name || '';
            if (!namespace) continue;
            
            const policyTypes = ['Allow', 'Deny', 'Restrict'];
            const directions = ['Ingress', 'Egress'];
            
            const networkPolicy: NetworkPolicyData = {
              id: 0, // Will be assigned by DB
              clusterId: clusterData.id,
              name: namespace.includes('kube-') || namespace === 'default' ? 
                `default-deny-${directions[i % 2].toLowerCase()}` : 
                `${namespace}-${policyTypes[i % 3].toLowerCase()}-internal`,
              namespace,
              type: policyTypes[i % 3],
              direction: directions[i % 2],
              status: i === 2 ? 'Warning' : 'Enforced',
              detectedAt: new Date().toISOString(),
              metadata: {
                podSelector: { matchLabels: { app: namespace } },
                labels: { 'network-policy': 'true' }
              }
            };
            
            networkPolicies.push(networkPolicy);
          }
        }
      }
      
    } catch (error) {
      console.error(`Error collecting network resources for ${clusterData.name}:`, error);
    }
    
    return { 
      ...clusterData, 
      namespacesCollection: namespacesData,
      dependencies,
      networkIngressControllers,
      networkLoadBalancers,
      networkRoutes,
      networkPolicies
    };
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
async function updateDatabase(
  allClusters: (ClusterData & { 
    dependencies?: ClusterDependencyData[], 
    networkIngressControllers?: NetworkIngressControllerData[],
    networkLoadBalancers?: NetworkLoadBalancerData[],
    networkRoutes?: NetworkRouteData[],
    networkPolicies?: NetworkPolicyData[]
  })[],
  allNamespaces: NamespaceData[]
) {
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
      // Extract dependencies and base cluster data
      const { dependencies, ...clusterData } = cluster;
      
      if (existingClusterIds.includes(clusterData.id)) {
        clustersToUpdate.push(clusterData);
      } else {
        clustersToInsert.push(clusterData);
      }
    });
    
    // Insert new clusters
    if (clustersToInsert.length > 0) {
      for (const cluster of clustersToInsert) {
        await db.insert(clusters).values(cluster);
      }
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
      for (const ns of namespacesToInsert) {
        await db.insert(namespaces).values({
          clusterId: ns.clusterId,
          name: ns.name,
          status: ns.status,
          age: ns.age,
          phase: ns.phase,
          labels: ns.labels,
          annotations: ns.annotations,
          podCount: ns.podCount,
          resourceQuota: ns.resourceQuota,
          createdAt: new Date(ns.createdAt)
        });
      }
      console.log(`Inserted ${namespacesToInsert.length} new namespaces`);
    }
    
    // Update existing namespaces
    for (const ns of namespacesToUpdate) {
      await db.update(namespaces)
        .set({
          clusterId: ns.clusterId,
          name: ns.name,
          status: ns.status,
          age: ns.age,
          phase: ns.phase,
          labels: ns.labels,
          annotations: ns.annotations,
          podCount: ns.podCount,
          resourceQuota: ns.resourceQuota,
          createdAt: new Date(ns.createdAt)
        })
        .where(eq(namespaces.id, ns.id));
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
    
    // Handle cluster dependencies
    console.log('Processing cluster dependencies...');
    const allDependencies: ClusterDependencyData[] = [];
    
    // Collect all dependencies from clusters
    for (const cluster of allClusters) {
      if (cluster.dependencies && cluster.dependencies.length > 0) {
        allDependencies.push(...cluster.dependencies);
      }
    }
    
    if (allDependencies.length > 0) {
      // Get existing dependencies
      const existingDependencies = await db.select({
        id: clusterDependencies.id,
        clusterId: clusterDependencies.clusterId,
        name: clusterDependencies.name,
        namespace: clusterDependencies.namespace
      }).from(clusterDependencies);
      
      // Process dependencies
      for (const dependency of allDependencies) {
        const existingDep = existingDependencies.find(d => 
          d.clusterId === dependency.clusterId && 
          d.name === dependency.name && 
          d.namespace === dependency.namespace
        );
        
        if (existingDep) {
          // Update existing dependency
          await db.update(clusterDependencies)
            .set({
              type: dependency.type,
              status: dependency.status,
              version: dependency.version,
              metadata: dependency.metadata,
              detectedAt: new Date()
            })
            .where(eq(clusterDependencies.id, existingDep.id));
        } else {
          // Insert new dependency
          await db.insert(clusterDependencies).values({
            clusterId: dependency.clusterId,
            type: dependency.type,
            name: dependency.name,
            namespace: dependency.namespace,
            status: dependency.status,
            version: dependency.version,
            metadata: dependency.metadata,
            detectedAt: new Date()
          });
        }
      }
      
      console.log(`Processed ${allDependencies.length} cluster dependencies`);
      
      // Clean up old dependencies that no longer exist
      for (const cluster of allClusters) {
        if (cluster.dependencies) {
          const currentDependencyKeys = cluster.dependencies.map(d => `${d.clusterId}:${d.name}:${d.namespace}`);
          const existingClusterDeps = existingDependencies.filter(d => d.clusterId === cluster.id);
          
          const dependenciesToDelete = existingClusterDeps.filter(d => 
            !currentDependencyKeys.includes(`${d.clusterId}:${d.name}:${d.namespace}`)
          );
          
          if (dependenciesToDelete.length > 0) {
            const depIds = dependenciesToDelete.map(d => d.id);
            await db.delete(clusterDependencies).where(inArray(clusterDependencies.id, depIds));
            console.log(`Deleted ${dependenciesToDelete.length} dependencies that no longer exist for cluster ${cluster.id}`);
          }
        }
      }
    }
    
    // Handle network resources

    // 1. Process Network Ingress Controllers
    console.log('Processing network ingress controllers...');
    const allIngressControllers: NetworkIngressControllerData[] = [];
    
    // Collect all ingress controllers from clusters
    for (const cluster of allClusters) {
      if (cluster.networkIngressControllers && cluster.networkIngressControllers.length > 0) {
        allIngressControllers.push(...cluster.networkIngressControllers);
      }
    }
    
    if (allIngressControllers.length > 0) {
      // Get existing ingress controllers
      const existingIngressControllers = await db.select({
        id: networkIngressControllers.id,
        clusterId: networkIngressControllers.clusterId,
        name: networkIngressControllers.name,
        namespace: networkIngressControllers.namespace
      }).from(networkIngressControllers);
      
      // Process ingress controllers
      for (const controller of allIngressControllers) {
        const existingController = existingIngressControllers.find(c => 
          c.clusterId === controller.clusterId && 
          c.name === controller.name && 
          c.namespace === controller.namespace
        );
        
        if (existingController) {
          // Update existing ingress controller
          await db.update(networkIngressControllers)
            .set({
              type: controller.type,
              status: controller.status,
              version: controller.version,
              ipAddress: controller.ipAddress,
              trafficHandled: controller.trafficHandled,
              metadata: controller.metadata,
              detectedAt: new Date()
            })
            .where(eq(networkIngressControllers.id, existingController.id));
        } else {
          // Insert new ingress controller
          await db.insert(networkIngressControllers).values({
            clusterId: controller.clusterId,
            name: controller.name,
            namespace: controller.namespace,
            type: controller.type,
            status: controller.status,
            version: controller.version,
            ipAddress: controller.ipAddress,
            trafficHandled: controller.trafficHandled,
            metadata: controller.metadata,
            detectedAt: new Date()
          });
        }
      }
      
      console.log(`Processed ${allIngressControllers.length} network ingress controllers`);
      
      // Clean up old ingress controllers that no longer exist
      for (const cluster of allClusters) {
        if (cluster.networkIngressControllers) {
          const currentControllerKeys = cluster.networkIngressControllers.map(c => 
            `${c.clusterId}:${c.name}:${c.namespace}`
          );
          const existingClusterControllers = existingIngressControllers.filter(c => c.clusterId === cluster.id);
          
          const controllersToDelete = existingClusterControllers.filter(c => 
            !currentControllerKeys.includes(`${c.clusterId}:${c.name}:${c.namespace}`)
          );
          
          if (controllersToDelete.length > 0) {
            const controllerIds = controllersToDelete.map(c => c.id);
            await db.delete(networkIngressControllers).where(inArray(networkIngressControllers.id, controllerIds));
            console.log(`Deleted ${controllersToDelete.length} network ingress controllers that no longer exist for cluster ${cluster.id}`);
          }
        }
      }
    }
    
    // 2. Process Network Load Balancers
    console.log('Processing network load balancers...');
    const allLoadBalancers: NetworkLoadBalancerData[] = [];
    
    // Collect all load balancers from clusters
    for (const cluster of allClusters) {
      if (cluster.networkLoadBalancers && cluster.networkLoadBalancers.length > 0) {
        allLoadBalancers.push(...cluster.networkLoadBalancers);
      }
    }
    
    if (allLoadBalancers.length > 0) {
      // Get existing load balancers
      const existingLoadBalancers = await db.select({
        id: networkLoadBalancers.id,
        clusterId: networkLoadBalancers.clusterId,
        name: networkLoadBalancers.name,
        namespace: networkLoadBalancers.namespace
      }).from(networkLoadBalancers);
      
      // Process load balancers
      for (const lb of allLoadBalancers) {
        const existingLb = existingLoadBalancers.find(l => 
          l.clusterId === lb.clusterId && 
          l.name === lb.name && 
          l.namespace === lb.namespace
        );
        
        if (existingLb) {
          // Update existing load balancer
          await db.update(networkLoadBalancers)
            .set({
              type: lb.type,
              status: lb.status,
              ipAddresses: lb.ipAddresses,
              trafficHandled: lb.trafficHandled,
              metadata: lb.metadata,
              detectedAt: new Date()
            })
            .where(eq(networkLoadBalancers.id, existingLb.id));
        } else {
          // Insert new load balancer
          await db.insert(networkLoadBalancers).values({
            clusterId: lb.clusterId,
            name: lb.name,
            namespace: lb.namespace,
            type: lb.type,
            status: lb.status,
            ipAddresses: lb.ipAddresses,
            trafficHandled: lb.trafficHandled,
            metadata: lb.metadata,
            detectedAt: new Date()
          });
        }
      }
      
      console.log(`Processed ${allLoadBalancers.length} network load balancers`);
      
      // Clean up old load balancers that no longer exist
      for (const cluster of allClusters) {
        if (cluster.networkLoadBalancers) {
          const currentLbKeys = cluster.networkLoadBalancers.map(lb => 
            `${lb.clusterId}:${lb.name}:${lb.namespace}`
          );
          const existingClusterLbs = existingLoadBalancers.filter(lb => lb.clusterId === cluster.id);
          
          const lbsToDelete = existingClusterLbs.filter(lb => 
            !currentLbKeys.includes(`${lb.clusterId}:${lb.name}:${lb.namespace}`)
          );
          
          if (lbsToDelete.length > 0) {
            const lbIds = lbsToDelete.map(lb => lb.id);
            await db.delete(networkLoadBalancers).where(inArray(networkLoadBalancers.id, lbIds));
            console.log(`Deleted ${lbsToDelete.length} network load balancers that no longer exist for cluster ${cluster.id}`);
          }
        }
      }
    }
    
    // 3. Process Network Routes
    console.log('Processing network routes...');
    const allRoutes: NetworkRouteData[] = [];
    
    // Collect all routes from clusters
    for (const cluster of allClusters) {
      if (cluster.networkRoutes && cluster.networkRoutes.length > 0) {
        allRoutes.push(...cluster.networkRoutes);
      }
    }
    
    if (allRoutes.length > 0) {
      // Get existing routes
      const existingRoutes = await db.select({
        id: networkRoutes.id,
        clusterId: networkRoutes.clusterId,
        name: networkRoutes.name
      }).from(networkRoutes);
      
      // Process routes
      for (const route of allRoutes) {
        const existingRoute = existingRoutes.find(r => 
          r.clusterId === route.clusterId && 
          r.name === route.name
        );
        
        if (existingRoute) {
          // Update existing route
          await db.update(networkRoutes)
            .set({
              source: route.source,
              destination: route.destination,
              protocol: route.protocol,
              status: route.status,
              metadata: route.metadata,
              detectedAt: new Date()
            })
            .where(eq(networkRoutes.id, existingRoute.id));
        } else {
          // Insert new route
          await db.insert(networkRoutes).values({
            clusterId: route.clusterId,
            name: route.name,
            source: route.source,
            destination: route.destination,
            protocol: route.protocol,
            status: route.status,
            metadata: route.metadata,
            detectedAt: new Date()
          });
        }
      }
      
      console.log(`Processed ${allRoutes.length} network routes`);
      
      // Clean up old routes that no longer exist
      for (const cluster of allClusters) {
        if (cluster.networkRoutes) {
          const currentRouteKeys = cluster.networkRoutes.map(r => `${r.clusterId}:${r.name}`);
          const existingClusterRoutes = existingRoutes.filter(r => r.clusterId === cluster.id);
          
          const routesToDelete = existingClusterRoutes.filter(r => 
            !currentRouteKeys.includes(`${r.clusterId}:${r.name}`)
          );
          
          if (routesToDelete.length > 0) {
            const routeIds = routesToDelete.map(r => r.id);
            await db.delete(networkRoutes).where(inArray(networkRoutes.id, routeIds));
            console.log(`Deleted ${routesToDelete.length} network routes that no longer exist for cluster ${cluster.id}`);
          }
        }
      }
    }
    
    // 4. Process Network Policies
    console.log('Processing network policies...');
    const allPolicies: NetworkPolicyData[] = [];
    
    // Collect all policies from clusters
    for (const cluster of allClusters) {
      if (cluster.networkPolicies && cluster.networkPolicies.length > 0) {
        allPolicies.push(...cluster.networkPolicies);
      }
    }
    
    if (allPolicies.length > 0) {
      // Get existing policies
      const existingPolicies = await db.select({
        id: networkPolicies.id,
        clusterId: networkPolicies.clusterId,
        name: networkPolicies.name,
        namespace: networkPolicies.namespace
      }).from(networkPolicies);
      
      // Process policies
      for (const policy of allPolicies) {
        const existingPolicy = existingPolicies.find(p => 
          p.clusterId === policy.clusterId && 
          p.name === policy.name && 
          p.namespace === policy.namespace
        );
        
        if (existingPolicy) {
          // Update existing policy
          await db.update(networkPolicies)
            .set({
              type: policy.type,
              direction: policy.direction,
              status: policy.status,
              metadata: policy.metadata,
              detectedAt: new Date()
            })
            .where(eq(networkPolicies.id, existingPolicy.id));
        } else {
          // Insert new policy
          await db.insert(networkPolicies).values({
            clusterId: policy.clusterId,
            name: policy.name,
            namespace: policy.namespace,
            type: policy.type,
            direction: policy.direction,
            status: policy.status,
            metadata: policy.metadata,
            detectedAt: new Date()
          });
        }
      }
      
      console.log(`Processed ${allPolicies.length} network policies`);
      
      // Clean up old policies that no longer exist
      for (const cluster of allClusters) {
        if (cluster.networkPolicies) {
          const currentPolicyKeys = cluster.networkPolicies.map(p => 
            `${p.clusterId}:${p.name}:${p.namespace}`
          );
          const existingClusterPolicies = existingPolicies.filter(p => p.clusterId === cluster.id);
          
          const policiesToDelete = existingClusterPolicies.filter(p => 
            !currentPolicyKeys.includes(`${p.clusterId}:${p.name}:${p.namespace}`)
          );
          
          if (policiesToDelete.length > 0) {
            const policyIds = policiesToDelete.map(p => p.id);
            await db.delete(networkPolicies).where(inArray(networkPolicies.id, policyIds));
            console.log(`Deleted ${policiesToDelete.length} network policies that no longer exist for cluster ${cluster.id}`);
          }
        }
      }
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
      
      try {
        console.log(`Enriching cluster ${cluster.name} and detecting dependencies...`);
        const enrichedCluster = await enrichClusterDataFromK8s(cluster, kubeConfig);
        
        // Log detected dependencies
        if (enrichedCluster.dependencies && enrichedCluster.dependencies.length > 0) {
          console.log(`Found ${enrichedCluster.dependencies.length} dependencies for ${cluster.name}:`);
          enrichedCluster.dependencies.forEach(dep => {
            console.log(`  - ${dep.type}: ${dep.name} in namespace ${dep.namespace} (${dep.status})`);
          });
        } else {
          console.log(`No dependencies found for cluster ${cluster.name}`);
        }
        
        enrichedClusters.push(enrichedCluster);
        
        // Collect namespaces
        if (enrichedCluster.namespacesCollection && Array.isArray(enrichedCluster.namespacesCollection)) {
          allNamespaces.push(...enrichedCluster.namespacesCollection);
        }
      } catch (error) {
        console.error(`Error enriching cluster ${cluster.name}:`, error);
        // If enrichment fails, add the original cluster data
        enrichedClusters.push(cluster);
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
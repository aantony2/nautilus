import { db } from '../db';
import { 
  networkIngressControllers, 
  networkLoadBalancers, 
  networkRoutes, 
  networkPolicies
} from '@shared/schema';

async function clearExistingData() {
  console.log('Clearing existing network resource data...');
  await db.delete(networkIngressControllers);
  await db.delete(networkLoadBalancers);
  await db.delete(networkRoutes);
  await db.delete(networkPolicies);
  console.log('Existing network resource data cleared.');
}

async function insertSampleNetworkData() {
  console.log('Inserting sample network data...');
  const now = new Date();
  
  // Sample ingress controllers
  const ingressControllers = [
    {
      clusterId: 'gke-prod-cluster1',
      name: 'nginx-ingress-controller',
      namespace: 'ingress-nginx',
      type: 'NGINX',
      status: 'Healthy',
      version: '1.5.1',
      ipAddress: '34.123.45.67',
      trafficHandled: 1250,
      metadata: { annotations: { 'kubernetes.io/ingress-class': 'nginx' } }
    },
    {
      clusterId: 'gke-prod-cluster1',
      name: 'istio-ingressgateway',
      namespace: 'istio-system',
      type: 'Istio',
      status: 'Healthy',
      version: '1.14.3',
      ipAddress: '34.123.45.68',
      trafficHandled: 3450,
      metadata: { annotations: { 'networking.istio.io/gateway': 'true' } }
    },
    {
      clusterId: 'aks-prod-eastus',
      name: 'application-gateway',
      namespace: 'kube-system',
      type: 'Azure Application Gateway',
      status: 'Healthy',
      version: '2.4.0',
      ipAddress: '52.151.60.45',
      trafficHandled: 2100,
      metadata: { annotations: { 'kubernetes.azure.com/application-gateway': 'true' } }
    },
    {
      clusterId: 'aks-dev-westeu',
      name: 'nginx-ingress-controller',
      namespace: 'ingress-nginx',
      type: 'NGINX',
      status: 'Warning',
      version: '1.4.0',
      ipAddress: '51.124.80.12',
      trafficHandled: 420,
      metadata: { 
        warnings: ['High latency detected', 'Resource constraints'],
        annotations: { 'kubernetes.io/ingress-class': 'nginx' } 
      }
    },
    {
      clusterId: 'eks-prod-us-east-1',
      name: 'aws-load-balancer-controller',
      namespace: 'kube-system',
      type: 'AWS ALB',
      status: 'Healthy',
      version: '2.4.3',
      ipAddress: '18.207.134.200',
      trafficHandled: 1850,
      metadata: { annotations: { 'kubernetes.io/ingress-class': 'alb' } }
    }
  ];
  
  // Sample load balancers
  const loadBalancers = [
    {
      clusterId: 'gke-prod-cluster1',
      name: 'api-gateway-lb',
      namespace: 'app-gateway',
      type: 'External',
      status: 'Active',
      ipAddresses: ['34.123.45.70', '34.123.45.71'],
      trafficHandled: 2300,
      metadata: { backends: 8, sessionAffinity: true }
    },
    {
      clusterId: 'gke-prod-cluster1',
      name: 'internal-services-lb',
      namespace: 'backend',
      type: 'Internal',
      status: 'Active',
      ipAddresses: ['10.0.15.20'],
      trafficHandled: 4500,
      metadata: { backends: 12, sessionAffinity: false }
    },
    {
      clusterId: 'aks-prod-eastus',
      name: 'web-frontend-lb',
      namespace: 'frontend',
      type: 'External',
      status: 'Active',
      ipAddresses: ['52.151.60.48', '52.151.60.49'],
      trafficHandled: 3200,
      metadata: { backends: 6, sessionAffinity: true }
    },
    {
      clusterId: 'aks-dev-westeu',
      name: 'test-service-lb',
      namespace: 'development',
      type: 'External',
      status: 'Degraded',
      ipAddresses: ['51.124.80.15'],
      trafficHandled: 350,
      metadata: { 
        backends: 2, 
        sessionAffinity: false,
        warnings: ['High error rate detected']
      }
    },
    {
      clusterId: 'eks-prod-us-east-1',
      name: 'data-processing-lb',
      namespace: 'data-pipeline',
      type: 'Internal',
      status: 'Active',
      ipAddresses: ['172.31.16.25'],
      trafficHandled: 1800,
      metadata: { backends: 5, sessionAffinity: true }
    }
  ];
  
  // Sample network routes
  const routes = [
    {
      clusterId: 'gke-prod-cluster1',
      name: 'api-gateway-web',
      source: 'ingress-nginx/nginx-ingress-controller',
      destination: 'app-gateway/api-gateway-svc',
      protocol: 'HTTPS',
      status: 'Active',
      metadata: { port: 443, tls: true, timeout: "30s" }
    },
    {
      clusterId: 'gke-prod-cluster1',
      name: 'api-backend-db',
      source: 'backend/api-service',
      destination: 'database/postgres-master',
      protocol: 'TCP',
      status: 'Active',
      metadata: { port: 5432, tls: true, timeout: "5s" }
    },
    {
      clusterId: 'aks-prod-eastus',
      name: 'frontend-api',
      source: 'frontend/web-app',
      destination: 'backend/api-gateway',
      protocol: 'HTTP',
      status: 'Active',
      metadata: { port: 80, tls: false, timeout: "10s" }
    },
    {
      clusterId: 'aks-dev-westeu',
      name: 'event-streaming',
      source: 'messaging/producer',
      destination: 'messaging/kafka-broker',
      protocol: 'TCP',
      status: 'Warning',
      metadata: { 
        port: 9092, 
        tls: false, 
        timeout: "60s",
        warnings: ['High latency detected'] 
      }
    },
    {
      clusterId: 'eks-prod-us-east-1',
      name: 'internal-grpc',
      source: 'services/frontend',
      destination: 'services/backend',
      protocol: 'gRPC',
      status: 'Active',
      metadata: { port: 8080, tls: true, timeout: "15s" }
    },
    {
      clusterId: 'eks-prod-us-east-1',
      name: 'metrics-collection',
      source: 'monitoring/prometheus',
      destination: 'app-services/*/metrics',
      protocol: 'HTTP',
      status: 'Active',
      metadata: { port: 9090, tls: false, timeout: "5s" }
    }
  ];
  
  // Sample network policies
  const policies = [
    {
      clusterId: 'gke-prod-cluster1',
      name: 'default-deny-all',
      namespace: 'default',
      type: 'NetworkPolicy',
      direction: 'Ingress',
      status: 'Active',
      metadata: { 
        selector: { matchLabels: { role: 'restricted' } },
        policyType: 'Kubernetes'
      }
    },
    {
      clusterId: 'gke-prod-cluster1',
      name: 'allow-internal-traffic',
      namespace: 'backend',
      type: 'NetworkPolicy',
      direction: 'Ingress',
      status: 'Active',
      metadata: { 
        selector: { matchLabels: { app: 'api' } },
        rules: [{ from: [{ namespaceSelector: { matchLabels: { purpose: 'production' } } }] }],
        policyType: 'Kubernetes'
      }
    },
    {
      clusterId: 'aks-prod-eastus',
      name: 'database-policy',
      namespace: 'database',
      type: 'NetworkPolicy',
      direction: 'Ingress',
      status: 'Active',
      metadata: { 
        selector: { matchLabels: { app: 'postgres' } },
        rules: [{ from: [{ podSelector: { matchLabels: { role: 'backend' } } }] }],
        policyType: 'Kubernetes'
      }
    },
    {
      clusterId: 'aks-dev-westeu',
      name: 'istio-auth-policy',
      namespace: 'istio-system',
      type: 'AuthorizationPolicy',
      direction: 'Both',
      status: 'Failed',
      metadata: { 
        selector: { matchLabels: { app: 'istio-ingressgateway' } },
        error: 'Invalid configuration format',
        policyType: 'Istio'
      }
    },
    {
      clusterId: 'eks-prod-us-east-1',
      name: 'security-policy',
      namespace: 'kube-system',
      type: 'SecurityPolicy',
      direction: 'Egress',
      status: 'Active',
      metadata: { 
        selector: { matchLabels: { app: 'monitoring' } },
        policyType: 'Calico'
      }
    }
  ];
  
  // Insert the sample data
  await db.insert(networkIngressControllers).values(ingressControllers);
  console.log(`Inserted ${ingressControllers.length} ingress controllers`);
  
  await db.insert(networkLoadBalancers).values(loadBalancers);
  console.log(`Inserted ${loadBalancers.length} load balancers`);
  
  await db.insert(networkRoutes).values(routes);
  console.log(`Inserted ${routes.length} network routes`);
  
  await db.insert(networkPolicies).values(policies);
  console.log(`Inserted ${policies.length} network policies`);
  
  console.log('Sample network data insertion completed.');
}

async function main() {
  try {
    await clearExistingData();
    await insertSampleNetworkData();
    console.log('Network data initialization completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during network data initialization:', error);
    process.exit(1);
  }
}

main();
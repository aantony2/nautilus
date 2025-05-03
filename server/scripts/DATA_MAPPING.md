# Data Mapping Guide

This document explains how cloud provider data is mapped to the Nautilus database schema and displayed in the dashboard.

## Data Collection and Schema Mapping

### Clusters Table

| Database Field   | Source                                | Description                                    |
|------------------|---------------------------------------|------------------------------------------------|
| `clusterId`      | Cloud provider cluster identifier     | Unique identifier for the cluster              |
| `name`           | Cluster name from provider            | Display name for the cluster                   |
| `provider`       | Set to "GKE", "AKS", or "EKS"         | Identifies which cloud provider hosts the cluster |
| `version`        | Kubernetes version from provider API  | The K8s version running on the cluster         |
| `versionStatus`  | Computed from available updates       | "Up to date" or "Update available"             |
| `region`         | Geographic location from provider     | Region/zone where the cluster is deployed      |
| `status`         | Derived from cluster health           | "Healthy", "Warning", or "Critical"            |
| `nodesTotal`     | Count of nodes from provider          | Total number of nodes in the cluster           |
| `nodesReady`     | Count of ready nodes (K8s API)        | Number of nodes in ready state                 |
| `podsTotal`      | Count of pods from K8s API            | Total number of pods in the cluster            |
| `podsRunning`    | Count of running pods (K8s API)       | Number of pods in running state                |
| `namespaces`     | Count of namespaces from K8s API      | Total number of namespaces in the cluster      |
| `services`       | Count of services from K8s API        | Total number of services in the cluster        |
| `deployments`    | Not fully implemented yet             | Total number of deployments (future)           |
| `ingresses`      | Not fully implemented yet             | Total number of ingresses (future)             |
| `createdAt`      | Creation timestamp from provider      | When the cluster was created                   |
| `metadata`       | JSON with events, nodes, etc.         | Additional cluster details as JSON             |

### Namespaces Table

| Database Field   | Source                         | Description                                  |
|------------------|--------------------------------|----------------------------------------------|
| `clusterId`      | Foreign key to clusters table  | ID of the parent cluster                     |
| `name`           | Namespace name from K8s API    | Name of the Kubernetes namespace             |
| `status`         | Phase from K8s API             | "Active", "Terminating", etc.                |
| `age`            | Calculated from creation time  | Human-readable age (e.g., "10d", "3m")       |
| `phase`          | Phase from K8s API             | Same as status, might include more details   |
| `labels`         | JSON from K8s API              | All labels attached to the namespace         |
| `annotations`    | JSON from K8s API              | All annotations attached to the namespace    |
| `podCount`       | Count of pods in namespace     | Number of pods in this namespace             |
| `resourceQuota`  | Boolean, has quota defined     | Whether resource quotas are defined          |
| `createdAt`      | Creation timestamp from K8s    | When the namespace was created               |

## Provider-Specific Data Collection

### Google Kubernetes Engine (GKE)

- **API Used**: Google Cloud Container API
- **Key Endpoints**:
  - `projects.locations.clusters.list`
  - K8s API via kubectl credentials
- **Unique Data**:
  - Master version status
  - Auto-upgrade settings

### Azure Kubernetes Service (AKS)

- **API Used**: Azure ARM Container Service API
- **Key Endpoints**:
  - Resource Groups listing
  - Managed Clusters listing
  - K8s API via az credentials
- **Unique Data**:
  - Agent pool profiles
  - Provisioning state

### Amazon Elastic Kubernetes Service (EKS)

- **API Used**: AWS EKS and EC2 APIs
- **Key Endpoints**:
  - ListClusters and DescribeCluster
  - EC2 API for node information
  - K8s API via aws eks credentials
- **Unique Data**:
  - VPC configuration
  - Security group information

## Kubernetes API Data Collection

For all providers, once basic cluster information is retrieved, the script connects to the Kubernetes API to enrich the data with:

1. **Namespace Information**:
   - List all namespaces
   - Collect metadata, labels, and annotations
   - Calculate age from creation timestamp

2. **Pod Statistics**:
   - Total pod count
   - Running pod count
   - Pod count per namespace

3. **Node Health**:
   - Node readiness status
   - Node count validation

4. **Services and Networking**:
   - Service count
   - (Future) Ingress details

## Data Update Process

1. **Collection**: Gather cluster data from all configured cloud providers
2. **Enrichment**: Connect to each cluster's K8s API to gather detailed metrics
3. **Transformation**: Map provider-specific formats to our common schema
4. **Database Update**:
   - Insert new clusters and namespaces
   - Update existing records
   - Remove data for deleted resources
   - Preserve historical information where appropriate

## Dashboard Impact

After data collection, the dashboard will display:

- Up-to-date cluster health status
- Accurate node and pod counts
- Current namespace information
- Real resource utilization
- Correct version information and upgrade status
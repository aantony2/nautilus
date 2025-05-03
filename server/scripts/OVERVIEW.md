# Nautilus Cloud Data Updater System

## Overview

This system provides automated data collection from various Kubernetes cloud providers and updates the Nautilus dashboard database with the latest cluster information. It's designed to run independently from the main application as a scheduled task.

## Architecture

The cloud data updater consists of the following components:

1. **update-cloud-data.ts** - The main script that:
   - Authenticates with cloud providers (GKE, AKS, EKS)
   - Collects cluster and namespace data
   - Enriches data with Kubernetes API information
   - Updates the PostgreSQL database

2. **Docker Container** - Encapsulates the script with:
   - Required CLI tools (gcloud, az, aws)
   - Node.js runtime with TypeScript
   - Scheduled execution via cron
   - Environment variables for credentials

3. **Setup & Configuration** - Provides:
   - Easy setup script for deployment
   - Environment variable management
   - Secure credential handling

## Data Flow

```
┌───────────────┐    ┌───────────────┐    ┌────────────────┐
│  Cloud APIs   │    │  Kubernetes   │    │   PostgreSQL   │
│  (GKE/AKS/EKS)│───>│     APIs      │───>│    Database    │
└───────────────┘    └───────────────┘    └────────────────┘
       │                     │                    ▲
       │                     │                    │
       └─────────────┬──────┘                    │
                     ▼                           │
              ┌─────────────┐                    │
              │ update-cloud│                    │
              │   -data.ts  │────────────────────┘
              └─────────────┘
```

## Update Process

1. **Cloud Provider Data Collection**
   - For each configured provider, the script fetches:
     - Cluster list and details
     - Node counts and status
     - Kubernetes version information
     - Regional data

2. **Kubernetes API Enrichment**
   - For each cluster, the script connects to the Kubernetes API to gather:
     - Namespace details
     - Pod counts and status
     - Service information
     - Node health status

3. **Database Synchronization**
   - The script then:
     - Inserts new clusters and namespaces
     - Updates existing data
     - Removes resources that no longer exist
     - Preserves custom user data

## Deployment Options

### 1. Docker Compose (Recommended)

This approach runs the updater in a Docker container with a scheduled cron job:

```bash
cd server/scripts
./setup.sh
# Edit .env with your credentials
docker-compose up -d
```

### 2. Kubernetes CronJob

For production environments, you can deploy as a Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nautilus-data-updater
spec:
  schedule: "0 2 * * *"  # Run daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: updater
            image: your-registry/nautilus-updater:latest
            envFrom:
            - secretRef:
                name: nautilus-cloud-credentials
          restartPolicy: OnFailure
```

### 3. Manual Execution

For testing or one-time updates:

```bash
cd server/scripts
export $(cat .env | xargs)
tsx update-cloud-data.ts
```

## Security Considerations

- The updater requires cloud provider credentials with read-only permissions to clusters
- Credentials are stored securely as environment variables or mounted secrets
- Database connection string should use a user with limited permissions
- No sensitive data is logged during execution

## Monitoring & Troubleshooting

- Logs are stored in the `logs` directory when run via Docker
- Common issues:
  - Authentication failures (check credentials)
  - Network connectivity issues (verify firewall rules)
  - Rate limiting from cloud providers (adjust schedule)

## Extending to Other Cloud Providers

The system is designed to be extensible. To add support for a new Kubernetes provider:

1. Create a new fetch function in `update-cloud-data.ts`
2. Implement the required API client initialization
3. Map the provider's data format to the `ClusterData` interface
4. Add the new provider to the main execution flow

## Configuration Options

See the `.env` file for all available configuration options. Key settings include:

- `DATABASE_URL` - Connection string for the PostgreSQL database
- Cloud provider credentials for each supported platform
- `LOG_LEVEL` - Controls the verbosity of logging
- Schedule configuration (via Dockerfile or Kubernetes CronJob)
# Kubernetes Cluster Data Updater

This component provides automated data collection from GKE, AKS, and EKS cloud providers and updates the PostgreSQL database with the latest information. It's designed to run in a Docker container on a scheduled basis.

## Features

- Collects cluster data from multiple cloud providers:
  - Google Kubernetes Engine (GKE)
  - Azure Kubernetes Service (AKS)
  - Amazon Elastic Kubernetes Service (EKS)
- Enriches cluster data with Kubernetes API information
- Updates database with the latest cluster and namespace information
- Runs automatically on a daily schedule
- Handles data synchronization (adding new clusters, updating existing ones, removing deleted resources)

## Requirements

- Docker and Docker Compose
- Access credentials for your cloud providers (GCP, Azure, AWS)
- PostgreSQL database connection URL

## Setup Instructions

1. Navigate to this directory:
   ```
   cd server/scripts
   ```

2. Run the setup script:
   ```
   ./setup.sh
   ```

3. Edit the `.env` file with your database connection string and cloud provider credentials.

4. Add your Google Cloud service account key to `secrets/google-credentials.json`.

5. Start the container:
   ```
   docker-compose up -d
   ```

## Configuration

The following environment variables can be configured in the `.env` file:

### Database Configuration
- `DATABASE_URL`: PostgreSQL connection string

### Google Cloud Configuration
- `GOOGLE_PROJECT_ID`: Your Google Cloud project ID
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to credentials file (pre-configured in Docker)

### Azure Configuration
- `AZURE_TENANT_ID`: Azure tenant ID
- `AZURE_CLIENT_ID`: Azure client ID
- `AZURE_CLIENT_SECRET`: Azure client secret
- `AZURE_SUBSCRIPTION_ID`: Azure subscription ID

### AWS Configuration
- `AWS_ACCESS_KEY_ID`: AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `AWS_REGION`: AWS region (default: us-west-2)

### Other Settings
- `LOG_LEVEL`: Logging level (debug, info, warn, error)

## Cloud Provider Credentials

For detailed instructions on how to create and configure the required API credentials for each cloud provider, refer to the [Cloud Credentials Guide](CLOUD_CREDENTIALS.md) document. This guide includes step-by-step instructions for:

- Creating a Google Cloud Service Account with the proper permissions
- Setting up an Azure AD Application with the required roles
- Creating an AWS IAM User with the necessary policies

## Data Collection and Mapping

To understand what data is collected from each cloud provider and how it maps to the database schema, refer to the [Data Mapping Guide](DATA_MAPPING.md). This document explains:

- How cloud provider API data is mapped to database fields
- Provider-specific data collection details
- Kubernetes API enrichment process
- How the collected data appears in the dashboard

## Schedule

By default, the data updater runs every day at 2:00 AM UTC. You can modify the schedule by editing the cron configuration in the Dockerfile.

## Manual Execution

To manually trigger the updater:

```
docker-compose exec cloud-data-updater tsx server/scripts/update-cloud-data.ts
```

## Logs

Logs are stored in the `logs` directory, which is mounted to the container.

## Troubleshooting

- Check logs in `logs/cron.log`
- Ensure all credentials are correctly set in the `.env` file
- Verify that the Google Cloud service account key is valid and has the required permissions
- Make sure the database is accessible from the Docker container

## Security Considerations

- Sensitive credentials are stored as environment variables and mounted secret files
- The Docker container runs with minimal permissions
- The script uses secure connection methods to each cloud provider
- Credentials are never logged or exposed
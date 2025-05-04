# Nautilus - Kubernetes Cluster Management Dashboard

Nautilus is a comprehensive dashboard for monitoring and managing Kubernetes clusters across multiple cloud platforms (GKE, AKS, and EKS). It provides extensive visibility into cluster resources, networking components, and dependencies.

## Features

- **Multi-cloud Support**:
  - Full visibility across Google Kubernetes Engine (GKE), Azure Kubernetes Service (AKS), and Amazon EKS
  - Tenant-wide scanning across all projects, subscriptions, and accounts
  - Consolidated metrics and status information

- **Cluster Management**:
  - Real-time cluster status and health monitoring
  - Version management and compatibility tracking
  - Comprehensive resource utilization metrics (CPU, memory, storage)
  - Node status and availability monitoring

- **Namespace Operations**:
  - Detailed namespace management and visualization
  - Resource quota tracking
  - Namespace-level metrics and status

- **Workload Monitoring**:
  - Deployment, StatefulSet, and DaemonSet tracking
  - Resource consumption analysis
  - Health status monitoring
  - Top resource consumers identification

- **Network Resource Management**:
  - Ingress controller tracking (NGINX, Istio, Application Gateway)
  - Load balancer visibility (internal and external)
  - Traffic routes and network topology visualization
  - Network policy enforcement and compliance monitoring

- **Dependency Tracking**:
  - Detection of critical cluster dependencies (Nginx, Velero, etc.)
  - Dependency version and health monitoring
  - Dependency relationship visualization

- **Enhanced User Experience**:
  - Dark mode support
  - Responsive design for desktop and mobile devices
  - Customizable UI with theme support
  - Data export capabilities
  - Advanced filtering and search functionality

- **Security & Authentication**:
  - Optional Okta SSO authentication in production
  - Role-based access control

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL database
- Docker and Docker Compose (for containerized deployment)
- Cloud provider accounts for production use (Google Cloud, Azure, AWS)

### Development Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd nautilus
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up the database:
   - Make sure PostgreSQL is running and accessible
   - Create a `.env` file with your database connection string:
     ```
     DATABASE_URL=postgres://user:password@localhost:5432/nautilus
     ```

4. Initialize the database schema and data:
   ```
   npm run db:push
   npx tsx server/scripts/initialize-cluster-data.ts
   npx tsx server/scripts/initialize-namespace-data.ts
   npx tsx server/scripts/initialize-network-data.ts
   npx tsx server/scripts/initialize-dependencies-data.ts
   ```

5. Start the development server:
   ```
   npm run dev
   ```

6. Access the application at http://localhost:5000

### Production Deployment

#### Containerized Deployment with Docker

The application can be easily deployed using Docker and Docker Compose for development or testing environments.

1. Build and start the application containers:
   ```
   docker-compose up -d
   ```

2. Access the application at http://localhost:5000

#### Cloud Deployment

Nautilus can be deployed to any cloud provider with container orchestration services.

1. **Google Cloud Run**:
   ```bash
   # Build the container
   gcloud builds submit --tag gcr.io/[PROJECT-ID]/nautilus
   
   # Deploy to Cloud Run
   gcloud run deploy nautilus \
     --image gcr.io/[PROJECT-ID]/nautilus \
     --platform managed \
     --allow-unauthenticated \
     --region [REGION] \
     --set-env-vars "DATABASE_URL=[YOUR_DB_URL]"
   ```

2. **Azure Container Apps**:
   ```bash
   # Login to Azure
   az login
   
   # Create a container registry
   az acr create --name nautilusregistry --resource-group myResourceGroup --sku Basic
   
   # Build and push the image
   az acr build --registry nautilusregistry --image nautilus:latest .
   
   # Deploy to Container Apps
   az containerapp create \
     --name nautilus \
     --resource-group myResourceGroup \
     --environment myContainerAppEnv \
     --image nautilusregistry.azurecr.io/nautilus:latest \
     --target-port 5000 \
     --ingress external \
     --env-vars "DATABASE_URL=[YOUR_DB_URL]"
   ```

3. **AWS Elastic Container Service**:
   Deploy using AWS ECS CLI or through the AWS Management Console by creating a task definition and service.

### Environment Variables

#### Core Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `NODE_ENV`: Application environment (`development` or `production`)
- `PORT`: Port number for the server (default: 5000)

#### Authentication Variables
- `OKTA_ISSUER`: Okta issuer URL (optional, for SSO)
- `OKTA_CLIENT_ID`: Okta client ID (optional, for SSO)

#### Cloud Provider Credentials
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to GCP service account key file
- `AZURE_TENANT_ID`: Azure tenant ID
- `AZURE_CLIENT_ID`: Azure client ID
- `AZURE_CLIENT_SECRET`: Azure client secret
- `AWS_ACCESS_KEY_ID`: AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `AWS_REGION`: AWS default region

## Authentication

Nautilus supports two authentication modes:

1. **Development Mode**: Authentication is automatically bypassed
2. **Production Mode**: Optional Okta SSO integration (can be configured in Settings)

## Architecture

### Technology Stack

Nautilus is built with a modern technology stack:

- **Frontend**:
  - React 18 with TypeScript
  - Tailwind CSS for styling
  - shadcn/ui component library
  - React Query for data fetching and state management
  - Recharts for data visualization
  - Wouter for lightweight routing

- **Backend**:
  - Node.js with Express
  - TypeScript for type safety
  - PostgreSQL with Drizzle ORM for data persistence
  - Kubernetes client libraries for cluster interaction
  - Cloud provider SDKs (Google Cloud, Azure, AWS)

- **DevOps**:
  - Docker and Docker Compose for containerization
  - CI/CD support for automated deployments
  - Database migrations with Drizzle Kit

### System Architecture

Nautilus follows a modern full-stack architecture:

1. **Database Layer**:
   - PostgreSQL database stores configuration, cluster data, network resources, and dependencies
   - Drizzle ORM provides type-safe database access

2. **API Layer**:
   - Express.js REST API endpoints
   - Authentication middleware for secure access
   - Data validation with Zod schemas

3. **Service Layer**:
   - Kubernetes API integration services
   - Cloud provider integration services
   - Data processing and transformation services

4. **Presentation Layer**:
   - React components with TypeScript
   - Responsive UI with Tailwind CSS
   - Interactive dashboards and visualizations

5. **Integration Layer**:
   - Kubernetes cluster federation
   - Multi-cloud provider integration
   - External services (monitoring, logging) integration

### Data Flow

1. Cloud provider APIs → Nautilus backend → Database → Frontend UI
2. User actions → Frontend UI → Nautilus API → Cloud provider APIs
3. Scheduled tasks → Data collection services → Database → Frontend UI

## License

[MIT](LICENSE)
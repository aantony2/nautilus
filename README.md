# Nautilus - Kubernetes Cluster Management Dashboard

Nautilus is a comprehensive dashboard for monitoring and managing Kubernetes clusters across multiple cloud platforms (GKE and AKS).

## Features

- Multi-cluster visibility across Google Kubernetes Engine (GKE) and Azure Kubernetes Service (AKS)
- Real-time cluster status and health monitoring
- Detailed namespace management
- Workload monitoring and metrics
- Service status tracking and visualization
- Dark mode support
- Responsive design for desktop and mobile
- Optional Okta SSO authentication in production

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL database
- Docker and Docker Compose (for containerized deployment)

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

4. Initialize the database schema:
   ```
   npm run db:push
   ```

5. Start the development server:
   ```
   npm run dev
   ```

6. Access the application at http://localhost:5000

### Production Deployment with Docker

The application can be easily deployed using Docker and Docker Compose.

1. Build and run the application:
   ```
   docker-compose up -d
   ```

2. Access the application at http://localhost:5000

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (required)
- `NODE_ENV`: Application environment (`development` or `production`)
- `OKTA_ISSUER`: Okta issuer URL (optional, for SSO)
- `OKTA_CLIENT_ID`: Okta client ID (optional, for SSO)

## Authentication

Nautilus supports two authentication modes:

1. **Development Mode**: Authentication is automatically bypassed
2. **Production Mode**: Optional Okta SSO integration (can be configured in Settings)

## Architecture

Nautilus is built with:

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: React Query

## License

[MIT](LICENSE)
#!/bin/bash

# Stop running containers
echo "Stopping any running containers..."
docker-compose down

# Build the containers
echo "Building application containers..."
docker-compose build

# Start the containers in detached mode
echo "Starting application in production mode..."
docker-compose up -d

# Show container status
echo "Deployment complete. Container status:"
docker-compose ps

echo "The application should now be available at http://localhost:5000"
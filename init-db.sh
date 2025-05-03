#!/bin/bash

# Wait for the database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Initialize the database schema
echo "Initializing database schema..."
npm run db:push

# Initialize with sample data if desired
echo "Database initialization complete."
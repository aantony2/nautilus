#!/bin/bash

# manual-update.sh
# Script to manually run the cloud data updater

set -e

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please run setup.sh first."
  exit 1
fi

# Source the environment variables
export $(grep -v '^#' .env | xargs)

echo "Starting manual cloud data update..."

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set in .env file."
  exit 1
fi

# Run the updater script
echo "Running update-cloud-data.ts..."
tsx update-cloud-data.ts

echo "Manual update completed."
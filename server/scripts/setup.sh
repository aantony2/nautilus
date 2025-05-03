#!/bin/bash

# setup.sh
# Script to set up the cloud data updater container

set -e

# Create necessary directories
mkdir -p secrets logs

# Check if .env file exists, create if not
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat > .env << EOL
# Database connection
DATABASE_URL=

# Google Cloud credentials
GOOGLE_PROJECT_ID=

# Azure credentials
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_SUBSCRIPTION_ID=

# AWS credentials
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-west-2

# Log level (debug, info, warn, error)
LOG_LEVEL=info
EOL
  echo ".env file created. Please edit it with your credentials."
else
  echo ".env file already exists."
fi

# Check if Google credentials file exists
if [ ! -f secrets/google-credentials.json ]; then
  echo "Please place your Google Cloud service account key in secrets/google-credentials.json"
  echo "Creating empty placeholder file..."
  echo "{}" > secrets/google-credentials.json
fi

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your database and cloud provider credentials"
echo "2. Add your Google Cloud service account key to secrets/google-credentials.json"
echo "3. Run 'docker-compose up -d' to start the scheduled updater"
echo ""
echo "The container will run the update script daily at 2:00 AM UTC."
echo "You can also manually trigger an update with: docker-compose exec cloud-data-updater tsx server/scripts/update-cloud-data.ts"
FROM node:20-alpine

# Install essential tools
RUN apk add --no-cache python3 py3-pip curl bash jq tzdata

# Add Google Cloud SDK, Azure CLI, and AWS CLI
RUN apk add --no-cache --virtual .build-deps \
    ca-certificates \
    gnupg \
    && curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - \
    && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list \
    && apt-get update && apt-get install -y google-cloud-sdk kubectl \
    && curl -sL https://aka.ms/InstallAzureCLIDeb | bash \
    && pip3 install --no-cache-dir awscli \
    && apk del .build-deps

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY server/ ./server/
COPY shared/ ./shared/

# Install tsx globally for running TypeScript directly
RUN npm install -g tsx

# Make scripts executable
RUN chmod +x server/scripts/update-cloud-data.ts

# Set timezone
ENV TZ=UTC

# Create a cron job to run the script daily at 2 AM
RUN echo "0 2 * * * cd /app && /usr/local/bin/tsx server/scripts/update-cloud-data.ts >> /var/log/cron.log 2>&1" > /etc/crontabs/root

# Start cron in the foreground
CMD ["crond", "-f", "-l", "8"]
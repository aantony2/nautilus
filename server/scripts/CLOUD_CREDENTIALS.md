# Cloud Provider API Credentials Guide

This document explains how to set up API credentials for each supported cloud provider to enable Nautilus to pull Kubernetes cluster data.

## Table of Contents
- [Google Cloud Platform (GCP) / GKE](#google-cloud-platform-gcp--gke)
- [Microsoft Azure / AKS](#microsoft-azure--aks)
- [Amazon Web Services (AWS) / EKS](#amazon-web-services-aws--eks)
- [Security Best Practices](#security-best-practices)

## Google Cloud Platform (GCP) / GKE

### Required Credentials
- **Service Account Key (JSON format)**
- **Google Project ID**

### Step-by-Step Setup

1. **Create a Service Account**:
   ```
   gcloud iam service-accounts create nautilus-k8s-reader \
     --description="Nautilus Kubernetes Reader" \
     --display-name="Nautilus K8s Reader"
   ```

2. **Assign Necessary Permissions**:
   ```
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:nautilus-k8s-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/container.clusterViewer"
   
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:nautilus-k8s-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/container.viewer"
   ```

3. **Create and Download the Key**:
   ```
   gcloud iam service-accounts keys create google-credentials.json \
     --iam-account=nautilus-k8s-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

4. **Configure Nautilus**:
   - Move the `google-credentials.json` file to `server/scripts/secrets/`
   - Set the `GOOGLE_PROJECT_ID` environment variable in your `.env` file

### Required Permissions Explanation
- `roles/container.clusterViewer`: Read-only access to GKE clusters
- `roles/container.viewer`: Read-only access to Kubernetes resources

## Microsoft Azure / AKS

### Required Credentials
- **Azure Tenant ID**
- **Azure Client ID (App ID)**
- **Azure Client Secret**
- **Azure Subscription ID**

### Step-by-Step Setup

1. **Register an Azure AD Application**:
   ```
   az ad app create \
     --display-name "Nautilus-K8S-Reader" \
     --homepage "https://nautilus.local" \
     --identifier-uris "https://nautilus.local"
   ```
   - Note the `appId` in the output (this is your `AZURE_CLIENT_ID`)

2. **Create a Service Principal**:
   ```
   az ad sp create --id <appId>
   ```

3. **Create a Client Secret**:
   ```
   az ad app credential reset \
     --id <appId> \
     --append
   ```
   - Note the `password` in the output (this is your `AZURE_CLIENT_SECRET`)

4. **Grant Permissions to the Service Principal**:
   ```
   az role assignment create \
     --assignee <appId> \
     --role "Azure Kubernetes Service Cluster User Role" \
     --scope /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.ContainerService/managedClusters/<aks-cluster-name>
   ```

5. **Get your Tenant ID and Subscription ID**:
   ```
   az account show --query "{subscriptionId:id, tenantId:tenantId}"
   ```
   - Note the `tenantId` (this is your `AZURE_TENANT_ID`)
   - Note the `subscriptionId` (this is your `AZURE_SUBSCRIPTION_ID`)

6. **Configure Nautilus**:
   - Add all four values to your `.env` file:
     ```
     AZURE_TENANT_ID=your-tenant-id
     AZURE_CLIENT_ID=your-client-id
     AZURE_CLIENT_SECRET=your-client-secret
     AZURE_SUBSCRIPTION_ID=your-subscription-id
     ```

### Required Permissions Explanation
- `Azure Kubernetes Service Cluster User Role`: Allows the service principal to access the K8s API server
- You may also need `Reader` role at the resource group level to list clusters

## Amazon Web Services (AWS) / EKS

### Required Credentials
- **AWS Access Key ID**
- **AWS Secret Access Key**
- **AWS Region**

### Step-by-Step Setup

1. **Create an IAM Policy**:
   - Go to the IAM console
   - Create a policy with the following JSON:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "eks:DescribeCluster",
           "eks:ListClusters",
           "ec2:DescribeInstances",
           "ec2:DescribeImages",
           "ec2:DescribeSubnets",
           "ec2:DescribeSecurityGroups",
           "ec2:DescribeVpcs"
         ],
         "Resource": "*"
       }
     ]
   }
   ```
   - Name it `NautilusEKSReaderPolicy`

2. **Create an IAM User**:
   - Go to the IAM console > Users > Add user
   - Name it `nautilus-eks-reader`
   - Select `Programmatic access` for access type
   - Attach the `NautilusEKSReaderPolicy` policy
   - Complete the user creation

3. **Get Access Keys**:
   - After creating the user, you'll see the access key ID and secret access key
   - Note these values as they won't be shown again
   - Access Key ID goes in `AWS_ACCESS_KEY_ID`
   - Secret Access Key goes in `AWS_SECRET_ACCESS_KEY`

4. **Set AWS Region**:
   - Determine which AWS region your EKS clusters run in
   - Common values are `us-east-1`, `us-west-2`, etc.
   - Set this as `AWS_REGION`

5. **Configure Nautilus**:
   - Add all three values to your `.env` file:
     ```
     AWS_ACCESS_KEY_ID=your-access-key-id
     AWS_SECRET_ACCESS_KEY=your-secret-access-key
     AWS_REGION=your-aws-region
     ```

### Required Permissions Explanation
- `eks:DescribeCluster` and `eks:ListClusters`: Retrieve EKS cluster details
- `ec2:Describe*` permissions: Get node information and network details

## Security Best Practices

1. **Use Least Privilege Access**:
   - Only grant the minimum permissions necessary
   - Consider creating separate credentials for production and development

2. **Regularly Rotate Credentials**:
   - Update API keys and credentials every 90 days
   - Automate rotation when possible

3. **Secure Credential Storage**:
   - Never commit credentials to source control
   - Use environment variables or secret management tools
   - The Docker container mounts secrets as volumes to avoid environment variable leakage

4. **Access Monitoring**:
   - Monitor API usage through cloud provider logs
   - Set up alerts for unusual activity patterns

5. **Network Security**:
   - Consider running the updater within your cloud provider's network
   - Use private endpoints when possible

6. **Disaster Recovery**:
   - Document a process for credential revocation in case of compromise
   - Have a process for quickly regenerating and deploying new credentials
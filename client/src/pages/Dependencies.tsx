import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';

interface ClusterDependency {
  id: number;
  clusterId: string;
  type: string;
  name: string;
  namespace: string;
  version?: string;
  status: string;
  detectedAt: string;
  metadata?: Record<string, any>;
}

export default function Dependencies() {
  const [dependencyType, setDependencyType] = useState<string>('all');
  
  // Fetch all dependencies or filter by type
  const { data: dependencies, isLoading } = useQuery<ClusterDependency[]>({
    queryKey: dependencyType === 'all' 
      ? ['/api/dependencies'] 
      : ['/api/dependencies/type', dependencyType],
    queryFn: async ({ queryKey }) => {
      const endpoint = dependencyType === 'all' 
        ? '/api/dependencies' 
        : `/api/dependencies/type/${dependencyType}`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch dependencies');
      }
      return response.json();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ingress-controller':
        return 'Ingress Controller';
      case 'backup-service':
        return 'Backup Service';
      case 'service-mesh':
        return 'Service Mesh';
      case 'monitoring':
        return 'Monitoring';
      case 'logging':
        return 'Logging';
      default:
        return type.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cluster Dependencies</h1>
          <p className="text-muted-foreground">
            View and manage dependencies detected across all your Kubernetes clusters
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select
            value={dependencyType}
            onValueChange={(value) => setDependencyType(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="ingress-controller">Ingress Controllers</SelectItem>
              <SelectItem value="backup-service">Backup Services</SelectItem>
              <SelectItem value="service-mesh">Service Meshes</SelectItem>
              <SelectItem value="monitoring">Monitoring Tools</SelectItem>
              <SelectItem value="logging">Logging Solutions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {dependencyType === 'all'
              ? 'All Kubernetes Dependencies'
              : `${getTypeLabel(dependencyType)} Dependencies`}
          </CardTitle>
          <CardDescription>
            Dependencies detected in your Kubernetes infrastructure
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !dependencies || dependencies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No dependencies found.</p>
              {dependencyType !== 'all' && (
                <Button 
                  variant="link" 
                  onClick={() => setDependencyType('all')}
                  className="mt-2"
                >
                  View all dependencies
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cluster</TableHead>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detected At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dependencies.map((dependency) => (
                  <TableRow key={dependency.id}>
                    <TableCell className="font-medium">{dependency.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {getTypeLabel(dependency.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/clusters/${dependency.clusterId}`}>
                        <Button variant="link" className="p-0 h-auto">
                          {dependency.clusterId}
                        </Button>
                      </Link>
                    </TableCell>
                    <TableCell>{dependency.namespace}</TableCell>
                    <TableCell>{dependency.version || 'Unknown'}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center">
                              <div className={`h-2 w-2 rounded-full mr-2 ${getStatusColor(dependency.status)}`} />
                              <span className="capitalize">{dependency.status}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {dependency.metadata && (
                              <div>
                                {dependency.metadata.kind === 'Deployment' && (
                                  <p>
                                    Deployment: {dependency.metadata.readyReplicas}/{dependency.metadata.replicas} ready
                                  </p>
                                )}
                                {dependency.metadata.kind === 'DaemonSet' && (
                                  <p>
                                    DaemonSet: {dependency.metadata.readyNodes}/{dependency.metadata.desiredNodes} nodes ready
                                  </p>
                                )}
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>{formatDate(dependency.detectedAt)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Link href={`/dependencies/${dependency.id}`}>
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
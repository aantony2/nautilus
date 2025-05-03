import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { ArrowLeft, Server, Box, Clock, Tag, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

export default function DependencyDetails() {
  const { id } = useParams<{ id: string }>();
  const dependencyId = parseInt(id);

  const { data: dependency, isLoading, error } = useQuery<ClusterDependency>({
    queryKey: ['/api/dependencies', dependencyId],
    queryFn: async () => {
      const response = await fetch(`/api/dependencies/${dependencyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dependency details');
      }
      return response.json();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-black';
      case 'error':
      case 'critical':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ingress-controller':
        return 'Ingress Controller';
      case 'service-mesh':
        return 'Service Mesh';
      case 'monitoring':
        return 'Monitoring';
      case 'logging':
        return 'Logging';
      default:
        return type?.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ') || 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !dependency) {
    return (
      <div className="container mx-auto py-6">
        <Link href="/dependencies">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dependencies
          </Button>
        </Link>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              Failed to load dependency details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Could not find the requested dependency or an error occurred.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center mb-6">
        <Link href="/dependencies">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dependencies
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{dependency.name}</h1>
          <div className="flex items-center mt-1 space-x-2">
            <Badge className={getStatusColor(dependency.status)}>
              {dependency.status === 'Active' ? (
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              )}
              {dependency.status}
            </Badge>
            <Badge variant="outline">{getTypeLabel(dependency.type)}</Badge>
            {dependency.version && <Badge variant="secondary">v{dependency.version}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/clusters/${dependency.clusterId}`}>
            <Button variant="outline">
              <Server className="mr-2 h-4 w-4" />
              View Cluster
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              <Server className="h-4 w-4 inline mr-2" />
              Cluster Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Cluster ID</dt>
                <dd>{dependency.clusterId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Namespace</dt>
                <dd>{dependency.namespace}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              <Box className="h-4 w-4 inline mr-2" />
              Dependency Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Type</dt>
                <dd>{getTypeLabel(dependency.type)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${getStatusColor(dependency.status).split(' ')[0]}`} />
                  {dependency.status}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              <Clock className="h-4 w-4 inline mr-2" />
              Timestamps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Last Detected</dt>
                <dd>{formatDate(dependency.detectedAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dependency Details</CardTitle>
              <CardDescription>
                Detailed information about this {getTypeLabel(dependency.type).toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dependency.metadata?.kind === 'Deployment' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Deployment Information</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      This dependency is managed by a Kubernetes Deployment
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Replicas</p>
                        <p>{dependency.metadata.readyReplicas || 0}/{dependency.metadata.replicas || 0} ready</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {dependency.metadata?.kind === 'DaemonSet' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">DaemonSet Information</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      This dependency is managed by a Kubernetes DaemonSet
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Node Distribution</p>
                        <p>{dependency.metadata.readyNodes || 0}/{dependency.metadata.desiredNodes || 0} nodes ready</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(!dependency.metadata?.kind || 
                (dependency.metadata.kind !== 'Deployment' && dependency.metadata.kind !== 'DaemonSet')) && (
                <p>No additional details available for this dependency.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="metadata" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Raw Metadata</CardTitle>
              <CardDescription>
                Technical metadata associated with this dependency
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dependency.metadata && Object.keys(dependency.metadata).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(dependency.metadata).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="font-medium">{key}</TableCell>
                        <TableCell>
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p>No metadata available for this dependency.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
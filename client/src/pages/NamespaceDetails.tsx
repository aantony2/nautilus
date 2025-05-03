import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NamespaceData } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Clock, Tag, FileCode, Box, Database, BarChart2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';

export default function NamespaceDetails() {
  const [, setLocation] = useLocation();
  const location = useLocation()[0];
  const namespaceId = location.split('/').pop();

  const { data: namespace, isLoading } = useQuery<NamespaceData>({
    queryKey: ['/api/namespaces', namespaceId],
    queryFn: async () => {
      return apiRequest(`/api/namespaces/${namespaceId}`);
    }
  });

  // Potentially fetch additional data related to this namespace
  const { data: podsData, isLoading: isPodsLoading } = useQuery({
    queryKey: ['/api/namespaces', namespaceId, 'pods'],
    queryFn: async () => {
      return apiRequest(`/api/namespaces/${namespaceId}/pods`);
    }
  });

  // Resource quotas and limits
  const { data: resourceQuotas, isLoading: isResourceQuotasLoading } = useQuery({
    queryKey: ['/api/namespaces', namespaceId, 'quotas'],
    queryFn: async () => {
      return apiRequest(`/api/namespaces/${namespaceId}/quotas`);
    }
  });

  // Events related to this namespace
  const { data: events, isLoading: isEventsLoading } = useQuery({
    queryKey: ['/api/namespaces', namespaceId, 'events'],
    queryFn: async () => {
      return apiRequest(`/api/namespaces/${namespaceId}/events`);
    }
  });

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'secondary'; // Use secondary instead of success
      case 'terminating':
        return 'destructive';
      case 'pending':
        return 'default'; // Use default instead of warning
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Skeleton className="h-9 w-24 mr-2" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!namespace) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <h2 className="text-2xl mb-4">Namespace not found</h2>
        <p className="text-muted-foreground mb-6">The requested namespace could not be found.</p>
        <Button onClick={() => setLocation('/namespaces')}>Back to Namespaces</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Button 
            variant="outline" 
            size="icon" 
            className="mr-4" 
            onClick={() => setLocation('/namespaces')}
          >
            <ChevronLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              {namespace.name}
              <Badge 
                className="ml-3" 
                variant={getStatusColor(namespace.status) as "default" | "destructive" | "outline" | "secondary"}
              >
                {namespace.status}
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              Cluster: {namespace.clusterName}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {/* Actions relevant to namespaces could go here */}
          <Button variant="outline">
            Edit Labels
          </Button>
          <Button variant="outline">
            Configure Quotas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock size={16} className="mr-2" />
              Age
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{namespace.age}</p>
            <p className="text-xs text-muted-foreground">Created: {new Date(namespace.createdAt).toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Box size={16} className="mr-2" />
              Pods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{namespace.podCount}</p>
            <p className="text-xs text-muted-foreground">Running in this namespace</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Database size={16} className="mr-2" />
              Resource Quota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{namespace.resourceQuota ? 'Enabled' : 'None'}</p>
            <p className="text-xs text-muted-foreground">
              {namespace.resourceQuota ? 'Resource limits are enforced' : 'No resource limits defined'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-4 md:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="labels">Labels & Annotations</TabsTrigger>
          <TabsTrigger value="pods">Pods</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="quotas">Resource Quotas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Namespace Overview</CardTitle>
              <CardDescription>
                Details about namespace {namespace.name} in cluster {namespace.clusterName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Phase</h3>
                  <p>{namespace.phase}</p>
                </div>
                <Separator />
                <div>
                  <h3 className="font-medium mb-2">Status</h3>
                  <Badge variant={getStatusColor(namespace.status) as "default" | "destructive" | "outline" | "secondary"}>
                    {namespace.status}
                  </Badge>
                </div>
                <Separator />
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p>
                    This namespace contains {namespace.podCount} pods and was created on {' '}
                    {new Date(namespace.createdAt).toLocaleDateString()}.
                    {namespace.resourceQuota && ' Resource quotas are enforced for this namespace.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="labels" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Labels & Annotations</CardTitle>
              <CardDescription>
                Metadata associated with this namespace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <Tag size={18} className="mr-2" />
                    Labels
                  </h3>
                  {Object.keys(namespace.labels).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(namespace.labels).map(([key, value]) => (
                        <div key={key} className="flex items-center p-3 border rounded-md bg-muted/50">
                          <div className="flex-1">
                            <p className="font-medium">{key}</p>
                            <p className="text-sm text-muted-foreground">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No labels found for this namespace</p>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <FileCode size={18} className="mr-2" />
                    Annotations
                  </h3>
                  {Object.keys(namespace.annotations).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(namespace.annotations).map(([key, value]) => (
                        <div key={key} className="flex items-center p-3 border rounded-md bg-muted/50">
                          <div className="flex-1">
                            <p className="font-medium">{key}</p>
                            <p className="text-sm text-muted-foreground">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No annotations found for this namespace</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pods" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pods</CardTitle>
              <CardDescription>
                Pods running in this namespace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPodsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : podsData && podsData.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-3 px-4 font-medium">Name</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Restarts</th>
                        <th className="text-left py-3 px-4 font-medium">Age</th>
                        <th className="text-left py-3 px-4 font-medium">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {podsData.map((pod: any) => (
                        <tr key={pod.name} className="border-t">
                          <td className="py-3 px-4">{pod.name}</td>
                          <td className="py-3 px-4">
                            <Badge variant={
                              pod.status === 'Running' ? 'secondary' : 
                              pod.status === 'Pending' ? 'default' : 
                              'destructive'
                            }>{pod.status}</Badge>
                          </td>
                          <td className="py-3 px-4">{pod.restarts}</td>
                          <td className="py-3 px-4">{pod.age}</td>
                          <td className="py-3 px-4">{pod.ip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground">No pods found in this namespace</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="events" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Events</CardTitle>
              <CardDescription>
                Recent events in this namespace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEventsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : events && events.length > 0 ? (
                <div className="space-y-4">
                  {events.map((event: any, index: number) => (
                    <div key={index} className={`p-4 border rounded-md ${
                      event.type === 'Warning' ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30' :
                      event.type === 'Error' ? 'border-red-300 bg-red-50 dark:bg-red-950/30' :
                      'border-green-300 bg-green-50 dark:bg-green-950/30'
                    }`}>
                      <div className="flex items-start">
                        <div>
                          <p className="font-medium">{event.message}</p>
                          <div className="flex items-center mt-2 text-sm text-muted-foreground">
                            <p>{event.reason}</p>
                            <span className="mx-2">•</span>
                            <p>{event.source}</p>
                            <span className="mx-2">•</span>
                            <p>{event.time}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No events found for this namespace</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="quotas" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Resource Quotas</CardTitle>
              <CardDescription>
                Resource limits applied to this namespace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isResourceQuotasLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : resourceQuotas ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <BarChart2 size={18} className="mr-2" />
                      Compute Resources
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-md">
                        <p className="font-medium mb-1">CPU</p>
                        <div className="flex justify-between text-sm">
                          <span>Used: {resourceQuotas.cpu?.used || '0'}</span>
                          <span>Limit: {resourceQuotas.cpu?.limit || 'Unlimited'}</span>
                        </div>
                        {resourceQuotas.cpu && (
                          <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                            <div className="bg-primary h-2.5 rounded-full" style={{ 
                              width: `${resourceQuotas.cpu.percentage || 0}%` 
                            }}></div>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4 border rounded-md">
                        <p className="font-medium mb-1">Memory</p>
                        <div className="flex justify-between text-sm">
                          <span>Used: {resourceQuotas.memory?.used || '0'}</span>
                          <span>Limit: {resourceQuotas.memory?.limit || 'Unlimited'}</span>
                        </div>
                        {resourceQuotas.memory && (
                          <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                            <div className="bg-primary h-2.5 rounded-full" style={{ 
                              width: `${resourceQuotas.memory.percentage || 0}%` 
                            }}></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3">Object Counts</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {resourceQuotas.objects ? (
                        Object.entries(resourceQuotas.objects).map(([key, value]: [string, any]) => (
                          <div key={key} className="p-3 border rounded-md bg-muted/50">
                            <p className="text-sm text-muted-foreground">{key}</p>
                            <p className="font-medium">{value.used} / {value.limit || '∞'}</p>
                          </div>
                        ))
                      ) : (
                        <p className="col-span-4 text-muted-foreground">No object quotas defined</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground mb-4">No resource quotas configured for this namespace</p>
                  <Button variant="outline">Configure Resource Quotas</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
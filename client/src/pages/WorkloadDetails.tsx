import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, Clock, 
  Server, CpuIcon, HardDrive, Database, Scale,
  BarChart2, Box, Layers, GitBranch, FileCode
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';

// Basic workload information interface
interface WorkloadDetails {
  id: string;
  name: string;
  namespace: string;
  cluster: string;
  clusterName: string;
  type: 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'Job' | 'CronJob';
  status: string;
  createdAt: string;
  replicas: {
    desired: number;
    current: number;
    updated: number;
    available: number;
  };
  pods: {
    name: string;
    status: string;
    restarts: number;
    age: string;
    node: string;
    ip: string;
  }[];
  resources: {
    requests: {
      cpu: string;
      memory: string;
    };
    limits: {
      cpu: string;
      memory: string;
    };
    total: {
      cpu: string;
      memory: string;
    };
  };
  labels: Record<string, string>;
  annotations: Record<string, string>;
  events: {
    type: string;
    reason: string;
    message: string;
    count: number;
    time: string;
    source: string;
  }[];
  strategy?: {
    type: string;
    rollingUpdate?: {
      maxSurge: string;
      maxUnavailable: string;
    };
  };
  template?: {
    containers: {
      name: string;
      image: string;
      ports: {
        name: string;
        containerPort: number;
        protocol: string;
      }[];
      env: {
        name: string;
        value?: string;
        valueFrom?: {
          configMapKeyRef?: {
            name: string;
            key: string;
          };
          secretKeyRef?: {
            name: string;
            key: string;
          };
        };
      }[];
      volumeMounts: {
        name: string;
        mountPath: string;
        readOnly: boolean;
      }[];
    }[];
  };
  volumes?: {
    name: string;
    type: string;
    details: Record<string, string>;
  }[];
}

export default function WorkloadDetails() {
  const [, setLocation] = useLocation();
  const location = useLocation()[0];
  const workloadId = location.split('/').pop();

  const { data: workload, isLoading } = useQuery<WorkloadDetails>({
    queryKey: ['/api/workloads', workloadId],
    queryFn: async () => {
      return apiRequest(`/api/workloads/${workloadId}`);
    }
  });

  // Get metrics for this workload
  const { data: metrics, isLoading: isMetricsLoading } = useQuery({
    queryKey: ['/api/workloads', workloadId, 'metrics'],
    queryFn: async () => {
      return apiRequest(`/api/workloads/${workloadId}/metrics`);
    },
    enabled: !!workload,
  });

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status.toLowerCase()) {
      case 'running':
      case 'available':
      case 'ready':
        return 'secondary';
      case 'pending':
      case 'progressing':
        return 'default';
      case 'failed':
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'Deployment':
        return 'Deployment';
      case 'StatefulSet':
        return 'StatefulSet';
      case 'DaemonSet':
        return 'DaemonSet';
      case 'Job':
        return 'Job';
      case 'CronJob':
        return 'CronJob';
      default:
        return type;
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

  if (!workload) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <h2 className="text-2xl mb-4">Workload not found</h2>
        <p className="text-muted-foreground mb-6">The requested workload could not be found.</p>
        <Button onClick={() => setLocation('/workloads')}>Back to Workloads</Button>
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
            onClick={() => setLocation('/workloads')}
          >
            <ChevronLeft size={18} />
          </Button>
          <div>
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">{workload.name}</h1>
              <Badge 
                className="ml-3" 
                variant={getStatusColor(workload.status)}
              >
                {workload.status}
              </Badge>
              <Badge 
                className="ml-2" 
                variant="outline"
              >
                {getTypeLabel(workload.type)}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Namespace: {workload.namespace} | Cluster: {workload.clusterName}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            Scale
          </Button>
          <Button variant="outline">
            Restart
          </Button>
          <Button variant="default">
            Edit YAML
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock size={16} className="mr-2" />
              Age
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{workload.pods[0]?.age || 'N/A'}</p>
            <p className="text-xs text-muted-foreground">Created: {new Date(workload.createdAt).toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Layers size={16} className="mr-2" />
              Replicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{workload.replicas.current} / {workload.replicas.desired}</p>
            <p className="text-xs text-muted-foreground">Available: {workload.replicas.available} | Updated: {workload.replicas.updated}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CpuIcon size={16} className="mr-2" />
              CPU
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{workload.resources.requests.cpu}</p>
            <p className="text-xs text-muted-foreground">Limit: {workload.resources.limits.cpu}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <HardDrive size={16} className="mr-2" />
              Memory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{workload.resources.requests.memory}</p>
            <p className="text-xs text-muted-foreground">Limit: {workload.resources.limits.memory}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pods">Pods</TabsTrigger>
          <TabsTrigger value="containers">Containers</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Workload Overview</CardTitle>
              <CardDescription>
                Details about {workload.type} {workload.name} in namespace {workload.namespace}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Basic Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span>{workload.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={getStatusColor(workload.status)}>{workload.status}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Namespace:</span>
                          <span>{workload.namespace}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cluster:</span>
                          <span>{workload.clusterName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created:</span>
                          <span>{new Date(workload.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2">Replicas</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Desired:</span>
                          <span>{workload.replicas.desired}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current:</span>
                          <span>{workload.replicas.current}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Updated:</span>
                          <span>{workload.replicas.updated}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Available:</span>
                          <span>{workload.replicas.available}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Resource Requirements</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">CPU</p>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Requests: {workload.resources.requests.cpu}</span>
                            <span>Limits: {workload.resources.limits.cpu}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2.5">
                            <div className="bg-primary h-2.5 rounded-full" style={{ 
                              width: metrics?.cpu?.percentage ? `${metrics.cpu.percentage}%` : '0%'
                            }}></div>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Memory</p>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Requests: {workload.resources.requests.memory}</span>
                            <span>Limits: {workload.resources.limits.memory}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2.5">
                            <div className="bg-primary h-2.5 rounded-full" style={{ 
                              width: metrics?.memory?.percentage ? `${metrics.memory.percentage}%` : '0%'
                            }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {workload.strategy && (
                      <div>
                        <h3 className="font-medium mb-2">Update Strategy</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <span>{workload.strategy.type}</span>
                          </div>
                          {workload.strategy.rollingUpdate && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Max Surge:</span>
                                <span>{workload.strategy.rollingUpdate.maxSurge}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Max Unavailable:</span>
                                <span>{workload.strategy.rollingUpdate.maxUnavailable}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <GitBranch size={18} className="mr-2" />
                    Labels
                  </h3>
                  {Object.keys(workload.labels).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(workload.labels).map(([key, value]) => (
                        <div key={key} className="flex items-center p-3 border rounded-md bg-muted/50">
                          <div className="flex-1">
                            <p className="font-medium">{key}</p>
                            <p className="text-sm text-muted-foreground">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No labels found for this workload</p>
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
                Pods managed by this {workload.type.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workload.pods.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-3 px-4 font-medium">Name</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Restarts</th>
                        <th className="text-left py-3 px-4 font-medium">Age</th>
                        <th className="text-left py-3 px-4 font-medium">Node</th>
                        <th className="text-left py-3 px-4 font-medium">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workload.pods.map((pod) => (
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
                          <td className="py-3 px-4">{pod.node}</td>
                          <td className="py-3 px-4">{pod.ip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground">No pods found for this workload</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="containers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Containers</CardTitle>
              <CardDescription>
                Container details for this workload
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workload.template?.containers.map((container, index) => (
                <div key={container.name} className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium">{container.name}</h3>
                    <Badge variant="outline">{container.image}</Badge>
                  </div>
                  
                  <div className="space-y-6">
                    {container.ports.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Ports</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {container.ports.map((port, i) => (
                            <div key={i} className="p-3 border rounded-md bg-muted/50">
                              <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Name:</span>
                                <span className="text-xs">{port.name || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Port:</span>
                                <span className="text-xs">{port.containerPort}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Protocol:</span>
                                <span className="text-xs">{port.protocol}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {container.env.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Environment Variables</h4>
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="text-left py-2 px-4 text-xs font-medium">Name</th>
                                <th className="text-left py-2 px-4 text-xs font-medium">Value</th>
                                <th className="text-left py-2 px-4 text-xs font-medium">Source</th>
                              </tr>
                            </thead>
                            <tbody>
                              {container.env.map((env, i) => (
                                <tr key={i} className="border-t">
                                  <td className="py-2 px-4 text-xs">{env.name}</td>
                                  <td className="py-2 px-4 text-xs">
                                    {env.value || (
                                      env.valueFrom?.configMapKeyRef ? 
                                        '(ConfigMap value)' : 
                                        env.valueFrom?.secretKeyRef ? 
                                          '(Secret value)' : '-'
                                    )}
                                  </td>
                                  <td className="py-2 px-4 text-xs">
                                    {env.valueFrom?.configMapKeyRef ? 
                                      `ConfigMap: ${env.valueFrom.configMapKeyRef.name}/${env.valueFrom.configMapKeyRef.key}` : 
                                      env.valueFrom?.secretKeyRef ? 
                                        `Secret: ${env.valueFrom.secretKeyRef.name}/${env.valueFrom.secretKeyRef.key}` : 
                                        'Direct value'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {container.volumeMounts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Volume Mounts</h4>
                        <div className="grid grid-cols-1 gap-3">
                          {container.volumeMounts.map((volume, i) => (
                            <div key={i} className="p-3 border rounded-md bg-muted/50 flex justify-between">
                              <div>
                                <p className="text-sm font-medium">{volume.name}</p>
                                <p className="text-xs text-muted-foreground">Mount: {volume.mountPath}</p>
                              </div>
                              <Badge variant="outline">{volume.readOnly ? 'Read Only' : 'Read Write'}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {index < workload.template.containers.length - 1 && <Separator className="my-6" />}
                </div>
              ))}
              
              {!workload.template?.containers.length && (
                <p className="text-muted-foreground">No container information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="events" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Events</CardTitle>
              <CardDescription>
                Recent events for this workload
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workload.events.length > 0 ? (
                <div className="space-y-4">
                  {workload.events.map((event, index) => (
                    <div key={index} className={`p-4 border rounded-md ${
                      event.type === 'Warning' ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30' :
                      event.type === 'Error' ? 'border-red-300 bg-red-50 dark:bg-red-950/30' :
                      'border-green-300 bg-green-50 dark:bg-green-950/30'
                    }`}>
                      <div className="flex items-start">
                        <div className="flex-1">
                          <p className="font-medium">{event.message}</p>
                          <div className="flex items-center mt-2 text-sm text-muted-foreground">
                            <p>{event.reason}</p>
                            <span className="mx-2">•</span>
                            <p>Count: {event.count}</p>
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
                <p className="text-muted-foreground">No events found for this workload</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="yaml" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>YAML Definition</CardTitle>
              <CardDescription>
                YAML configuration for {workload.type} {workload.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-2 right-2 z-10"
                  onClick={() => {
                    // Copy code implementation
                    navigator.clipboard.writeText("YAML content would be here");
                  }}
                >
                  Copy
                </Button>
                <div className="overflow-x-auto bg-slate-950 p-4 rounded-md">
                  <pre className="text-green-400 text-sm">
                    <code>{`apiVersion: apps/v1
kind: ${workload.type}
metadata:
  name: ${workload.name}
  namespace: ${workload.namespace}
  labels:
${Object.entries(workload.labels).map(([k, v]) => `    ${k}: ${v}`).join('\n')}
spec:
  replicas: ${workload.replicas.desired}
  selector:
    matchLabels:
      app: ${workload.name}
  template:
    metadata:
      labels:
        app: ${workload.name}
    spec:
      containers:
${workload.template?.containers.map(container => `      - name: ${container.name}
        image: ${container.image}
        ports:
${container.ports.map(port => `        - name: ${port.name || 'port'}
          containerPort: ${port.containerPort}
          protocol: ${port.protocol}`).join('\n')}`).join('\n')}
`}</code>
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="metrics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Metrics</CardTitle>
              <CardDescription>
                Performance metrics for this workload
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isMetricsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : metrics ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <BarChart2 size={18} className="mr-2" />
                      Resource Utilization
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">CPU Usage</h4>
                        <div className="p-4 border rounded-md">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Usage: {metrics.cpu?.current || '0'}</span>
                            <span className="text-sm">Limit: {workload.resources.limits.cpu}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2.5">
                            <div className="bg-primary h-2.5 rounded-full" style={{ 
                              width: `${metrics.cpu?.percentage || 0}%` 
                            }}></div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {metrics.cpu?.percentage || 0}% of limit
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Memory Usage</h4>
                        <div className="p-4 border rounded-md">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Usage: {metrics.memory?.current || '0'}</span>
                            <span className="text-sm">Limit: {workload.resources.limits.memory}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2.5">
                            <div className="bg-primary h-2.5 rounded-full" style={{ 
                              width: `${metrics.memory?.percentage || 0}%` 
                            }}></div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {metrics.memory?.percentage || 0}% of limit
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {metrics.history && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Historical Usage</h3>
                      <div className="border rounded-md p-4">
                        <p className="text-muted-foreground mb-4">Historical metrics visualization would be displayed here</p>
                        <div className="flex items-center justify-center">
                          <div className="h-40 w-full bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                            Resource usage chart
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground mb-4">No metrics available for this workload</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
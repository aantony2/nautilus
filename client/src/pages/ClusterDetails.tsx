import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Terminal, Server, Database, HardDrive, Activity, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function ClusterDetails() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: cluster, isLoading, refetch } = useQuery({
    queryKey: ['/api/clusters', params.id],
  });

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['/api/clusters', params.id, 'metrics'],
  });

  const refreshData = () => {
    refetch();
    refetchMetrics();
    toast({
      title: "Data refreshed",
      description: "Cluster information has been updated",
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-slate-800 border-b border-slate-700 shadow-sm p-4">
            <Skeleton className="h-8 w-64" />
          </header>
          <main className="flex-1 overflow-y-auto bg-slate-900 p-4">
            <Skeleton className="h-full w-full" />
          </main>
        </div>
      </div>
    );
  }

  if (!cluster) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-slate-800 border-b border-slate-700 shadow-sm p-4">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => setLocation('/')}>
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-slate-900 p-4 flex items-center justify-center">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-2">Cluster Not Found</h2>
                  <p className="text-slate-400 mb-4">The requested cluster could not be found.</p>
                  <Button onClick={() => setLocation('/')}>Return to Dashboard</Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-slate-800 border-b border-slate-700 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => setLocation('/')}>
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </Button>
              <h1 className="text-lg font-semibold text-white ml-2">{cluster.name}</h1>
              <Badge variant={cluster.status === 'Healthy' ? 'success' : cluster.status === 'Warning' ? 'warning' : 'destructive'} className="ml-2">
                {cluster.status}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshData}
                disabled={isLoading || metricsLoading}
              >
                <RefreshCw className={`h-5 w-5 ${isLoading || metricsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-900 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">Provider</p>
                    <p className="text-2xl font-bold">{cluster.provider}</p>
                  </div>
                  <Server className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">Kubernetes Version</p>
                    <p className="text-2xl font-bold">{cluster.version}</p>
                  </div>
                  <Terminal className="h-6 w-6 text-info" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">Region</p>
                    <p className="text-2xl font-bold">{cluster.region}</p>
                  </div>
                  <HardDrive className="h-6 w-6 text-secondary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">Created At</p>
                    <p className="text-2xl font-bold">{new Date(cluster.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Activity className="h-6 w-6 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="nodes">Nodes</TabsTrigger>
              <TabsTrigger value="workloads">Workloads</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="istio">Istio</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Resource Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {metricsLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">CPU</span>
                            <span className="text-sm text-muted-foreground">{metrics.cpu.used}/{metrics.cpu.total} cores</span>
                          </div>
                          <Progress value={metrics.cpu.percentage} className="h-2" />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Memory</span>
                            <span className="text-sm text-muted-foreground">{metrics.memory.used}/{metrics.memory.total} GB</span>
                          </div>
                          <Progress value={metrics.memory.percentage} className="h-2" />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Storage</span>
                            <span className="text-sm text-muted-foreground">{metrics.storage.used}/{metrics.storage.total} GB</span>
                          </div>
                          <Progress value={metrics.storage.percentage} className="h-2" />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Cluster Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Nodes</dt>
                        <dd className="text-lg font-semibold mt-1">{cluster.nodesReady}/{cluster.nodesTotal}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Namespaces</dt>
                        <dd className="text-lg font-semibold mt-1">{cluster.namespaces}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Pods</dt>
                        <dd className="text-lg font-semibold mt-1">{cluster.podsRunning}/{cluster.podsTotal}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Services</dt>
                        <dd className="text-lg font-semibold mt-1">{cluster.services}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Deployments</dt>
                        <dd className="text-lg font-semibold mt-1">{cluster.deployments}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Ingresses</dt>
                        <dd className="text-lg font-semibold mt-1">{cluster.ingresses}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cluster.events?.map((event, i) => (
                      <div key={i} className="flex items-start space-x-4 p-2 rounded-md bg-slate-800">
                        <div className={`w-2 h-2 mt-2 rounded-full ${getStatusColor(event.severity)}`} />
                        <div>
                          <p className="font-medium">{event.message}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()} • {event.source}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!cluster.events || cluster.events.length === 0) && (
                      <p className="text-muted-foreground text-center py-4">No recent events</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="nodes">
              <Card>
                <CardHeader>
                  <CardTitle>Nodes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cluster.nodes?.map((node, i) => (
                      <div key={i} className="p-4 rounded-md bg-slate-800">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${node.status === 'Ready' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <h3 className="font-medium">{node.name}</h3>
                          </div>
                          <Badge>{node.role}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                          <div>
                            <p className="text-sm text-muted-foreground">CPU</p>
                            <p className="font-medium">{node.cpu}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Memory</p>
                            <p className="font-medium">{node.memory}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Pods</p>
                            <p className="font-medium">{node.pods}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!cluster.nodes || cluster.nodes.length === 0) && (
                      <p className="text-muted-foreground text-center py-4">No nodes available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="workloads">
              <Card>
                <CardHeader>
                  <CardTitle>Workloads</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Workloads content would go here */}
                  <p className="text-muted-foreground text-center py-4">Workload details will be displayed here</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle>Services</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Services content would go here */}
                  <p className="text-muted-foreground text-center py-4">Service details will be displayed here</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="istio">
              <Card>
                <CardHeader>
                  <CardTitle>Istio Service Mesh</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Istio content would go here */}
                  <p className="text-muted-foreground text-center py-4">Istio service mesh details will be displayed here</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

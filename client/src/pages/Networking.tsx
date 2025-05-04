import { useQuery } from "@tanstack/react-query";
// Sidebar is now managed by App.tsx
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Router, Globe, Network, Check, AlertTriangle, Activity, ExternalLink, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Networking() {
  const { toast } = useToast();
  
  const refreshData = () => {
    toast({
      title: "Network data refreshed",
      description: "Network data has been updated",
    });
  };
  
  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-white">Networking</h1>
              <p className="text-sm text-slate-400">View all networking details</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={refreshData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4">
          <Tabs defaultValue="ingress">
            <TabsList className="mb-6">
              <TabsTrigger value="ingress">Ingress</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="routing">Routing</TabsTrigger>
              <TabsTrigger value="policies">Network Policies</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ingress">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-800 border-slate-700 shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Ingress Controllers</CardTitle>
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <CardDescription>Manage external access to your services</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Cluster</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Endpoints</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">
                            nginx-ingress-controller
                            <div className="text-xs text-slate-400 mt-1">kube-system namespace</div>
                          </TableCell>
                          <TableCell>gke-prod-cluster1</TableCell>
                          <TableCell>Nginx Ingress</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Check size={16} className="text-green-500 mr-1" />
                              <span>Healthy</span>
                            </div>
                          </TableCell>
                          <TableCell>7</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            istio-ingressgateway
                            <div className="text-xs text-slate-400 mt-1">istio-system namespace</div>
                          </TableCell>
                          <TableCell>gke-prod-cluster1</TableCell>
                          <TableCell>Istio Gateway</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Check size={16} className="text-green-500 mr-1" />
                              <span>Healthy</span>
                            </div>
                          </TableCell>
                          <TableCell>3</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            traefik-controller
                            <div className="text-xs text-slate-400 mt-1">traefik namespace</div>
                          </TableCell>
                          <TableCell>aks-dev-cluster2</TableCell>
                          <TableCell>Traefik</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <AlertTriangle size={16} className="text-yellow-500 mr-1" />
                              <span>Warning</span>
                            </div>
                          </TableCell>
                          <TableCell>5</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            kong-ingress
                            <div className="text-xs text-slate-400 mt-1">kong namespace</div>
                          </TableCell>
                          <TableCell>eks-stage-cluster1</TableCell>
                          <TableCell>Kong</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Check size={16} className="text-green-500 mr-1" />
                              <span>Healthy</span>
                            </div>
                          </TableCell>
                          <TableCell>2</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" size="sm">
                        <ExternalLink size={14} className="mr-2" />
                        View All Ingress Controllers
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800 border-slate-700 shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Load Balancers</CardTitle>
                      <Router className="h-5 w-5 text-info" />
                    </div>
                    <CardDescription>External traffic distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Traffic</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">
                            frontend-lb
                            <div className="text-xs text-slate-400 mt-1">gke-prod-cluster1</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-950 text-blue-300 border-blue-800">
                              External
                            </Badge>
                          </TableCell>
                          <TableCell>35.233.178.12</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Check size={16} className="text-green-500 mr-1" />
                              <span>Active</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Activity size={14} className="text-blue-400 mr-2" />
                              <span>3.7k req/s</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            api-gateway-lb
                            <div className="text-xs text-slate-400 mt-1">gke-prod-cluster1</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-950 text-blue-300 border-blue-800">
                              External
                            </Badge>
                          </TableCell>
                          <TableCell>35.233.179.87</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Check size={16} className="text-green-500 mr-1" />
                              <span>Active</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Activity size={14} className="text-blue-400 mr-2" />
                              <span>1.2k req/s</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            internal-services-lb
                            <div className="text-xs text-slate-400 mt-1">aks-dev-cluster2</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-purple-950 text-purple-300 border-purple-800">
                              Internal
                            </Badge>
                          </TableCell>
                          <TableCell>10.0.12.45</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Check size={16} className="text-green-500 mr-1" />
                              <span>Active</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Activity size={14} className="text-blue-400 mr-2" />
                              <span>856 req/s</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            admin-portal-lb
                            <div className="text-xs text-slate-400 mt-1">eks-stage-cluster1</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-950 text-blue-300 border-blue-800">
                              External
                            </Badge>
                          </TableCell>
                          <TableCell>54.192.145.78</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <AlertTriangle size={16} className="text-yellow-500 mr-1" />
                              <span>Degraded</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Activity size={14} className="text-yellow-400 mr-2" />
                              <span>235 req/s</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" size="sm">
                        <ExternalLink size={14} className="mr-2" />
                        View All Load Balancers
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="services">
              <Card className="bg-slate-800 border-slate-700 shadow-md">
                <CardHeader>
                  <CardTitle>Service Mesh</CardTitle>
                  <CardDescription>Service-to-service communication</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-slate-400 py-20">
                    Service mesh monitoring will be implemented in future updates
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="routing">
              <div className="grid grid-cols-1 gap-6">
                <Card className="bg-slate-800 border-slate-700 shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Traffic Routes</CardTitle>
                      <Network className="h-5 w-5 text-secondary" />
                    </div>
                    <CardDescription>Traffic routing and management rules</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">
                            api-gateway-route
                            <div className="text-xs text-slate-400 mt-1">gke-prod-cluster1</div>
                          </TableCell>
                          <TableCell>External</TableCell>
                          <TableCell>api-gateway.default.svc</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-950 text-green-300 border-green-800">
                              HTTP
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Check size={16} className="text-green-500 mr-1" />
                              <span>Active</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            frontend-backend-route
                            <div className="text-xs text-slate-400 mt-1">gke-prod-cluster1</div>
                          </TableCell>
                          <TableCell>frontend.default.svc</TableCell>
                          <TableCell>backend-api.default.svc</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-950 text-blue-300 border-blue-800">
                              gRPC
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Check size={16} className="text-green-500 mr-1" />
                              <span>Active</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            admin-portal-route
                            <div className="text-xs text-slate-400 mt-1">eks-stage-cluster1</div>
                          </TableCell>
                          <TableCell>External</TableCell>
                          <TableCell>admin-portal.default.svc</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-950 text-green-300 border-green-800">
                              HTTP
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <AlertTriangle size={16} className="text-yellow-500 mr-1" />
                              <span>Degraded</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            microservice-a-b-route
                            <div className="text-xs text-slate-400 mt-1">aks-dev-cluster2</div>
                          </TableCell>
                          <TableCell>service-a.apps.svc</TableCell>
                          <TableCell>service-b.apps.svc</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-purple-950 text-purple-300 border-purple-800">
                              TCP
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Check size={16} className="text-green-500 mr-1" />
                              <span>Active</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            auth-service-route
                            <div className="text-xs text-slate-400 mt-1">gke-prod-cluster1</div>
                          </TableCell>
                          <TableCell>gateway.istio-system.svc</TableCell>
                          <TableCell>auth.security.svc</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-950 text-green-300 border-green-800">
                              HTTP
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Check size={16} className="text-green-500 mr-1" />
                              <span>Active</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" size="sm">
                        <ExternalLink size={14} className="mr-2" />
                        View All Routes
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700 shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Route Metrics</CardTitle>
                      <Activity className="h-5 w-5 text-accent" />
                    </div>
                    <CardDescription>Traffic flow statistics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      <div className="bg-slate-700/50 p-4 rounded-lg">
                        <div className="text-xs text-slate-400 mb-1">Total Routes</div>
                        <div className="text-2xl font-bold">17</div>
                        <div className="text-xs text-green-400 mt-1 flex items-center">
                          <Check size={12} className="mr-1" /> All healthy
                        </div>
                      </div>
                      
                      <div className="bg-slate-700/50 p-4 rounded-lg">
                        <div className="text-xs text-slate-400 mb-1">Total Traffic</div>
                        <div className="text-2xl font-bold">8.4k req/s</div>
                        <div className="text-xs text-green-400 mt-1 flex items-center">
                          <span className="text-green-400 mr-1">↑</span> 12% from yesterday
                        </div>
                      </div>
                      
                      <div className="bg-slate-700/50 p-4 rounded-lg">
                        <div className="text-xs text-slate-400 mb-1">Avg. Latency</div>
                        <div className="text-2xl font-bold">187ms</div>
                        <div className="text-xs text-red-400 mt-1 flex items-center">
                          <span className="text-red-400 mr-1">↑</span> 15ms increase
                        </div>
                      </div>
                      
                      <div className="bg-slate-700/50 p-4 rounded-lg">
                        <div className="text-xs text-slate-400 mb-1">Error Rate</div>
                        <div className="text-2xl font-bold">0.12%</div>
                        <div className="text-xs text-green-400 mt-1 flex items-center">
                          <span className="text-green-400 mr-1">↓</span> 0.03% decrease
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="policies">
              <Card className="bg-slate-800 border-slate-700 shadow-md">
                <CardHeader>
                  <CardTitle>Network Policies</CardTitle>
                  <CardDescription>Control traffic flow between pods</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-slate-400 py-20">
                    Network policy management will be implemented in future updates
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
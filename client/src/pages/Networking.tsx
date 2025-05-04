import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FilterIcon,
  Search,
  Server,
  Shield,
  TrendingUp,
  Workflow,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { NetworkIngressControllerData, NetworkLoadBalancerData, NetworkRouteData, NetworkPolicyData } from '@shared/schema';

interface NetworkResourcesData {
  ingressControllers: NetworkIngressControllerData[];
  loadBalancers: NetworkLoadBalancerData[];
  routes: NetworkRouteData[];
  policies: NetworkPolicyData[];
}

export default function Networking() {
  const [activeTab, setActiveTab] = useState('ingress');
  const [searchQuery, setSearchQuery] = useState('');
  const [clusterFilter, setClusterFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Fetch network resources
  const { data, isLoading, error } = useQuery<NetworkResourcesData>({
    queryKey: ['/api/network/resources'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch clusters for filter dropdown
  const { data: clusters } = useQuery({
    queryKey: ['/api/clusters'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filter and search functions
  const getFilteredIngressControllers = () => {
    if (!data?.ingressControllers) return [];
    
    return data.ingressControllers.filter(ic => {
      const matchesSearch = 
        searchQuery === '' || 
        ic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ic.namespace.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ic.type.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCluster = clusterFilter === 'all' || ic.clusterId === clusterFilter;
      const matchesType = typeFilter === 'all' || ic.type === typeFilter;
      
      return matchesSearch && matchesCluster && matchesType;
    });
  };

  const getFilteredLoadBalancers = () => {
    if (!data?.loadBalancers) return [];
    
    return data.loadBalancers.filter(lb => {
      const matchesSearch = 
        searchQuery === '' || 
        lb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lb.namespace.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lb.type.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCluster = clusterFilter === 'all' || lb.clusterId === clusterFilter;
      const matchesType = typeFilter === 'all' || lb.type === typeFilter;
      
      return matchesSearch && matchesCluster && matchesType;
    });
  };

  const getFilteredRoutes = () => {
    if (!data?.routes) return [];
    
    return data.routes.filter(route => {
      const matchesSearch = 
        searchQuery === '' || 
        route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.protocol.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCluster = clusterFilter === 'all' || route.clusterId === clusterFilter;
      
      return matchesSearch && matchesCluster;
    });
  };

  const getFilteredPolicies = () => {
    if (!data?.policies) return [];
    
    return data.policies.filter(policy => {
      const matchesSearch = 
        searchQuery === '' || 
        policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.namespace.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.direction.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCluster = clusterFilter === 'all' || policy.clusterId === clusterFilter;
      const matchesType = typeFilter === 'all' || policy.type === typeFilter;
      
      return matchesSearch && matchesCluster && matchesType;
    });
  };

  // Get unique ingress controller types for filter
  const getIngressControllerTypes = () => {
    if (!data?.ingressControllers) return [];
    const types = new Set(data.ingressControllers.map(ic => ic.type));
    return Array.from(types);
  };

  // Get unique load balancer types for filter
  const getLoadBalancerTypes = () => {
    if (!data?.loadBalancers) return [];
    const types = new Set(data.loadBalancers.map(lb => lb.type));
    return Array.from(types);
  };

  // Get unique policy types for filter
  const getPolicyTypes = () => {
    if (!data?.policies) return [];
    const types = new Set(data.policies.map(policy => policy.type));
    return Array.from(types);
  };

  // Helper function to get cluster name from ID
  const getClusterName = (clusterId: string) => {
    if (!clusters) return clusterId;
    const cluster = clusters.find(c => c.id === clusterId);
    return cluster ? cluster.name : clusterId;
  };

  // Render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    let icon = null;

    if (status.toLowerCase() === 'healthy' || status.toLowerCase() === 'active') {
      variant = "default";
      icon = <CheckCircle2 className="mr-1 h-3 w-3" />;
    } else if (status.toLowerCase() === 'warning' || status.toLowerCase() === 'degraded') {
      variant = "outline";
      icon = <AlertCircle className="mr-1 h-3 w-3 text-yellow-500" />;
    } else if (status.toLowerCase() === 'error' || status.toLowerCase() === 'failed') {
      variant = "destructive";
      icon = <AlertCircle className="mr-1 h-3 w-3" />;
    }

    return (
      <Badge variant={variant} className="flex items-center">
        {icon}
        {status}
      </Badge>
    );
  };

  // Render protocol badge with appropriate color
  const renderProtocolBadge = (protocol: string) => {
    let color = "";
    
    switch(protocol.toLowerCase()) {
      case 'tcp':
        color = "bg-blue-100 text-blue-800 border-blue-300";
        break;
      case 'udp':
        color = "bg-purple-100 text-purple-800 border-purple-300";
        break;
      case 'http':
        color = "bg-green-100 text-green-800 border-green-300";
        break;
      case 'https':
        color = "bg-emerald-100 text-emerald-800 border-emerald-300";
        break;
      case 'grpc':
        color = "bg-orange-100 text-orange-800 border-orange-300";
        break;
      default:
        color = "bg-gray-100 text-gray-800 border-gray-300";
    }
    
    return (
      <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${color}`}>
        {protocol.toUpperCase()}
      </span>
    );
  };

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Network Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load network resources. Please try refreshing the page.</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Network Resources</h1>
      
      <div className="flex items-center mb-6">
        <div className="relative flex-1 mr-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search network resources..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select value={clusterFilter} onValueChange={setClusterFilter}>
          <SelectTrigger className="w-[180px] mr-4">
            <SelectValue placeholder="Filter by Cluster" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clusters</SelectItem>
            {clusters && clusters.map(cluster => (
              <SelectItem key={cluster.id} value={cluster.id}>{cluster.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeTab === 'ingress' && (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {getIngressControllerTypes().map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {activeTab === 'loadbalancers' && (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {getLoadBalancerTypes().map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {activeTab === 'policies' && (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {getPolicyTypes().map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="ingress" className="flex items-center">
            <Server className="mr-2 h-4 w-4" />
            Ingress Controllers
          </TabsTrigger>
          <TabsTrigger value="loadbalancers" className="flex items-center">
            <ExternalLink className="mr-2 h-4 w-4" />
            Load Balancers
          </TabsTrigger>
          <TabsTrigger value="routes" className="flex items-center">
            <Workflow className="mr-2 h-4 w-4" />
            Traffic Routes
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center">
            <Shield className="mr-2 h-4 w-4" />
            Network Policies
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="ingress">
          <Card>
            <CardHeader>
              <CardTitle>Ingress Controllers</CardTitle>
              <CardDescription>
                Network ingress controllers managing external access to services
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Cluster</TableHead>
                      <TableHead>Namespace</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Traffic</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredIngressControllers().length > 0 ? (
                      getFilteredIngressControllers().map((controller) => (
                        <TableRow key={controller.id}>
                          <TableCell className="font-medium">{controller.name}</TableCell>
                          <TableCell>{getClusterName(controller.clusterId)}</TableCell>
                          <TableCell>{controller.namespace}</TableCell>
                          <TableCell>{controller.type}</TableCell>
                          <TableCell>{renderStatusBadge(controller.status)}</TableCell>
                          <TableCell>{controller.version}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                              {controller.trafficHandled.toLocaleString()} req/s
                            </div>
                          </TableCell>
                          <TableCell>{controller.ipAddress}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                          No ingress controllers found matching the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="loadbalancers">
          <Card>
            <CardHeader>
              <CardTitle>Load Balancers</CardTitle>
              <CardDescription>
                Load balancers distributing network traffic to ensure availability and reliability
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Cluster</TableHead>
                      <TableHead>Namespace</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Traffic</TableHead>
                      <TableHead>IP Addresses</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredLoadBalancers().length > 0 ? (
                      getFilteredLoadBalancers().map((lb) => (
                        <TableRow key={lb.id}>
                          <TableCell className="font-medium">{lb.name}</TableCell>
                          <TableCell>{getClusterName(lb.clusterId)}</TableCell>
                          <TableCell>{lb.namespace}</TableCell>
                          <TableCell>{lb.type}</TableCell>
                          <TableCell>{renderStatusBadge(lb.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                              {lb.trafficHandled.toLocaleString()} Mbps
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {lb.ipAddresses.map((ip, index) => (
                                <Badge key={index} variant="outline">{ip}</Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          No load balancers found matching the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="routes">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Routes</CardTitle>
              <CardDescription>
                Network traffic routes between services and external destinations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Cluster</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredRoutes().length > 0 ? (
                      getFilteredRoutes().map((route) => (
                        <TableRow key={route.id}>
                          <TableCell className="font-medium">{route.name}</TableCell>
                          <TableCell>{getClusterName(route.clusterId)}</TableCell>
                          <TableCell>{route.source}</TableCell>
                          <TableCell>{route.destination}</TableCell>
                          <TableCell>{renderProtocolBadge(route.protocol)}</TableCell>
                          <TableCell>{renderStatusBadge(route.status)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          No routes found matching the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <CardTitle>Network Policies</CardTitle>
              <CardDescription>
                Rules controlling traffic flow between pods and network endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Cluster</TableHead>
                      <TableHead>Namespace</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredPolicies().length > 0 ? (
                      getFilteredPolicies().map((policy) => (
                        <TableRow key={policy.id}>
                          <TableCell className="font-medium">{policy.name}</TableCell>
                          <TableCell>{getClusterName(policy.clusterId)}</TableCell>
                          <TableCell>{policy.namespace}</TableCell>
                          <TableCell>{policy.type}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {policy.direction}
                            </Badge>
                          </TableCell>
                          <TableCell>{renderStatusBadge(policy.status)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          No policies found matching the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
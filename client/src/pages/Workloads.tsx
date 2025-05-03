import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
// Sidebar is now managed by App.tsx
import WorkloadStatus from "@/components/dashboard/WorkloadStatus";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Search, ExternalLink, Server, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { WorkloadData } from "@shared/schema";

export default function Workloads() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: workloads, isLoading, refetch } = useQuery<WorkloadData>({
    queryKey: ['/api/workloads'],
  });
  
  const refreshData = () => {
    refetch();
    
    toast({
      title: "Workloads refreshed",
      description: "Workload data has been updated",
    });
  };
  
  // Filter top consumers based on search query
  const filteredWorkloads = workloads ? {
    ...workloads,
    topConsumers: searchQuery.trim() ? 
      workloads.topConsumers.filter(consumer => 
        consumer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        consumer.cluster.toLowerCase().includes(searchQuery.toLowerCase())
      ) : 
      workloads.topConsumers
  } : undefined;
  
  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with integrated search */}
        <header className="bg-slate-800 border-b border-slate-700 shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-white mr-4">Workloads</h1>
              <div className="relative rounded-md w-64">
                <Input
                  type="text"
                  placeholder="Search workloads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white pl-10"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4">
          <div className="grid grid-cols-1 gap-6">
            {isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <WorkloadStatus workloads={filteredWorkloads ?? {
                summary: {
                  deployments: [],
                  statefulSets: []
                },
                distribution: {
                  daemonSets: {
                    GKE: 0,
                    AKS: 0
                  }
                },
                topConsumers: []
              }} />
            )}
            {!isLoading && filteredWorkloads?.topConsumers && (
              <div className="text-xs text-slate-500 mt-2">
                Showing {filteredWorkloads.topConsumers.length} of {workloads?.topConsumers.length || 0} top consumers
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Server className="mr-2 h-5 w-5" />
                      Deployments
                    </div>
                    <Badge className="ml-2">
                      {workloads?.summary.deployments.reduce((sum, item) => sum + item.total, 0) || 0}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Kubernetes deployment workloads</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (
                    <div className="rounded-md border border-slate-700">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700 hover:bg-slate-700">
                            <TableHead className="w-[50%]">Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Cluster</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Example deployment rows */}
                          {[
                            { id: 'nginx-deployment', name: 'nginx-deployment', status: 'Running', cluster: 'gke-prod-cluster1' },
                            { id: 'frontend-app', name: 'frontend-app', status: 'Running', cluster: 'gke-prod-cluster1' },
                            { id: 'backend-api', name: 'backend-api', status: 'Warning', cluster: 'aks-dev-cluster1' }
                          ].map((deployment) => (
                            <TableRow key={deployment.id} className="border-slate-700 hover:bg-slate-700">
                              <TableCell className="font-medium">{deployment.name}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  deployment.status === 'Running' ? 'secondary' : 
                                  deployment.status === 'Warning' ? 'default' : 
                                  'destructive'
                                }>
                                  {deployment.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{deployment.cluster}</TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setLocation(`/workloads/${deployment.id}`)}
                                >
                                  <ExternalLink size={16} className="mr-1" />
                                  Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Database className="mr-2 h-5 w-5" />
                      StatefulSets
                    </div>
                    <Badge className="ml-2">
                      {workloads?.summary.statefulSets.reduce((sum, item) => sum + item.total, 0) || 0}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Stateful application workloads</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (
                    <div className="rounded-md border border-slate-700">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700 hover:bg-slate-700">
                            <TableHead className="w-[50%]">Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Cluster</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Example statefulset rows */}
                          {[
                            { id: 'mongodb', name: 'mongodb', status: 'Running', cluster: 'gke-prod-cluster1' },
                            { id: 'postgresql', name: 'postgresql', status: 'Running', cluster: 'gke-prod-cluster1' },
                            { id: 'kafka', name: 'kafka', status: 'Error', cluster: 'aks-dev-cluster1' }
                          ].map((statefulset) => (
                            <TableRow key={statefulset.id} className="border-slate-700 hover:bg-slate-700">
                              <TableCell className="font-medium">{statefulset.name}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  statefulset.status === 'Running' ? 'secondary' : 
                                  statefulset.status === 'Warning' ? 'default' : 
                                  'destructive'
                                }>
                                  {statefulset.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{statefulset.cluster}</TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setLocation(`/workloads/${statefulset.id}`)}
                                >
                                  <ExternalLink size={16} className="mr-1" />
                                  Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
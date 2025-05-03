import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { exportObjectsToCsv } from "@/lib/csvExport";
import {
  DownloadIcon,
  Filter,
  Search,
  TagIcon,
  Server,
  CheckCircle,
  AlertTriangle,
  MessagesSquare,
  FileDown
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getQueryFn } from "@/lib/queryClient";
import { NamespaceData } from "@shared/schema";

export default function Namespaces() {
  const [location, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clusterFilter, setClusterFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch namespaces data
  const { data: namespaces, isLoading } = useQuery({
    queryKey: ["/api/namespaces"],
    queryFn: getQueryFn({ on401: "throw" }),
  }) as { data: NamespaceData[] | undefined, isLoading: boolean };

  // Filter namespaces based on search and filters
  const filteredNamespaces = useMemo(() => {
    if (!namespaces || !Array.isArray(namespaces)) return [] as NamespaceData[];

    return namespaces.filter((ns: NamespaceData) => {
      // Filter by status
      if (statusFilter !== "all" && ns.status !== statusFilter) {
        return false;
      }

      // Filter by cluster
      if (clusterFilter !== "all" && ns.clusterName !== clusterFilter) {
        return false;
      }

      // Search in name, labels, or annotations
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = ns.name.toLowerCase().includes(query);
        const labelMatch = Object.entries(ns.labels || {}).some(
          ([key, value]) =>
            key.toLowerCase().includes(query) ||
            String(value).toLowerCase().includes(query)
        );
        const annotationMatch = Object.entries(ns.annotations || {}).some(
          ([key, value]) =>
            key.toLowerCase().includes(query) ||
            String(value).toLowerCase().includes(query)
        );

        return nameMatch || labelMatch || annotationMatch;
      }

      return true;
    });
  }, [namespaces, statusFilter, clusterFilter, searchQuery]);

  // CSV export functionality
  const exportToCSV = useCallback(() => {
    if (!filteredNamespaces || filteredNamespaces.length === 0) return;

    // Define CSV headers
    const headers = [
      "Name",
      "Cluster",
      "Status",
      "Age",
      "Phase",
      "Pod Count",
      "Resource Quota",
      "Labels",
      "Annotations",
    ];

    // Define keys to extract from namespaces
    const keys = [
      "name",
      "clusterName",
      "status",
      "age",
      "phase",
      "podCount",
      "resourceQuota",
      "labels",
      "annotations",
    ] as const;

    // Transform function to handle special cases
    const transform = (key: string, value: any) => {
      if (key === 'resourceQuota') {
        return value ? "Yes" : "No";
      }
      if (key === 'labels' || key === 'annotations') {
        return Object.entries(value as Record<string, string>)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");
      }
      return value;
    };

    // Use the utility to export
    exportObjectsToCsv(
      filteredNamespaces,
      headers,
      keys as unknown as (keyof NamespaceData)[],
      "kubernetes-namespaces",
      transform as (key: keyof NamespaceData, value: any) => string | number | boolean
    );
  }, [filteredNamespaces]);
  


  // Get unique clusters for filtering
  const uniqueClusters = useMemo(() => {
    if (!namespaces || !Array.isArray(namespaces)) return [] as string[];
    
    const clusters = new Set<string>();
    namespaces.forEach(ns => clusters.add(ns.clusterName));
    return Array.from(clusters);
  }, [namespaces]);

  const renderLabels = useCallback((labels: Record<string, string>) => {
    return Object.entries(labels)
      .slice(0, 3) // Show only first 3 labels
      .map(([key, value]) => (
        <Badge key={key} className="mr-1 mb-1 bg-indigo-600 hover:bg-indigo-700">
          {key}={value}
        </Badge>
      ));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-50">
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-slate-800 border-b border-slate-700 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center">
                <h1 className="text-lg font-semibold text-white">Namespaces</h1>
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto bg-slate-900 p-4">
            <Skeleton className="h-96 w-full" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with integrated search */}
        <header className="bg-slate-800 border-b border-slate-700 shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-white mr-4">Namespaces</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportToCSV}
                disabled={filteredNamespaces.length === 0}
                className="border-primary text-primary hover:bg-primary/10"
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4">
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <CardTitle className="text-xl text-white">
                    All Namespaces
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <div className="relative w-64 mr-2">
                      <Input
                        type="text"
                        placeholder="Search namespaces..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white pl-10"
                      />
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                    
                    <div className="flex gap-2">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px] bg-slate-700 border-slate-600 text-white">
                          <div className="flex items-center">
                            <Filter className="h-3.5 w-3.5 mr-2" />
                            <SelectValue placeholder="Status" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600 text-white">
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Terminating">Terminating</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={clusterFilter}
                        onValueChange={setClusterFilter}
                      >
                        <SelectTrigger className="w-[130px] bg-slate-700 border-slate-600 text-white">
                          <div className="flex items-center">
                            <Server className="h-3.5 w-3.5 mr-2" />
                            <SelectValue placeholder="Cluster" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600 text-white">
                          <SelectItem value="all">All Clusters</SelectItem>
                          {uniqueClusters.map((cluster) => (
                            <SelectItem key={cluster} value={cluster}>
                              {cluster}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={exportToCSV}
                        title="Export to CSV"
                        className="ml-2 text-slate-400 hover:text-white"
                      >
                        <FileDown className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                      <thead className="bg-slate-900">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Cluster
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Age
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Pod Count
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Labels
                          </th>
                          <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-slate-800 divide-y divide-slate-700">
                        {filteredNamespaces.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-4 text-center text-slate-400">
                              No namespaces found matching your filters.
                            </td>
                          </tr>
                        ) : (
                          filteredNamespaces.map((namespace: NamespaceData) => (
                            <tr key={`${namespace.clusterId}-${namespace.name}`} className="hover:bg-slate-700">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md bg-slate-700">
                                    <MessagesSquare className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-white">{namespace.name}</div>
                                    <div className="text-xs text-slate-400">{namespace.clusterId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                {namespace.clusterName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {namespace.status === "Active" ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                      <span className="w-2 h-2 rounded-full bg-green-500 mr-1 self-center"></span>Active
                                    </span>
                                  ) : (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                      <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1 self-center"></span>Terminating
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                {namespace.age}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                {namespace.podCount}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {renderLabels(namespace.labels)}
                                  {Object.keys(namespace.labels).length > 3 && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge className="bg-slate-600 hover:bg-slate-500">
                                            +{Object.keys(namespace.labels).length - 3} more
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-slate-700 border-slate-600 p-2 text-xs max-w-md">
                                          <div className="flex flex-wrap gap-1">
                                            {Object.entries(namespace.labels)
                                              .slice(3)
                                              .map(([key, value]) => (
                                                <Badge
                                                  key={key}
                                                  className="bg-indigo-600"
                                                >
                                                  {key}={value}
                                                </Badge>
                                              ))}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Button 
                                  variant="link" 
                                  className="text-primary"
                                  onClick={() => setLocation(`/namespaces/${namespace.id}`)}
                                >
                                  Details
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-2 text-right">
                  Showing {filteredNamespaces.length} of {Array.isArray(namespaces) ? namespaces.length : 0} namespaces
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-xl text-white">Namespace Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-750 rounded-lg p-4 border border-slate-700">
                    <h3 className="text-white font-semibold mb-2 flex items-center">
                      <TagIcon className="h-4 w-4 mr-1 text-blue-400" />
                      Labels Overview
                    </h3>
                    <Separator className="my-2 bg-slate-700" />
                    <div className="mt-2 space-y-2">
                      {Array.isArray(namespaces) && namespaces.length > 0 && (() => {
                        const labelCounts: Record<string, number> = {};
                        namespaces.forEach((ns: NamespaceData) => {
                          Object.keys(ns.labels || {}).forEach((label) => {
                            labelCounts[label] = (labelCounts[label] || 0) + 1;
                          });
                        });
                        
                        // Get top 5 labels
                        return Object.entries(labelCounts)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([label, count]) => (
                            <div 
                              key={label} 
                              className="flex justify-between items-center text-sm"
                            >
                              <Badge className="bg-indigo-600">{label}</Badge>
                              <span className="text-slate-400">
                                {count} {count === 1 ? 'namespace' : 'namespaces'}
                              </span>
                            </div>
                          ));
                      })()}
                    </div>
                  </div>
                  
                  <div className="bg-slate-750 rounded-lg p-4 border border-slate-700">
                    <h3 className="text-white font-semibold mb-2 flex items-center">
                      <Server className="h-4 w-4 mr-1 text-blue-400" />
                      Namespace Count by Cluster
                    </h3>
                    <Separator className="my-2 bg-slate-700" />
                    <div className="mt-2 space-y-2">
                      {Array.isArray(namespaces) && namespaces.length > 0 && (() => {
                        const clusterCounts: Record<string, number> = {};
                        namespaces.forEach((ns: NamespaceData) => {
                          clusterCounts[ns.clusterName] = (clusterCounts[ns.clusterName] || 0) + 1;
                        });
                        
                        // Get all clusters
                        return Object.entries(clusterCounts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([cluster, count]) => (
                            <div 
                              key={cluster} 
                              className="flex justify-between items-center text-sm"
                            >
                              <span className="text-white">{cluster}</span>
                              <span className="text-slate-400">
                                {count} {count === 1 ? 'namespace' : 'namespaces'}
                              </span>
                            </div>
                          ));
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
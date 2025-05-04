import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
// Sidebar is now managed by App.tsx
import ClusterStatusTable from "@/components/dashboard/ClusterStatusTable";
import { Skeleton } from "@/components/ui/skeleton";
import { ClusterData } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDown, Search, Filter, Server } from "lucide-react";
import { exportObjectsToCsv } from "@/lib/csvExport";

export default function Clusters() {
  const [, setLocation] = useLocation();
  const [providerFilter, setProviderFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: clusters, isLoading } = useQuery<ClusterData[]>({
    queryKey: ['/api/clusters'],
  });
  
  const handleExportCsv = () => {
    if (!clusters || clusters.length === 0) return;
    
    const headers = ["Name", "ID", "Provider", "Version", "Status", "Region", "Nodes Ready", "Nodes Total", "Pods Running", "Pods Total", "Created At"];
    const keys = ["name", "id", "provider", "version", "status", "region", "nodesReady", "nodesTotal", "podsRunning", "podsTotal", "createdAt"];
    
    exportObjectsToCsv(
      filteredClusters,
      headers,
      keys as any,
      "clusters-export",
    );
  };
  
  // Get unique regions for filter
  const regionsSet = new Set((clusters || []).map(cluster => cluster.region));
  const regions = Array.from(regionsSet);
  
  const filteredClusters = (clusters || []).filter(cluster => {
    const matchesSearch = searchQuery === "" || 
                         cluster.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cluster.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cluster.region.toLowerCase().includes(searchQuery.toLowerCase());
    
    return (providerFilter === "all" || cluster.provider === providerFilter) && 
           (regionFilter === "all" || cluster.region === regionFilter) &&
           matchesSearch;
  });
  
  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with integrated search */}
        <header className="bg-slate-800 border-b border-slate-700 shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-white">Clusters</h1>
              <p className="text-sm text-slate-400">View and manage all nodes</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white mb-4">
                  <div className="flex items-center justify-between w-full">
                    <span>Clusters</span>
                    <div className="flex items-center space-x-2">
                      <Select value={providerFilter} onValueChange={setProviderFilter}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-[130px]">
                          <div className="flex items-center">
                            <Filter className="h-3.5 w-3.5 mr-2" />
                            <SelectValue placeholder="Provider" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600 text-white">
                          <SelectItem value="all">All Providers</SelectItem>
                          <SelectItem value="GKE">GKE</SelectItem>
                          <SelectItem value="AKS">AKS</SelectItem>
                          <SelectItem value="EKS">EKS</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={regionFilter} onValueChange={setRegionFilter}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-[130px]">
                          <div className="flex items-center">
                            <Server className="h-3.5 w-3.5 mr-2" />
                            <SelectValue placeholder="Region" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600 text-white">
                          <SelectItem value="all">All Regions</SelectItem>
                          {regions.map(region => (
                            <SelectItem key={region} value={region}>{region}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleExportCsv}
                        title="Export to CSV"
                        className="text-slate-400 hover:text-white"
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="relative w-full mt-4">
                    <Input
                      type="text"
                      placeholder="Search clusters..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white pl-10 w-full"
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClusterStatusTable 
                  clusters={clusters || []} 
                  filteredClusters={filteredClusters}
                />
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ServerIcon, Search, FileDown, ArrowUpRight, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { ClusterData } from "@shared/schema";
import { exportObjectsToCsv } from "@/lib/csvExport";

interface ClusterStatusTableProps {
  clusters: ClusterData[];
}

export default function ClusterStatusTable({ clusters }: ClusterStatusTableProps) {
  const [, setLocation] = useLocation();
  const [providerFilter, setProviderFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleExportCsv = () => {
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
  const regionsSet = new Set(clusters.map(cluster => cluster.region));
  const regions = Array.from(regionsSet);
  
  const filteredClusters = clusters.filter(cluster => {
    const matchesSearch = searchQuery === "" || 
                         cluster.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cluster.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cluster.region.toLowerCase().includes(searchQuery.toLowerCase());
    
    return (providerFilter === "all" || cluster.provider === providerFilter) && 
           (regionFilter === "all" || cluster.region === regionFilter) &&
           matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-1 self-center"></span>Healthy
        </span>;
      case 'warning':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
          <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1 self-center"></span>Warning
        </span>;
      case 'critical':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
          <span className="w-2 h-2 rounded-full bg-red-500 mr-1 self-center"></span>Critical
        </span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          <span className="w-2 h-2 rounded-full bg-blue-500 mr-1 self-center"></span>{status}
        </span>;
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <ServerIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="relative w-64 mr-2">
            <Input
              type="text"
              placeholder="Search clusters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white pl-10"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
          
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300 w-[180px]">
              <SelectValue placeholder="All Providers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              <SelectItem value="GKE">GKE</SelectItem>
              <SelectItem value="AKS">AKS</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300 w-[180px]">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
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
            className="ml-2 text-slate-400 hover:text-white"
          >
            <FileDown className="h-5 w-5" />
          </Button>
        </div>
        <div className="text-xs text-slate-400">
          Showing {filteredClusters.length} of {clusters.length} clusters
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClusters.length === 0 ? (
          <div className="col-span-3 bg-slate-800 rounded-lg p-6 text-center text-slate-400">
            No clusters found matching your criteria.
          </div>
        ) : (
          filteredClusters.map(cluster => (
            <Card 
              key={cluster.id} 
              className="bg-slate-800 border-slate-700 hover:bg-slate-750 cursor-pointer transition-colors overflow-hidden"
              onClick={() => setLocation(`/clusters/${cluster.id}`)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-md bg-slate-700">
                      <ServerIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-white">{cluster.name}</div>
                      <div className="text-xs text-slate-400">{cluster.id}</div>
                    </div>
                  </div>
                  {getStatusIcon(cluster.status)}
                </div>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    {cluster.provider === "GKE" ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" className="mr-2">
                        <path fill="#4285F4" d="M12 7.5L7.5 12 12 16.5 16.5 12 12 7.5z"/>
                        <path fill="#EA4335" d="M12 1.5L3 12l9 10.5 9-10.5L12 1.5zm0 6L16.5 12 12 16.5 7.5 12 12 7.5z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" className="mr-2">
                        <path fill="#0078D4" d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.5L17.5 8 12 11.5 6.5 8 12 4.5z"/>
                        <path fill="#50E6FF" d="M12 11.5L6.5 8v6.5l5.5 3 5.5-3V8L12 11.5z"/>
                      </svg>
                    )}
                    <span className="text-sm text-white">{cluster.provider}</span>
                  </div>
                  <div className="text-sm text-white">{cluster.region}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-slate-700 rounded-md p-2">
                    <div className="text-xs text-slate-400 mb-1">Version</div>
                    <div className="text-sm text-white">{cluster.version}</div>
                    <div className={`text-xs ${cluster.versionStatus === 'Up to date' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {cluster.versionStatus}
                    </div>
                  </div>
                  
                  <div className="bg-slate-700 rounded-md p-2">
                    <div className="text-xs text-slate-400 mb-1">Nodes</div>
                    <div className="text-sm text-white">{cluster.nodesReady}/{cluster.nodesTotal}</div>
                    <div className="h-1.5 w-full bg-slate-600 rounded-full mt-1">
                      <div 
                        className="bg-info h-1.5 rounded-full" 
                        style={{ width: `${(cluster.nodesReady / cluster.nodesTotal) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-700 rounded-md p-2 mb-3">
                  <div className="text-xs text-slate-400 mb-1">Pods</div>
                  <div className="text-sm text-white">{cluster.podsRunning}/{cluster.podsTotal}</div>
                  <div className="h-1.5 w-full bg-slate-600 rounded-full mt-1">
                    <div 
                      className="bg-info h-1.5 rounded-full" 
                      style={{ width: `${(cluster.podsRunning / cluster.podsTotal) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <div>
                    {getStatusBadge(cluster.status)}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-primary hover:bg-slate-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/clusters/${cluster.id}`);
                    }}
                  >
                    <span className="mr-1">Details</span>
                    <ArrowUpRight size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

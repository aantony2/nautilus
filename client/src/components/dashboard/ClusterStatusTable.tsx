import { useState } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ServerIcon, Search, FileDown } from "lucide-react";
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
              <SelectItem value="EKS">EKS</SelectItem>
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

      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Cluster
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Provider
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Version
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Nodes
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Pods
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Health
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Region
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {filteredClusters.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-slate-400">
                    No clusters found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredClusters.map(cluster => (
                  <tr key={cluster.id} className="hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md bg-slate-700">
                          <ServerIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{cluster.name}</div>
                          <div className="text-xs text-slate-400">{cluster.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        <div className="flex items-center">
                          {cluster.provider === "GKE" ? (
                            <svg viewBox="0 0 24 24" width="16" height="16" className="mr-2">
                              <path fill="#4285F4" d="M12 7.5L7.5 12 12 16.5 16.5 12 12 7.5z"/>
                              <path fill="#EA4335" d="M12 1.5L3 12l9 10.5 9-10.5L12 1.5zm0 6L16.5 12 12 16.5 7.5 12 12 7.5z"/>
                            </svg>
                          ) : cluster.provider === "AKS" ? (
                            <svg viewBox="0 0 24 24" width="16" height="16" className="mr-2">
                              <path fill="#0078D4" d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.5L17.5 8 12 11.5 6.5 8 12 4.5z"/>
                              <path fill="#50E6FF" d="M12 11.5L6.5 8v6.5l5.5 3 5.5-3V8L12 11.5z"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" width="16" height="16" className="mr-2">
                              <path fill="#FF9900" d="M18.7 10.3L17 9.2l-1.7-1-1.7-1.1V4.9l1.7-1 1.7-1 1.7 1.1v2.2zm0 8.8l-1.7-1-1.7-1-1.7-1.1v-2.2l1.7-1 1.7-1 1.7 1.1v2.2z"/>
                              <path fill="#FF9900" d="M12 13.6L10.3 12.5 8.6 11.5 6.9 10.4V8.2l1.7-1 1.7-1L12 7.3v2.1zm0 8.8l-1.7-1-1.7-1L6.9 19.3v-2.2l1.7-1 1.7-1L12 16.1v2.2z"/>
                              <path fill="#232F3E" d="M12.8 13.2L12 12.7l-.8-.5V11l.8-.5.8-.5.8.5v1.2zm8.8-5L20.8 7.7 20 7.2v-1.2l.8-.5.8-.5.8.5v1.2z"/>
                            </svg>
                          )}
                          <span>{cluster.provider}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{cluster.version}</div>
                      <div className={`text-xs ${cluster.versionStatus === 'Up to date' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {cluster.versionStatus}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {cluster.nodesReady}/{cluster.nodesTotal}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{cluster.podsRunning}/{cluster.podsTotal}</div>
                      <div className="h-1.5 w-24 bg-slate-700 rounded-full mt-1">
                        <div 
                          className="bg-info h-1.5 rounded-full" 
                          style={{ width: `${(cluster.podsRunning / cluster.podsTotal) * 100}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(cluster.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {cluster.region}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button 
                        variant="link" 
                        className="text-primary"
                        onClick={() => setLocation(`/clusters/${cluster.id}`)}
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
    </div>
  );
}
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
// Sidebar is now managed by App.tsx
import ClusterStatusTable from "@/components/dashboard/ClusterStatusTable";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { ClusterData } from "@shared/schema";

export default function Clusters() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const { data: clusters, isLoading } = useQuery<ClusterData[]>({
    queryKey: ['/api/clusters'],
  });
  
  const filteredClusters = useMemo(() => {
    if (!clusters || !Array.isArray(clusters)) return [];
    
    if (!searchQuery) return clusters;
    
    const query = searchQuery.toLowerCase();
    return clusters.filter(cluster => 
      cluster.name.toLowerCase().includes(query) ||
      cluster.provider.toLowerCase().includes(query) ||
      cluster.region.toLowerCase().includes(query) ||
      cluster.version.toLowerCase().includes(query) ||
      cluster.status.toLowerCase().includes(query)
    );
  }, [clusters, searchQuery]);
  
  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-white">Kubernetes Clusters</h1>
            </div>
          </div>
        </header>

        {/* Search Bar */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-2">
          <div className="relative rounded-md w-full">
            <Input
              type="text"
              placeholder="Search clusters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white pl-10 w-full"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4">
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <ClusterStatusTable clusters={filteredClusters} />
          )}
          <div className="text-xs text-slate-500 mt-2 text-right">
            Showing {filteredClusters.length} of {clusters?.length || 0} clusters
          </div>
        </main>
      </div>
    </div>
  );
}
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
// Sidebar is now managed by App.tsx
import ClusterStatusTable from "@/components/dashboard/ClusterStatusTable";
import { Skeleton } from "@/components/ui/skeleton";
import { ClusterData } from "@shared/schema";

export default function Clusters() {
  const [, setLocation] = useLocation();
  
  const { data: clusters, isLoading } = useQuery<ClusterData[]>({
    queryKey: ['/api/clusters'],
  });
  
  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with integrated search */}
        <header className="bg-slate-800 border-b border-slate-700 shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-white mr-4">Clusters</h1>
            </div>
          </div>
        </header>

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
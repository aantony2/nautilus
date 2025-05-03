import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
// Sidebar is now managed by App.tsx
import WorkloadStatus from "@/components/dashboard/WorkloadStatus";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { WorkloadData } from "@shared/schema";

export default function Workloads() {
  const { toast } = useToast();
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
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-white">Kubernetes Workloads</h1>
            </div>
            <div className="flex items-center space-x-3">
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
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
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
              <div className="bg-slate-800 rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">Deployments</h2>
                {isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <div className="text-center text-slate-400 py-10">
                    Deployment details will be expanded in future updates
                  </div>
                )}
              </div>
              
              <div className="bg-slate-800 rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">StatefulSets</h2>
                {isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <div className="text-center text-slate-400 py-10">
                    StatefulSet details will be expanded in future updates
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
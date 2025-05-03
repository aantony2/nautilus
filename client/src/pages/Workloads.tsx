import { useQuery } from "@tanstack/react-query";
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
  
  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-white">Kubernetes Workloads</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search workloads..."
                  className="bg-slate-700 border-slate-600 pl-8 text-slate-100 w-[250px]"
                />
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
              <WorkloadStatus workloads={workloads ?? {
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
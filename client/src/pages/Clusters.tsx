import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/Sidebar";
import ClusterStatusTable from "@/components/dashboard/ClusterStatusTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ClusterData } from "@shared/schema";

export default function Clusters() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: clusters, isLoading, refetch } = useQuery<ClusterData[]>({
    queryKey: ['/api/clusters'],
  });
  
  const refreshData = () => {
    refetch();
    
    toast({
      title: "Clusters refreshed",
      description: "Cluster data has been updated",
    });
  };
  
  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-white">Kubernetes Clusters</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary/10"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Cluster
              </Button>
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
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <ClusterStatusTable clusters={clusters} />
          )}
        </main>
      </div>
    </div>
  );
}
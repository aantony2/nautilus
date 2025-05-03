import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/Sidebar";
import OverviewStats from "@/components/dashboard/OverviewStats";
import ClusterStatusTable from "@/components/dashboard/ClusterStatusTable";
import ResourceUtilization from "@/components/dashboard/ResourceUtilization";
import ServiceHealth from "@/components/dashboard/ServiceHealth";
import RecentEvents from "@/components/dashboard/RecentEvents";
import WorkloadStatus from "@/components/dashboard/WorkloadStatus";
import { Search, RefreshCw, Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();
  
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['/api/stats'],
  });
  
  const { data: clusters, isLoading: clustersLoading, refetch: refetchClusters } = useQuery({
    queryKey: ['/api/clusters'],
  });
  
  const { data: utilization, isLoading: utilizationLoading, refetch: refetchUtilization } = useQuery({
    queryKey: ['/api/utilization'],
  });
  
  const { data: services, isLoading: servicesLoading, refetch: refetchServices } = useQuery({
    queryKey: ['/api/services'],
  });
  
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['/api/events'],
  });
  
  const { data: workloads, isLoading: workloadsLoading, refetch: refetchWorkloads } = useQuery({
    queryKey: ['/api/workloads'],
  });

  const refreshData = () => {
    refetchStats();
    refetchClusters();
    refetchUtilization();
    refetchServices();
    refetchEvents();
    refetchWorkloads();
    
    toast({
      title: "Dashboard refreshed",
      description: "All data has been updated",
    });
  };

  const isLoading = statsLoading || clustersLoading || utilizationLoading || 
                   servicesLoading || eventsLoading || workloadsLoading;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-white">Multi-Cluster Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <div className="relative">
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                </Button>
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
              </div>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4">
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <OverviewStats stats={stats} />
          )}

          {clustersLoading ? (
            <Skeleton className="h-96 w-full mb-6" />
          ) : (
            <ClusterStatusTable clusters={clusters} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {utilizationLoading ? (
              <Skeleton className="h-80 w-full lg:col-span-2" />
            ) : (
              <ResourceUtilization data={utilization} />
            )}

            {servicesLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <ServiceHealth services={services} />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {eventsLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <RecentEvents events={events} />
            )}

            {workloadsLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <WorkloadStatus workloads={workloads} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

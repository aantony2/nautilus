import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { WorkloadData, WorkloadSummaryData } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowUpRight, Search } from "lucide-react";

interface WorkloadStatusProps {
  workloads: WorkloadData;
}

export default function WorkloadStatus({ workloads }: WorkloadStatusProps) {
  const [, setLocation] = useLocation();
  const [clusterFilter, setClusterFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredSummary = clusterFilter === "all" ? 
    workloads.summary : 
    {
      deployments: workloads.summary.deployments.filter(d => d.clusterType === clusterFilter),
      statefulSets: workloads.summary.statefulSets.filter(s => s.clusterType === clusterFilter)
    };
    
  const filteredTopConsumers = workloads.topConsumers
    .filter(consumer => {
      // Apply cluster filter
      if (clusterFilter !== "all" && !consumer.cluster.includes(clusterFilter)) {
        return false;
      }
      
      // Apply search filter (case insensitive)
      if (searchQuery && !consumer.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  
  const getWorkloadSummary = (data: WorkloadSummaryData[]) => {
    return {
      total: data.reduce((sum, item) => sum + item.total, 0),
      healthy: data.reduce((sum, item) => sum + item.healthy, 0),
      warning: data.reduce((sum, item) => sum + item.warning, 0),
      failed: data.reduce((sum, item) => sum + item.failed, 0)
    };
  };
  
  const deploymentsSummary = getWorkloadSummary(filteredSummary.deployments);
  const statefulSetsSummary = getWorkloadSummary(filteredSummary.statefulSets);
  
  const chartData = [
    { 
      name: 'Deployments', 
      GKE: workloads.summary.deployments.find(d => d.clusterType === 'GKE')?.total || 0, 
      AKS: workloads.summary.deployments.find(d => d.clusterType === 'AKS')?.total || 0 
    },
    { 
      name: 'StatefulSets', 
      GKE: workloads.summary.statefulSets.find(d => d.clusterType === 'GKE')?.total || 0, 
      AKS: workloads.summary.statefulSets.find(d => d.clusterType === 'AKS')?.total || 0 
    },
    { 
      name: 'DaemonSets', 
      GKE: workloads.distribution.daemonSets.GKE, 
      AKS: workloads.distribution.daemonSets.AKS 
    }
  ];

  return (
    <Card className="bg-slate-800 border-slate-700 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Workload Status</h2>
          <div className="flex items-center">
            <Select value={clusterFilter} onValueChange={setClusterFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-300 w-[180px]">
                <SelectValue placeholder="All Clusters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clusters</SelectItem>
                <SelectItem value="GKE">GKE Clusters</SelectItem>
                <SelectItem value="AKS">AKS Clusters</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-700 rounded-md p-3">
            <h3 className="text-sm font-medium text-slate-400">Deployments</h3>
            <div className="flex items-baseline mt-2">
              <span className="text-2xl font-semibold text-white">{deploymentsSummary.total}</span>
              <span className="ml-1 text-sm text-slate-400">Total</span>
            </div>
            <div className="flex items-center mt-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 mr-2">
                {deploymentsSummary.healthy} Healthy
              </span>
              <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 mr-2">
                {deploymentsSummary.warning} Warning
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                {deploymentsSummary.failed} Failed
              </span>
            </div>
          </div>
          
          <div className="bg-slate-700 rounded-md p-3">
            <h3 className="text-sm font-medium text-slate-400">StatefulSets</h3>
            <div className="flex items-baseline mt-2">
              <span className="text-2xl font-semibold text-white">{statefulSetsSummary.total}</span>
              <span className="ml-1 text-sm text-slate-400">Total</span>
            </div>
            <div className="flex items-center mt-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 mr-2">
                {statefulSetsSummary.healthy} Healthy
              </span>
              <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 mr-2">
                {statefulSetsSummary.warning} Warning
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                {statefulSetsSummary.failed} Failed
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-700 rounded-md p-3 mb-4">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Resource Distribution</h3>
          <div className="h-32 bg-slate-800 rounded-lg">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    borderColor: '#475569',
                    color: '#F8FAFC'
                  }}
                />
                <Legend />
                <Bar dataKey="GKE" fill="#6366F1" name="GKE" />
                <Bar dataKey="AKS" fill="#8B5CF6" name="AKS" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-slate-400">Top Resource Consumers</h3>
            <div className="relative w-48">
              <Input
                type="text"
                placeholder="Search workloads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white pl-8 py-1 h-8 text-sm"
              />
              <Search className="absolute left-2 top-1.5 h-4 w-4 text-slate-400" />
            </div>
          </div>
          <div className="bg-slate-700 rounded-md divide-y divide-slate-600">
            {filteredTopConsumers.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-sm">
                No workloads found matching your search criteria.
              </div>
            ) : (
              filteredTopConsumers.map((consumer, index) => (
                <div 
                  key={index} 
                  className="p-2 flex items-center justify-between cursor-pointer hover:bg-slate-600 transition-colors"
                  onClick={() => setLocation(`/workloads/${consumer.id || `workload-${index + 1}`}`)}
                >
                  <div className="flex items-center">
                    <div className={`w-2 h-8 ${
                      index === 0 ? 'bg-primary' : index === 1 ? 'bg-secondary' : 'bg-info'
                    } rounded-sm mr-3`}></div>
                    <div>
                      <p className="text-sm text-white">{consumer.name}</p>
                      <p className="text-xs text-slate-400">{consumer.cluster}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="text-xs text-slate-300 mr-2">
                      <span>CPU: {consumer.resources.cpu}</span>
                      <span className="ml-2">Mem: {consumer.resources.memory}</span>
                    </div>
                    <ArrowUpRight size={16} className="text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

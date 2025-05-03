import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldCheck, ShieldAlert, Lock, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function Security() {
  const { toast } = useToast();
  
  const refreshData = () => {
    toast({
      title: "Security data refreshed",
      description: "Security data has been updated",
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
              <h1 className="text-lg font-semibold text-white">Kubernetes Security</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshData}
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="bg-slate-800 border-slate-700 shadow-md">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-400">Vulnerability Score</p>
                    <p className="text-2xl font-bold">86/100</p>
                  </div>
                  <ShieldCheck className="h-6 w-6 text-green-500" />
                </div>
                <div className="mt-2">
                  <Progress value={86} className="h-2" />
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  Last scan: 4 hours ago
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800 border-slate-700 shadow-md">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-400">Active Threats</p>
                    <p className="text-2xl font-bold">3</p>
                  </div>
                  <ShieldAlert className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Critical</span>
                    <Badge variant="destructive">1</Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Medium</span>
                    <Badge variant="warning">2</Badge>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  Last detection: 2 days ago
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800 border-slate-700 shadow-md">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-400">Compliance Status</p>
                    <p className="text-2xl font-bold">92%</p>
                  </div>
                  <Lock className="h-6 w-6 text-blue-500" />
                </div>
                <div className="mt-2">
                  <Progress value={92} className="h-2" />
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  6 controls need attention
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>RBAC Analysis</CardTitle>
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <CardDescription>Role-based access control management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-slate-700 rounded-md p-3">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">Cluster Admin</p>
                      <Badge className="bg-red-400 hover:bg-red-600">High Privilege</Badge>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">2 service accounts, 1 user</p>
                  </div>
                  
                  <div className="bg-slate-700 rounded-md p-3">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">Namespace Editor</p>
                      <Badge className="bg-yellow-400 hover:bg-yellow-600 text-slate-900">Medium Privilege</Badge>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">4 service accounts, 3 users</p>
                  </div>
                  
                  <div className="bg-slate-700 rounded-md p-3">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">Viewer</p>
                      <Badge className="bg-green-400 hover:bg-green-600">Low Privilege</Badge>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">6 service accounts, 8 users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800 border-slate-700 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Security Events</CardTitle>
                  <ShieldAlert className="h-5 w-5 text-warning" />
                </div>
                <CardDescription>Recent security-related events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-slate-700 rounded-md p-3">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">Unauthorized Access Attempt</p>
                      <Badge variant="destructive">Critical</Badge>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">12 hours ago • aks-prod-eastus</p>
                  </div>
                  
                  <div className="bg-slate-700 rounded-md p-3">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">Pod Security Policy Violation</p>
                      <Badge variant="warning">Medium</Badge>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">1 day ago • gke-prod-cluster1</p>
                  </div>
                  
                  <div className="bg-slate-700 rounded-md p-3">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">Secret Rotation Needed</p>
                      <Badge variant="warning">Medium</Badge>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">2 days ago • gke-stage-cluster1</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
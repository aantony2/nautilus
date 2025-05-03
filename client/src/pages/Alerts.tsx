import { useQuery } from "@tanstack/react-query";
// Sidebar is now managed by App.tsx
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Bell, BellOff, BellRing, Settings, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventData } from "@shared/schema";

export default function Alerts() {
  const { toast } = useToast();
  
  const { data: events, isLoading, refetch } = useQuery<EventData[]>({
    queryKey: ['/api/events'],
  });
  
  const refreshData = () => {
    refetch();
    
    toast({
      title: "Alerts refreshed",
      description: "Alert data has been updated",
    });
  };
  
  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-white">Kubernetes Alerts</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Alert Settings
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
          <Tabs defaultValue="active">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="active">Active Alerts</TabsTrigger>
                <TabsTrigger value="history">Alert History</TabsTrigger>
                <TabsTrigger value="config">Alert Configuration</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center space-x-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <TabsContent value="active" className="space-y-4">
              {isLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : (
                <>
                  <Card className="bg-slate-800 border-slate-700 shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center text-red-400">
                        <BellRing className="h-5 w-5 mr-2" />
                        Critical Alerts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="bg-slate-700 rounded-md p-3 flex items-start">
                          <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-red-100">
                            <BellRing className="h-5 w-5 text-red-600" />
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-white">Node Failure Detected</p>
                              <Badge variant="destructive">Critical</Badge>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">aks-dev-westeu node 'aks-nodepool1-12345-vmss000003' is not responding.</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-slate-400">48m ago • aks-dev-westeu</span>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm">Silence</Button>
                                <Button variant="outline" size="sm">View</Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-800 border-slate-700 shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center text-yellow-400">
                        <Bell className="h-5 w-5 mr-2" />
                        Warnings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(events ?? []).filter(e => e.type === "warning").map((event, i) => (
                          <div key={i} className="bg-slate-700 rounded-md p-3 flex items-start">
                            <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-yellow-100">
                              <Bell className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div className="ml-3 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-white">{event.title}</p>
                                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Warning</Badge>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">{event.description}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-slate-400">{event.time}</span>
                                <div className="flex items-center space-x-2">
                                  <Button variant="ghost" size="sm">Silence</Button>
                                  <Button variant="outline" size="sm">View</Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-800 border-slate-700 shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center text-blue-400">
                        <Bell className="h-5 w-5 mr-2" />
                        Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(events ?? []).filter(e => e.type === "info").map((event, i) => (
                          <div key={i} className="bg-slate-700 rounded-md p-3 flex items-start">
                            <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-100">
                              <Bell className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="ml-3 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-white">{event.title}</p>
                                <Badge className="bg-blue-500 hover:bg-blue-600">Info</Badge>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">{event.description}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-slate-400">{event.time}</span>
                                <div className="flex items-center space-x-2">
                                  <Button variant="ghost" size="sm">Dismiss</Button>
                                  <Button variant="outline" size="sm">View</Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="history">
              <Card className="bg-slate-800 border-slate-700 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                    Resolved Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(events ?? []).filter(e => e.type === "success").map((event, i) => (
                      <div key={i} className="bg-slate-700 rounded-md p-3 flex items-start">
                        <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-green-100">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-white">{event.title}</p>
                            <Badge className="bg-green-500 hover:bg-green-600">Resolved</Badge>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{event.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-slate-400">{event.time}</span>
                            <Button variant="outline" size="sm">View Details</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="config">
              <Card className="bg-slate-800 border-slate-700 shadow-md">
                <CardHeader>
                  <CardTitle>Alert Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-2 border border-slate-700 rounded-md">
                      <div>
                        <p className="font-medium">Node Status Alerts</p>
                        <p className="text-xs text-slate-400">Notify when node status changes</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between p-2 border border-slate-700 rounded-md">
                      <div>
                        <p className="font-medium">Resource Utilization</p>
                        <p className="text-xs text-slate-400">Alert on high resource usage (CPU, Memory)</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between p-2 border border-slate-700 rounded-md">
                      <div>
                        <p className="font-medium">Pod Failures</p>
                        <p className="text-xs text-slate-400">Notify on pod crash or restart</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between p-2 border border-slate-700 rounded-md">
                      <div>
                        <p className="font-medium">Security Events</p>
                        <p className="text-xs text-slate-400">Alert on security-related events</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between p-2 border border-slate-700 rounded-md">
                      <div>
                        <p className="font-medium">Maintenance Updates</p>
                        <p className="text-xs text-slate-400">Notify about available version updates</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
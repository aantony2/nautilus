import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import MainSidebar, { SidebarProvider, useSidebarContext } from "@/components/layout/Sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import ClusterDetails from "@/pages/ClusterDetails";
import Clusters from "@/pages/Clusters";
import Workloads from "@/pages/Workloads";
import Services from "@/pages/Services";
import Networking from "@/pages/Networking";
import Security from "@/pages/Security";
import Alerts from "@/pages/Alerts";
import Namespaces from "@/pages/Namespaces";
import Settings from "@/pages/Settings";

// Main layout component with routing
function AppLayout() {
  const { sidebarVisible } = useSidebarContext();
  
  return (
    <div className="relative">
      <MainSidebar />
      <div className={cn(
        "transition-all duration-300 ease-in-out p-6 pt-16 md:p-8 md:pt-8 bg-slate-900 min-h-screen",
        sidebarVisible ? "md:ml-64" : "md:ml-16"
      )}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/clusters/:id" component={ClusterDetails} />
          <Route path="/clusters" component={Clusters} />
          <Route path="/workloads" component={Workloads} />
          <Route path="/services" component={Services} />
          <Route path="/networking" component={Networking} />
          <Route path="/security" component={Security} />
          <Route path="/alerts" component={Alerts} />
          <Route path="/namespaces" component={Namespaces} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <SidebarProvider>
          <AppLayout />
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

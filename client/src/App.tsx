import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import MainSidebar, { SidebarProvider, useSidebarContext } from "@/components/layout/Sidebar";
import { AppSettingsProvider } from "@/hooks/use-app-settings";
import { AuthProvider, RequireAuth } from "@/components/auth/AuthProvider";
import { AuthSettingsProvider } from "@/hooks/use-auth-settings";
import { ThemeProvider } from "@/hooks/use-theme";
import DynamicStyles from "./DynamicStyles";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import ClusterDetails from "@/pages/ClusterDetails";
import Clusters from "@/pages/Clusters";
import Workloads from "@/pages/Workloads";
import WorkloadDetails from "@/pages/WorkloadDetails";
import Services from "@/pages/Services";
import Networking from "@/pages/Networking";
import Security from "@/pages/Security";
import Alerts from "@/pages/Alerts";
import Namespaces from "@/pages/Namespaces";
import NamespaceDetails from "@/pages/NamespaceDetails";
import Dependencies from "@/pages/Dependencies";
import DependencyDetails from "@/pages/DependencyDetails";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";

// Main layout component with routing
function AppLayout() {
  const { sidebarVisible } = useSidebarContext();
  
  return (
    <div className="relative">
      <DynamicStyles />
      <MainSidebar />
      <div className={cn(
        "transition-all duration-300 ease-in-out p-0 bg-slate-900 min-h-screen",
        sidebarVisible ? "md:ml-56" : "md:ml-16"
      )}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/">
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          </Route>
          <Route path="/clusters/:id">
            <RequireAuth>
              <ClusterDetails />
            </RequireAuth>
          </Route>
          <Route path="/clusters">
            <RequireAuth>
              <Clusters />
            </RequireAuth>
          </Route>
          <Route path="/workloads/:id">
            <RequireAuth>
              <WorkloadDetails />
            </RequireAuth>
          </Route>
          <Route path="/workloads">
            <RequireAuth>
              <Workloads />
            </RequireAuth>
          </Route>
          <Route path="/services">
            <RequireAuth>
              <Services />
            </RequireAuth>
          </Route>
          <Route path="/networking">
            <RequireAuth>
              <Networking />
            </RequireAuth>
          </Route>
          <Route path="/security">
            <RequireAuth>
              <Security />
            </RequireAuth>
          </Route>
          <Route path="/alerts">
            <RequireAuth>
              <Alerts />
            </RequireAuth>
          </Route>
          <Route path="/namespaces/:id">
            <RequireAuth>
              <NamespaceDetails />
            </RequireAuth>
          </Route>
          <Route path="/namespaces">
            <RequireAuth>
              <Namespaces />
            </RequireAuth>
          </Route>
          <Route path="/dependencies/:id">
            <RequireAuth>
              <DependencyDetails />
            </RequireAuth>
          </Route>
          <Route path="/dependencies">
            <RequireAuth>
              <Dependencies />
            </RequireAuth>
          </Route>
          <Route path="/settings">
            <RequireAuth>
              <Settings />
            </RequireAuth>
          </Route>
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
        <ThemeProvider>
          <AppSettingsProvider>
            <AuthSettingsProvider>
              <AuthProvider>
                <SidebarProvider>
                  <AppLayout />
                </SidebarProvider>
              </AuthProvider>
            </AuthSettingsProvider>
          </AppSettingsProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

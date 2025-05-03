import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import ClusterDetails from "@/pages/ClusterDetails";
import Clusters from "@/pages/Clusters";
import Workloads from "@/pages/Workloads";
import Services from "@/pages/Services";
import Networking from "@/pages/Networking";
import Security from "@/pages/Security";
import Alerts from "@/pages/Alerts";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/clusters/:id" component={ClusterDetails} />
      <Route path="/clusters" component={Clusters} />
      <Route path="/workloads" component={Workloads} />
      <Route path="/services" component={Services} />
      <Route path="/networking" component={Networking} />
      <Route path="/security" component={Security} />
      <Route path="/alerts" component={Alerts} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

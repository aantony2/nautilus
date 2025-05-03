import { Link, useRoute } from "wouter";
import { useState, useEffect, createContext, useContext } from "react";
import { 
  LayoutDashboard, 
  Server, 
  Settings, 
  Boxes, 
  Globe, 
  Router, 
  ShieldAlert, 
  Bell,
  Layers,
  Menu,
  X,
  PackageCheck
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppSettings } from "@/hooks/use-app-settings";

// Create a context for sidebar visibility
type SidebarContextType = {
  sidebarVisible: boolean;
  setSidebarVisible: (visible: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// Hook to use the sidebar context
export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used within a SidebarProvider');
  }
  return context;
}

interface SidebarProps {
  className?: string;
}

// Create a provider component for the sidebar context
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  
  // Make sure sidebar is visible on Namespaces page
  useEffect(() => {
    if (window.location.pathname.includes('/namespaces') && !sidebarVisible) {
      setSidebarVisible(true);
    }
  }, [sidebarVisible]);
  
  return (
    <SidebarContext.Provider value={{ sidebarVisible, setSidebarVisible }}>
      {children}
    </SidebarContext.Provider>
  );
}

export default function MainSidebar({ className }: SidebarProps) {
  const [isHome] = useRoute("/");
  const { sidebarVisible, setSidebarVisible } = useSidebarContext();
  const { appSettings } = useAppSettings();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Server, label: "Clusters", href: "/clusters" },
    { icon: Layers, label: "Namespaces", href: "/namespaces" },
    { icon: Boxes, label: "Workloads", href: "/workloads" },
    { icon: Globe, label: "Services", href: "/services" },
    { icon: Router, label: "Networking", href: "/networking" },
    { icon: PackageCheck, label: "Dependencies", href: "/dependencies" },
    { icon: ShieldAlert, label: "Security", href: "/security" },
    { icon: Bell, label: "Alerts", href: "/alerts" },
    { icon: Settings, label: "Settings", href: "/settings" }
  ];

  return (
    <>
      {/* Main sidebar */}
      <div 
        className={cn(
          "transition-all duration-300 ease-in-out md:flex md:flex-col bg-slate-800 border-r border-slate-700 fixed h-full z-40",
          sidebarVisible ? "md:w-56" : "md:w-16",
          className
        )}
      >
        {/* Sidebar toggle button - moved to the right side */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setSidebarVisible(!sidebarVisible)} 
          className="absolute top-4 right-2 z-50 bg-slate-700 text-white hover:bg-slate-600"
        >
          {sidebarVisible ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className={cn(
            "flex items-center flex-shrink-0 px-4 mb-5",
            sidebarVisible ? "justify-start" : "justify-center"
          )}>
            <svg 
              className={cn("h-8 w-8 text-primary", sidebarVisible && "mr-2")} 
              viewBox="0 0 24 24" 
              fill="currentColor"
              style={{ color: appSettings.primaryColor || "#0ea5e9" }}
            >
              {appSettings.logoSvgCode ? (
                <path d={appSettings.logoSvgCode} />
              ) : (
                <path d="M12 16L19.36 10.27C21.5 8.58 21.5 5.42 19.36 3.73C17.22 2.04 13.78 2.04 11.64 3.73L4.27 9.46C3.16 10.33 3.16 12.67 4.27 13.54L11.64 19.27C13.78 20.96 17.22 20.96 19.36 19.27C21.5 17.58 21.5 14.42 19.36 12.73L12 7"></path>
              )}
            </svg>
            {sidebarVisible && <h1 className="text-lg font-bold text-white truncate">{appSettings.productName}</h1>}
          </div>
          
          <ScrollArea className="flex-1 px-3">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const [isActive] = useRoute(item.href);
                const isActiveRoute = item.href === "/" ? isHome : isActive;
                
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    className={cn(
                      "text-slate-300 hover:bg-slate-700 group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                      isActiveRoute && "bg-slate-700 text-white",
                      !sidebarVisible && "justify-center"
                    )}
                    title={!sidebarVisible ? item.label : undefined}
                  >
                    <Icon className={cn("h-5 w-5", sidebarVisible && "mr-3")} />
                    {sidebarVisible && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>
        </div>
        
        <div className="flex-shrink-0 flex border-t border-slate-700 p-4">
          <div className={cn("flex items-center", !sidebarVisible && "justify-center w-full")}>
            <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center">
              <span className="text-xs font-medium text-white">AU</span>
            </div>
            {sidebarVisible && (
              <div className="ml-3">
                <p className="text-sm font-medium text-white">Admin User</p>
                <p className="text-xs font-medium text-slate-400">Administrator</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* This div is no longer needed as we're handling margins in App.tsx */}
    </>
  );
}

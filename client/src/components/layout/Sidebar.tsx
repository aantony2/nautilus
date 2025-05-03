import { Link, useRoute } from "wouter";
import { 
  LayoutDashboard, 
  Server, 
  Settings, 
  Boxes, 
  Globe, 
  Router, 
  ShieldAlert, 
  Bell 
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const [isHome] = useRoute("/");

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Server, label: "Clusters", href: "/clusters" },
    { icon: Boxes, label: "Workloads", href: "/workloads" },
    { icon: Globe, label: "Services", href: "/services" },
    { icon: Router, label: "Networking", href: "/networking" },
    { icon: ShieldAlert, label: "Security", href: "/security" },
    { icon: Bell, label: "Alerts", href: "/alerts" },
    { icon: Settings, label: "Settings", href: "/settings" }
  ];

  return (
    <div className={cn("hidden md:flex md:w-64 md:flex-col bg-slate-800 border-r border-slate-700", className)}>
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center justify-center flex-shrink-0 px-4 mb-5">
          <svg className="h-8 w-8 text-primary mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 16L19.36 10.27C21.5 8.58 21.5 5.42 19.36 3.73C17.22 2.04 13.78 2.04 11.64 3.73L4.27 9.46C3.16 10.33 3.16 12.67 4.27 13.54L11.64 19.27C13.78 20.96 17.22 20.96 19.36 19.27C21.5 17.58 21.5 14.42 19.36 12.73L12 7"></path>
          </svg>
          <h1 className="text-xl font-bold text-white">ClusterView</h1>
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
                    isActiveRoute && "bg-slate-700 text-white"
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </div>
      
      <div className="flex-shrink-0 flex border-t border-slate-700 p-4">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center">
            <span className="text-xs font-medium text-white">AU</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">Admin User</p>
            <p className="text-xs font-medium text-slate-400">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
}

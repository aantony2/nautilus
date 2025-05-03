import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceHealthData } from "@shared/schema";

interface ServiceHealthProps {
  services: ServiceHealthData[];
}

export default function ServiceHealth({ services }: ServiceHealthProps) {
  return (
    <Card className="bg-slate-800 border-slate-700 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Service Health</h2>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="space-y-4">
          {services.map((service, index) => (
            <div key={index} className="bg-slate-700 rounded-md p-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-white">{service.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  service.status === 'Healthy' 
                    ? 'bg-green-100 text-green-800' 
                    : service.status === 'Warning' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-red-100 text-red-800'
                }`}>
                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                    service.status === 'Healthy' 
                      ? 'bg-green-500' 
                      : service.status === 'Warning' 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                  }`}></span>
                  {service.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1">{service.description}</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {service.metrics.map((metric, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-slate-400">{metric.label}: </span>
                    <span className={metric.highlightValue ? 'text-' + metric.highlightValue : 'text-white'}>
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

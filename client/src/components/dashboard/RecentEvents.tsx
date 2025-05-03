import { Card, CardContent } from "@/components/ui/card";
import { CheckIcon, AlertTriangleIcon, XCircleIcon, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventData } from "@shared/schema";

interface RecentEventsProps {
  events: EventData[];
}

export default function RecentEvents({ events }: RecentEventsProps) {
  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'success':
        return <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-green-100">
          <CheckIcon className="h-5 w-5 text-green-600" />
        </div>;
      case 'warning':
        return <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-yellow-100">
          <AlertTriangleIcon className="h-5 w-5 text-yellow-600" />
        </div>;
      case 'error':
        return <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-red-100">
          <XCircleIcon className="h-5 w-5 text-red-600" />
        </div>;
      default:
        return <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-blue-100">
          <InfoIcon className="h-5 w-5 text-blue-600" />
        </div>;
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Events</h2>
          <Button variant="link" className="text-primary p-0">View All</Button>
        </div>
        
        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={index} className="bg-slate-700 rounded-md p-3 flex items-start">
              {getEventIcon(event.type)}
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{event.title}</p>
                  <span className="text-xs text-slate-400">{event.time}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

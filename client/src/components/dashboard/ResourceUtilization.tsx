import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResourceUtilizationData } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ResourceUtilizationProps {
  data: ResourceUtilizationData;
}

export default function ResourceUtilization({ data }: ResourceUtilizationProps) {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  
  const chartData = data.utilization[timeRange] || [];
  
  return (
    <Card className="lg:col-span-2 bg-slate-800 border-slate-700 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Resource Utilization</h2>
          <div className="flex items-center space-x-2">
            <Button 
              variant={timeRange === 'day' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setTimeRange('day')}
              className={timeRange === 'day' ? 'bg-primary' : 'bg-slate-700'}
            >
              Day
            </Button>
            <Button 
              variant={timeRange === 'week' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setTimeRange('week')}
              className={timeRange === 'week' ? 'bg-primary' : 'bg-slate-700'}
            >
              Week
            </Button>
            <Button 
              variant={timeRange === 'month' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setTimeRange('month')}
              className={timeRange === 'month' ? 'bg-primary' : 'bg-slate-700'}
            >
              Month
            </Button>
          </div>
        </div>
        
        <div className="h-64 w-full bg-slate-900 rounded-lg">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis 
                dataKey="time" 
                stroke="#94A3B8"
                tick={{ fill: '#94A3B8' }}
              />
              <YAxis 
                stroke="#94A3B8"
                tick={{ fill: '#94A3B8' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1E293B', 
                  borderColor: '#475569',
                  color: '#F8FAFC'
                }}
              />
              <Legend wrapperStyle={{ color: '#F8FAFC' }} />
              <Line 
                type="monotone" 
                dataKey="cpu" 
                stroke="#6366F1" 
                strokeWidth={2}
                activeDot={{ r: 8 }}
                name="CPU Usage"
              />
              <Line 
                type="monotone" 
                dataKey="memory" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Memory Usage"
              />
              <Line 
                type="monotone" 
                dataKey="storage" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Storage Usage"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700 rounded-md p-3">
            <h3 className="text-sm font-medium text-slate-400">CPU Usage</h3>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-lg font-semibold text-white">{data.current.cpu}%</p>
              <span className={`text-sm ${data.changes.cpu > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {data.changes.cpu > 0 ? '↑' : '↓'} {Math.abs(data.changes.cpu)}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-slate-600 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full" 
                style={{ width: `${data.current.cpu}%` }}
              ></div>
            </div>
          </div>
          
          <div className="bg-slate-700 rounded-md p-3">
            <h3 className="text-sm font-medium text-slate-400">Memory Usage</h3>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-lg font-semibold text-white">{data.current.memory}%</p>
              <span className={`text-sm ${data.changes.memory > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {data.changes.memory > 0 ? '↑' : '↓'} {Math.abs(data.changes.memory)}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-slate-600 rounded-full overflow-hidden">
              <div 
                className="bg-info h-full rounded-full" 
                style={{ width: `${data.current.memory}%` }}
              ></div>
            </div>
          </div>
          
          <div className="bg-slate-700 rounded-md p-3">
            <h3 className="text-sm font-medium text-slate-400">Storage Usage</h3>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-lg font-semibold text-white">{data.current.storage}%</p>
              <span className={`text-sm ${data.changes.storage > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {data.changes.storage > 0 ? '↑' : '↓'} {Math.abs(data.changes.storage)}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-slate-600 rounded-full overflow-hidden">
              <div 
                className="bg-accent h-full rounded-full" 
                style={{ width: `${data.current.storage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

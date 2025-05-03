import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Database, Save, RefreshCw, Settings as SettingsIcon, CircleCheck } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Define the database settings type
interface DatabaseSettings {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
  connectionTimeout: string;
}

// Define test connection result type
interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export default function Settings() {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<ConnectionTestResult | null>(null);

  // Get current database settings
  const { data: dbSettings, isLoading } = useQuery<DatabaseSettings>({
    queryKey: ['/api/settings/database'],
  });

  // Form state
  const [formData, setFormData] = useState<DatabaseSettings>({
    host: "",
    port: "",
    user: "",
    password: "",
    database: "",
    ssl: true,
    connectionTimeout: "5000"
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (dbSettings) {
      setFormData({
        host: dbSettings.host || "",
        port: dbSettings.port || "",
        user: dbSettings.user || "",
        password: "", // Don't pre-fill password for security
        database: dbSettings.database || "",
        ssl: dbSettings.ssl ?? true,
        connectionTimeout: dbSettings.connectionTimeout || "5000"
      });
    }
  }, [dbSettings]);

  // Update form fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // Test database connection
  const testConnection = async () => {
    setIsTesting(true);
    setConnectionTestResult(null);
    
    try {
      const result = await apiRequest<{ success: boolean; message: string }>('/api/settings/database/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
      });
      
      setConnectionTestResult({
        success: result.success,
        message: result.message || (result.success ? "Connection successful!" : "Connection failed.")
      });
      
      toast({
        title: result.success ? "Connection successful" : "Connection failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      setConnectionTestResult({
        success: false,
        message: "Connection test failed. Please check your settings and try again."
      });
      
      toast({
        title: "Connection failed",
        description: "An error occurred while testing the connection.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save database settings
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{ success: boolean; message: string }>('/api/settings/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Settings saved",
        description: data.message || "Database connection settings have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving settings",
        description: "An error occurred while saving the settings.",
        variant: "destructive",
      });
    },
  });

  const saveSettings = () => {
    saveSettingsMutation.mutate();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-white">Settings</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4">
          <Tabs defaultValue="database">
            <TabsList className="mb-6">
              <TabsTrigger value="database">Database</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="database">
              <Card className="bg-slate-800 border-slate-700 shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Database className="h-5 w-5 mr-2 text-primary" />
                        Database Configuration
                      </CardTitle>
                      <CardDescription>
                        Manage your PostgreSQL database connection settings
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="host">Host</Label>
                        <Input
                          id="host"
                          name="host"
                          placeholder="localhost or hostname"
                          value={formData.host}
                          onChange={handleInputChange}
                          className="bg-slate-700 border-slate-600 text-slate-100"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input
                          id="port"
                          name="port"
                          placeholder="5432"
                          value={formData.port}
                          onChange={handleInputChange}
                          className="bg-slate-700 border-slate-600 text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="user">Username</Label>
                        <Input
                          id="user"
                          name="user"
                          placeholder="Database username"
                          value={formData.user}
                          onChange={handleInputChange}
                          className="bg-slate-700 border-slate-600 text-slate-100"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="bg-slate-700 border-slate-600 text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="database">Database Name</Label>
                      <Input
                        id="database"
                        name="database"
                        placeholder="Database name"
                        value={formData.database}
                        onChange={handleInputChange}
                        className="bg-slate-700 border-slate-600 text-slate-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="connectionTimeout">Connection Timeout (ms)</Label>
                      <Input
                        id="connectionTimeout"
                        name="connectionTimeout"
                        placeholder="5000"
                        value={formData.connectionTimeout}
                        onChange={handleInputChange}
                        className="bg-slate-700 border-slate-600 text-slate-100"
                      />
                    </div>

                    <div className="flex justify-between pt-4">
                      <div>
                        {connectionTestResult && (
                          <div className={`flex items-center space-x-2 ${
                            connectionTestResult.success ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {connectionTestResult.success ? (
                              <CircleCheck className="h-5 w-5" />
                            ) : (
                              <div className="h-5 w-5 text-red-500">✖</div>
                            )}
                            <span>{connectionTestResult.message}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          onClick={testConnection}
                          disabled={isTesting || saveSettingsMutation.isPending}
                        >
                          {isTesting ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            "Test Connection"
                          )}
                        </Button>
                        <Button
                          onClick={saveSettings}
                          disabled={isTesting || saveSettingsMutation.isPending}
                        >
                          {saveSettingsMutation.isPending ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Settings
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="general">
              <Card className="bg-slate-800 border-slate-700 shadow-md">
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Manage application-wide settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 text-center py-8">
                    General settings will be implemented in future updates
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="advanced">
              <Card className="bg-slate-800 border-slate-700 shadow-md">
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                  <CardDescription>
                    Advanced configuration options
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 text-center py-8">
                    Advanced settings will be implemented in future updates
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
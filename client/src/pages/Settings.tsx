import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Database, 
  Save, 
  RefreshCw, 
  Settings as SettingsIcon, 
  CircleCheck,
  Palette,
  Text,
  Image,
  KeyRound,
  Lock
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { useAppSettings } from "@/hooks/use-app-settings";
import { ThemeGenerator } from "@/components/theme/ThemeGenerator";

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

// Define app settings type
interface AppSettings {
  productName: string;
  logoUrl?: string;
  logoSvgCode?: string;
  primaryColor?: string;
  accentColor?: string;
}

// Define authentication settings type
interface AuthSettings {
  enabled: boolean;
  provider: 'okta' | 'none';
  oktaIssuer?: string;
  oktaClientId?: string;
  redirectUri?: string;
  postLogoutRedirectUri?: string;
}

// Define test connection result type
interface ConnectionTestResult {
  success: boolean;
  message: string;
}

// Define cloud provider credentials type
interface CloudProviderCredentials {
  // Google Cloud Platform / GKE
  gcpEnabled: boolean;
  gcpProjectId?: string;
  gcpCredentialsJson?: string;
  
  // Microsoft Azure / AKS
  azureEnabled: boolean;
  azureTenantId?: string;
  azureClientId?: string;
  azureClientSecret?: string;
  azureSubscriptionId?: string;
  
  // Amazon Web Services / EKS
  awsEnabled: boolean;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  
  // Update schedule
  updateSchedule?: string;
}

// Define cloud credentials test result type
interface CloudCredentialsTestResult {
  success: boolean;
  message: string;
  results: {
    gcp: { success: boolean; message: string };
    azure: { success: boolean; message: string };
    aws: { success: boolean; message: string };
  };
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
  
  // Get app settings
  const { data: appSettings } = useQuery<AppSettings>({
    queryKey: ['/api/settings/app'],
  });
  
  // App settings form state
  const [appFormData, setAppFormData] = useState<AppSettings>({
    productName: "Nautilus",
    logoSvgCode: "",
    primaryColor: "#0ea5e9",
    accentColor: "#6366f1"
  });
  
  // Update app form when settings are loaded
  useEffect(() => {
    if (appSettings) {
      setAppFormData({
        productName: appSettings.productName || "Nautilus",
        logoUrl: appSettings.logoUrl,
        logoSvgCode: appSettings.logoSvgCode || "",
        primaryColor: appSettings.primaryColor || "#0ea5e9",
        accentColor: appSettings.accentColor || "#6366f1"
      });
    }
  }, [appSettings]);
  
  // Update app form fields
  const handleAppInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAppFormData({
      ...appFormData,
      [name]: value,
    });
  };
  
  // Save app settings
  const saveAppSettingsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{ success: boolean; message: string }>('/api/settings/app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appFormData),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Settings saved",
        description: data.message || "Application settings have been updated.",
      });
      
      // Reload the page to apply new settings
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: (error) => {
      toast({
        title: "Error saving settings",
        description: "An error occurred while saving the application settings.",
        variant: "destructive",
      });
    },
  });
  
  const saveAppSettings = () => {
    saveAppSettingsMutation.mutate();
  };
  
  // Get authentication settings
  const { data: authSettings } = useQuery<AuthSettings>({
    queryKey: ['/api/settings/auth'],
  });
  
  // Calculate if this is production environment
  const isProduction = window.location.hostname !== 'localhost' && 
                      !window.location.hostname.includes('replit');
  
  // Auth settings form state
  const [authFormData, setAuthFormData] = useState<AuthSettings>({
    enabled: false,
    provider: 'none',
    oktaIssuer: '',
    oktaClientId: '',
    redirectUri: `${window.location.origin}/implicit/callback`,
    postLogoutRedirectUri: window.location.origin
  });
  
  // Update auth form when settings are loaded
  useEffect(() => {
    if (authSettings) {
      setAuthFormData({
        enabled: authSettings.enabled || false,
        provider: authSettings.provider || 'none',
        oktaIssuer: authSettings.oktaIssuer || '',
        oktaClientId: authSettings.oktaClientId || '',
        redirectUri: authSettings.redirectUri || `${window.location.origin}/implicit/callback`,
        postLogoutRedirectUri: authSettings.postLogoutRedirectUri || window.location.origin
      });
    }
  }, [authSettings]);
  
  // Handle auth form input changes
  const handleAuthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setAuthFormData({
      ...authFormData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };
  
  // Handle select input changes
  const handleAuthSelectChange = (value: string, name: string) => {
    setAuthFormData({
      ...authFormData,
      [name]: value,
    });
  };
  
  // Handle auth toggle
  const handleAuthToggle = (checked: boolean) => {
    setAuthFormData({
      ...authFormData,
      enabled: checked,
    });
  };
  
  // Save auth settings
  const saveAuthSettingsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{ success: boolean; message: string; settings: AuthSettings }>('/api/settings/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(authFormData),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Authentication settings saved",
        description: data.message || "Authentication settings have been updated.",
      });
      
      // Invalidate auth settings query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/settings/auth'] });
    },
    onError: (error) => {
      toast({
        title: "Error saving settings",
        description: "An error occurred while saving the authentication settings.",
        variant: "destructive",
      });
    },
  });
  
  const saveAuthSettings = () => {
    saveAuthSettingsMutation.mutate();
  };
  
  // Get cloud provider credentials
  const { data: cloudCredentials } = useQuery<CloudProviderCredentials>({
    queryKey: ['/api/settings/cloud-credentials'],
  });
  
  // Cloud credentials form state
  const [cloudFormData, setCloudFormData] = useState<CloudProviderCredentials>({
    // GCP
    gcpEnabled: false,
    gcpProjectId: '',
    gcpCredentialsJson: '',
    
    // Azure
    azureEnabled: false,
    azureTenantId: '',
    azureClientId: '',
    azureClientSecret: '',
    azureSubscriptionId: '',
    
    // AWS
    awsEnabled: false,
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    awsRegion: 'us-west-2',
    
    // Update schedule
    updateSchedule: '0 2 * * *'
  });
  
  // Update cloud form when settings are loaded
  useEffect(() => {
    if (cloudCredentials) {
      setCloudFormData({
        // GCP
        gcpEnabled: cloudCredentials.gcpEnabled || false,
        gcpProjectId: cloudCredentials.gcpProjectId || '',
        gcpCredentialsJson: cloudCredentials.gcpCredentialsJson || '',
        
        // Azure
        azureEnabled: cloudCredentials.azureEnabled || false,
        azureTenantId: cloudCredentials.azureTenantId || '',
        azureClientId: cloudCredentials.azureClientId || '',
        azureClientSecret: cloudCredentials.azureClientSecret || '',
        azureSubscriptionId: cloudCredentials.azureSubscriptionId || '',
        
        // AWS
        awsEnabled: cloudCredentials.awsEnabled || false,
        awsAccessKeyId: cloudCredentials.awsAccessKeyId || '',
        awsSecretAccessKey: cloudCredentials.awsSecretAccessKey || '',
        awsRegion: cloudCredentials.awsRegion || 'us-west-2',
        
        // Update schedule
        updateSchedule: cloudCredentials.updateSchedule || '0 2 * * *'
      });
    }
  }, [cloudCredentials]);
  
  // Handle cloud credentials form input changes
  const handleCloudInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setCloudFormData({
      ...cloudFormData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };
  
  // Handle cloud select input changes
  const handleCloudSelectChange = (value: string, name: string) => {
    setCloudFormData({
      ...cloudFormData,
      [name]: value,
    });
  };
  
  // Handle cloud provider toggle
  const handleCloudToggle = (checked: boolean, provider: 'gcp' | 'azure' | 'aws') => {
    setCloudFormData({
      ...cloudFormData,
      [`${provider}Enabled`]: checked,
    });
  };
  
  // Testing cloud provider connections
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [cloudTestResult, setCloudTestResult] = useState<CloudCredentialsTestResult | null>(null);
  
  const testCloudConnections = async () => {
    setIsTestingCloud(true);
    setCloudTestResult(null);
    
    try {
      const result = await apiRequest<CloudCredentialsTestResult>('/api/settings/cloud-credentials/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cloudFormData),
      });
      
      setCloudTestResult(result);
      
      toast({
        title: result.success ? "Cloud Provider Connections Successful" : "Cloud Provider Connection Issues",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Connection Test Failed",
        description: "An error occurred while testing cloud provider connections.",
        variant: "destructive",
      });
    } finally {
      setIsTestingCloud(false);
    }
  };
  
  // Save cloud provider credentials
  const saveCloudCredentialsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{ success: boolean; message: string }>('/api/settings/cloud-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cloudFormData),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Cloud Provider Credentials Saved",
        description: data.message || "Cloud provider credentials have been updated.",
      });
      
      // Invalidate cloud credentials query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/settings/cloud-credentials'] });
    },
    onError: (error) => {
      toast({
        title: "Error Saving Credentials",
        description: "An error occurred while saving the cloud provider credentials.",
        variant: "destructive",
      });
    },
  });
  
  const saveCloudCredentials = () => {
    saveCloudCredentialsMutation.mutate();
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
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4">
          <Tabs defaultValue="general">
            <TabsList className="mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="appearance">
              <Card className="bg-slate-800 border-slate-700 shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Palette className="h-5 w-5 mr-2 text-primary" />
                        Theme Customization
                      </CardTitle>
                      <CardDescription>
                        Customize the application color palette and appearance
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ThemeGenerator />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="general">
              <Card className="bg-slate-800 border-slate-700 shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Text className="h-5 w-5 mr-2 text-primary" />
                        Application Branding
                      </CardTitle>
                      <CardDescription>
                        Customize your application name and appearance
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="productName">Product Name</Label>
                      <Input
                        id="productName"
                        name="productName"
                        placeholder="Nautilus"
                        value={appFormData.productName}
                        onChange={handleAppInputChange}
                        className="bg-slate-700 border-slate-600 text-slate-100"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        This name will appear in the sidebar and throughout the application.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logoSvgCode">Logo SVG Code</Label>
                      <Textarea
                        id="logoSvgCode"
                        name="logoSvgCode"
                        placeholder='<path d="M12 16L19.36 10.27C21.5 8.58 21.5 5.42 19.36 3.73C17.22 2.04 13.78 2.04 11.64 3.73L4.27 9.46C3.16 10.33 3.16 12.67 4.27 13.54L11.64 19.27C13.78 20.96 17.22 20.96 19.36 19.27C21.5 17.58 21.5 14.42 19.36 12.73L12 7"></path>'
                        value={appFormData.logoSvgCode}
                        onChange={handleAppInputChange}
                        className="bg-slate-700 border-slate-600 text-slate-100 min-h-[120px]"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Enter SVG path data only, not the full SVG tag. This will be used for the application logo.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Logo Preview</Label>
                      <div className="bg-slate-900 p-4 rounded-md flex justify-center">
                        <div className="w-16 h-16 bg-slate-800 rounded-md flex items-center justify-center">
                          <svg 
                            className="h-12 w-12" 
                            viewBox="0 0 24 24" 
                            fill="currentColor"
                            style={{ color: appFormData.primaryColor || "#0ea5e9" }}
                          >
                            {appFormData.logoSvgCode ? (
                              <path d={appFormData.logoSvgCode} />
                            ) : (
                              <path d="M12 16L19.36 10.27C21.5 8.58 21.5 5.42 19.36 3.73C17.22 2.04 13.78 2.04 11.64 3.73L4.27 9.46C3.16 10.33 3.16 12.67 4.27 13.54L11.64 19.27C13.78 20.96 17.22 20.96 19.36 19.27C21.5 17.58 21.5 14.42 19.36 12.73L12 7"></path>
                            )}
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="primaryColor">Primary Color</Label>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-8 h-8 rounded-md border border-slate-600"
                            style={{ backgroundColor: appFormData.primaryColor || '#0ea5e9' }}
                          />
                          <Input
                            id="primaryColor"
                            name="primaryColor"
                            placeholder="#0ea5e9"
                            value={appFormData.primaryColor}
                            onChange={handleAppInputChange}
                            className="bg-slate-700 border-slate-600 text-slate-100"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accentColor">Accent Color</Label>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-8 h-8 rounded-md border border-slate-600"
                            style={{ backgroundColor: appFormData.accentColor || '#6366f1' }}
                          />
                          <Input
                            id="accentColor"
                            name="accentColor"
                            placeholder="#6366f1"
                            value={appFormData.accentColor}
                            onChange={handleAppInputChange}
                            className="bg-slate-700 border-slate-600 text-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={saveAppSettings}
                        disabled={saveAppSettingsMutation.isPending}
                      >
                        {saveAppSettingsMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Branding
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="advanced">
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

              <Card className="bg-slate-800 border-slate-700 shadow-md mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Cloud className="h-5 w-5 mr-2 text-primary" />
                        Cloud Provider Credentials
                      </CardTitle>
                      <CardDescription>
                        Configure credentials for GCP, Azure, and AWS to enable cluster data retrieval
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* GCP Section */}
                    <div className="border-b border-slate-700 pb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 mr-2 flex items-center justify-center rounded bg-slate-700">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 6.627 5.374 12 12 12 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12zm-6.24 16.745c-.682-.358-1.247-.895-1.62-1.543-.374-.647-.594-1.385-.594-2.177 0-1.544.796-2.896 2-3.686v-.021c.67.172 1.333.345 2 .517v.062c-.667.322-1.167.989-1.167 1.77 0 1.105.895 2 2 2 .084 0 .166-.007.25-.02v2.5l-.083-.004c-.11-.005-.207-.016-.313-.03-.35-.046-.688-.128-1.012-.244-.793-.278-1.486-.772-2.017-1.423.193-.153.321-.394.321-.668 0-.47-.38-.85-.85-.85h-.332c.001-.08.006-.16.014-.239.018-.175.049-.347.094-.513.105-.399.273-.775.496-1.118.223-.342.5-.645.821-.902v1.989c0 .552.448 1 1 1 .551 0 1-.448 1-1 0-.551-.449-1-1-1h-1v-1.667c.229-.086.47-.133.721-.133h.558c1.51 0 2.721 1.2 2.721 2.669 0 .96-.516 1.791-1.028 2.303.082-.003.168-.006.25-.006v2.5l-.083-.004c-.376-.018-.72-.084-1.051-.186zm9.99 2.148c-.898.154-1.825.238-2.75.238-.918 0-1.839-.083-2.731-.234v-2.498c.893.152 1.814.234 2.731.234.926 0 1.852-.082 2.75-.235v2.495zm-5.25-5.39v-2.498c.15.033.304.064.46.09.397.066.804.11 1.227.11.424 0 .831-.044 1.228-.11.313-.052.62-.118.919-.198v2.498c-.299.08-.606.147-.919.198-.397.066-.804.11-1.228.11-.423 0-.83-.044-1.227-.11-.156-.026-.31-.057-.46-.09zm-2.99-9.503v2.5l.083.004c.376.018.72.084 1.051.186.681.358 1.246.895 1.62 1.543.373.646.594 1.384.594 2.177 0 1.543-.797 2.896-2 3.686v.021c-.67-.172-1.334-.345-2-.517v-.062c.667-.322 1.167-.989 1.167-1.77 0-1.105-.895-2-2-2-.084 0-.166.007-.25.02v-2.5l.084.004c.11.005.206.016.312.03.35.046.688.128 1.012.244.793.278 1.486.772 2.017 1.423-.193.153-.321.394-.321.668 0 .47.38.85.85.85h.332c-.001.08-.006.16-.014.239-.018.175-.049.347-.094.513-.105.399-.273.775-.496 1.118-.224.342-.5.645-.821.902v-1.989c0-.552-.449-1-1-1-.552 0-1 .448-1 1 0 .551.448 1 1 1h1v1.667c-.229.086-.47.133-.721.133h-.558c-1.51 0-2.721-1.2-2.721-2.669 0-.96.516-1.791 1.028-2.303-.082.003-.168.006-.25.006v-2.5l.083.004c.376.018.72.084 1.051.186.681.358 1.246.895 1.62 1.543.373.646.594 1.384.594 2.177v.5c0 .275.225.5.5.5h.25c.274 0 .5-.225.5-.5v-.5c0-.793.22-1.531.594-2.177.373-.648.937-1.185 1.62-1.543.33-.102.675-.168 1.05-.186l.083-.004v2.5c-.082 0-.168-.003-.25-.006.513.511 1.028 1.342 1.028 2.303 0 1.469-1.212 2.669-2.721 2.669h-.558c-.251 0-.492-.047-.721-.133v-1.667h1c.551 0 1-.449 1-1 0-.552-.449-1-1-1-.552 0-1 .448-1 1v1.989c-.321-.257-.598-.56-.821-.902-.224-.343-.391-.719-.496-1.118-.045-.166-.077-.338-.094-.513-.008-.08-.013-.16-.014-.239h.332c.47 0 .85-.38.85-.85 0-.274-.129-.515-.321-.668.531-.651 1.224-1.145 2.017-1.423.325-.116.663-.198 1.012-.244.106-.015.202-.025.313-.03l.084-.004v2.5c-.084-.013-.168-.02-.25-.02-1.105 0-2 .895-2 2 0 .781.5 1.448 1.166 1.77v.062c-.666.172-1.333.345-2 .517v-.021c-1.203-.79-2-2.143-2-3.686 0-2.206 1.794-4 4-4h.608c.25 0 .492.047.721.133v1.667h-1c-.552 0-1 .448-1 1 0 .551.448 1 1 1 .551 0 1-.449 1-1v-1.989c.32.257.596.56.82.902.224.343.391.719.496 1.118.045.166.077.338.094.513.008.08.013.16.014.239h-.332c-.47 0-.85.38-.85.85 0 .274.127.515.321.668-.531.651-1.224 1.145-2.017 1.423-.325.116-.663.198-1.012.244-.106.015-.202.025-.313.03l-.083.004v-2.5c.084.013.166.02.25.02 1.105 0 2-.895 2-2 0-.793-.22-1.53-.594-2.177-.374-.648-.938-1.185-1.62-1.543-.33-.102-.675-.168-1.051-.186l-.083-.004v-2.5c.918.151 1.839.235 2.731.235.925 0 1.852-.084 2.75-.238v2.498c-.898-.154-1.825-.238-2.75-.238-.918 0-1.839.083-2.731.235zm12.5 4.497c-.15-.033-.304-.064-.46-.09-.397-.066-.804-.11-1.227-.11-.424 0-.831.044-1.228.11-.313.052-.62.118-.919.198v-2.498c.299-.08.606-.147.919-.198.397-.066.804-.11 1.228-.11.423 0 .83.044 1.227.11.156.026.31.057.46.09v2.498zm-7.75 5.903c.893-.152 1.814-.234 2.731-.234.926 0 1.852.083 2.75.237v2.495c-.898.154-1.825.238-2.75.238-.918 0-1.839-.083-2.731-.234v-2.502z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium">Google Cloud Platform (GKE)</h3>
                            <p className="text-xs text-slate-400">
                              Enable GKE cluster data retrieval
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={cloudFormData.gcpEnabled}
                          onCheckedChange={(checked) => handleCloudToggle(checked, 'gcp')}
                        />
                      </div>
                      
                      {cloudFormData.gcpEnabled && (
                        <div className="space-y-4 pl-10">
                          <div className="space-y-2">
                            <Label htmlFor="gcpProjectId">Project ID</Label>
                            <Input
                              id="gcpProjectId"
                              name="gcpProjectId"
                              placeholder="my-gcp-project-id"
                              value={cloudFormData.gcpProjectId}
                              onChange={handleCloudInputChange}
                              className="bg-slate-700 border-slate-600 text-slate-100"
                            />
                            <p className="text-xs text-slate-400">
                              Your Google Cloud project ID
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="gcpCredentialsJson">Service Account Credentials (JSON)</Label>
                            <Textarea
                              id="gcpCredentialsJson"
                              name="gcpCredentialsJson"
                              placeholder='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...",...}'
                              value={cloudFormData.gcpCredentialsJson}
                              onChange={handleCloudInputChange}
                              className="bg-slate-700 border-slate-600 text-slate-100 h-24"
                            />
                            <p className="text-xs text-slate-400">
                              Paste the JSON content of your GCP service account key file
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Azure Section */}
                    <div className="border-b border-slate-700 pb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 mr-2 flex items-center justify-center rounded bg-slate-700">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M0 0v24h24v-24h-24zm11.43 5.962l6.689 3.301-3.375 5.797-5.246-9.098h1.932zm7.244 3.607h4.181v10.529h-15.133l10.952-10.529zm-17.529 6.062l3.367-5.785 5.261 9.108h-8.628v-3.323z"/>
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium">Microsoft Azure (AKS)</h3>
                            <p className="text-xs text-slate-400">
                              Enable AKS cluster data retrieval
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={cloudFormData.azureEnabled}
                          onCheckedChange={(checked) => handleCloudToggle(checked, 'azure')}
                        />
                      </div>
                      
                      {cloudFormData.azureEnabled && (
                        <div className="space-y-4 pl-10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="azureTenantId">Tenant ID</Label>
                              <Input
                                id="azureTenantId"
                                name="azureTenantId"
                                placeholder="00000000-0000-0000-0000-000000000000"
                                value={cloudFormData.azureTenantId}
                                onChange={handleCloudInputChange}
                                className="bg-slate-700 border-slate-600 text-slate-100"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="azureSubscriptionId">Subscription ID</Label>
                              <Input
                                id="azureSubscriptionId"
                                name="azureSubscriptionId"
                                placeholder="00000000-0000-0000-0000-000000000000"
                                value={cloudFormData.azureSubscriptionId}
                                onChange={handleCloudInputChange}
                                className="bg-slate-700 border-slate-600 text-slate-100"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="azureClientId">Client ID</Label>
                              <Input
                                id="azureClientId"
                                name="azureClientId"
                                placeholder="00000000-0000-0000-0000-000000000000"
                                value={cloudFormData.azureClientId}
                                onChange={handleCloudInputChange}
                                className="bg-slate-700 border-slate-600 text-slate-100"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="azureClientSecret">Client Secret</Label>
                              <Input
                                id="azureClientSecret"
                                name="azureClientSecret"
                                type="password"
                                placeholder="••••••••"
                                value={cloudFormData.azureClientSecret}
                                onChange={handleCloudInputChange}
                                className="bg-slate-700 border-slate-600 text-slate-100"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* AWS Section */}
                    <div className="border-b border-slate-700 pb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 mr-2 flex items-center justify-center rounded bg-slate-700">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18.75 11.71a5.479 5.479 0 0 0 .717-.28.512.512 0 0 1 .67.276.52.52 0 0 1-.198.632 3.46 3.46 0 0 1-1.196.467c-.925.179-1.695-.049-2.312-.684a3.086 3.086 0 0 1-.943-2.32c.026-.68.274-1.256.734-1.744.636-.675 1.403-1.014 2.332-.852.517.093.98.267 1.374.576a.524.524 0 0 1 .117.716.501.501 0 0 1-.671.194 2.482 2.482 0 0 0-.96-.37c-.664-.096-1.226.15-1.628.692-.33.446-.449.947-.395 1.485.054.516.245.962.604 1.329.44.448.959.631 1.555.572a2.99 2.99 0 0 0 1.17-.393zm-15.22 3.4a.488.488 0 0 1-.597-.385.504.504 0 0 1 .378-.605c.67-.162 1.35-.284 2.025-.424a.52.52 0 0 1 .612.404.504.504 0 0 1-.39.612c-.671.134-1.343.268-2.028.398zm.412 1.542a.51.51 0 0 1-.322-.644.495.495 0 0 1 .63-.336l1.984.571a.507.507 0 0 1 .336.637.496.496 0 0 1-.627.33l-2.001-.558zm1.081-3.736-.013-.002c-.57-.17-1.144-.336-1.712-.514a.519.519 0 0 1-.349-.631.492.492 0 0 1 .626-.345c.563.172 1.13.337 1.691.512a.517.517 0 0 1 .329.658.497.497 0 0 1-.572.322zm12.685 5.43c-.919 0-1.838.02-2.755-.008a1.33 1.33 0 0 1-1.326-1.326c-.055-1.054-.05-2.113-.006-3.166A1.28 1.28 0 0 1 14.88 12.56c1.818-.028 3.637-.028 5.456.005a1.285 1.285 0 0 1 1.246 1.234c.06 1.08.059 2.168 0 3.248a1.285 1.285 0 0 1-1.245 1.237c-.881.037-1.767.032-2.65.032h-.491zm.009-.863h.44c.774 0 1.548.013 2.321-.006a.556.556 0 0 0 .597-.53c.058-.868.058-1.741 0-2.61a.557.557 0 0 0-.608-.522c-1.781-.018-3.562-.018-5.342 0a.588.588 0 0 0-.635.56c-.036.859-.037 1.72 0 2.582a.55.55 0 0 0 .601.526c.875.02 1.751.006 2.626.006zm-7.851-5.912v7.152h-.903c-.17 0-.34.008-.509-.006a.492.492 0 0 1-.488-.506c-.01-1.025-.01-2.049 0-3.074 0-.145-.028-.213-.186-.213-.804.01-1.607.01-2.411 0-.159 0-.187.068-.187.213.011 1.018.01 2.036.001 3.055a.503.503 0 0 1-.55.525c-.482.011-.963.011-1.445 0a.5.5 0 0 1-.548-.528c-.01-1.017-.01-2.034 0-3.055 0-.145-.029-.213-.186-.213-.804.01-1.607.01-2.411 0-.159 0-.186.068-.187.213.011 1.018.01 2.036 0 3.055a.503.503 0 0 1-.55.525c-.482.011-.963.01-1.444 0a.5.5 0 0 1-.547-.527c-.01-1.999-.01-3.997 0-5.996a.497.497 0 0 1 .543-.53c.319-.008.638-.002.957-.002h10.98z"/>
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium">Amazon Web Services (EKS)</h3>
                            <p className="text-xs text-slate-400">
                              Enable EKS cluster data retrieval
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={cloudFormData.awsEnabled}
                          onCheckedChange={(checked) => handleCloudToggle(checked, 'aws')}
                        />
                      </div>
                      
                      {cloudFormData.awsEnabled && (
                        <div className="space-y-4 pl-10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="awsAccessKeyId">Access Key ID</Label>
                              <Input
                                id="awsAccessKeyId"
                                name="awsAccessKeyId"
                                placeholder="AKIAIOSFODNN7EXAMPLE"
                                value={cloudFormData.awsAccessKeyId}
                                onChange={handleCloudInputChange}
                                className="bg-slate-700 border-slate-600 text-slate-100"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="awsSecretAccessKey">Secret Access Key</Label>
                              <Input
                                id="awsSecretAccessKey"
                                name="awsSecretAccessKey"
                                type="password"
                                placeholder="••••••••"
                                value={cloudFormData.awsSecretAccessKey}
                                onChange={handleCloudInputChange}
                                className="bg-slate-700 border-slate-600 text-slate-100"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="awsRegion">Region</Label>
                            <Select
                              value={cloudFormData.awsRegion || 'us-west-2'}
                              onValueChange={(value) => handleCloudSelectChange(value, 'awsRegion')}
                            >
                              <SelectTrigger id="awsRegion" className="bg-slate-700 border-slate-600 text-slate-100">
                                <SelectValue placeholder="Select a region" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                                <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                                <SelectItem value="us-east-2">US East (Ohio)</SelectItem>
                                <SelectItem value="us-west-1">US West (N. California)</SelectItem>
                                <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                                <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                                <SelectItem value="eu-central-1">EU (Frankfurt)</SelectItem>
                                <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
                                <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                                <SelectItem value="ap-southeast-2">Asia Pacific (Sydney)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Update Schedule */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Data Update Schedule</h3>
                      <div className="space-y-2">
                        <Label htmlFor="updateSchedule">Cron Schedule</Label>
                        <Input
                          id="updateSchedule"
                          name="updateSchedule"
                          placeholder="0 2 * * *"
                          value={cloudFormData.updateSchedule}
                          onChange={handleCloudInputChange}
                          className="bg-slate-700 border-slate-600 text-slate-100"
                        />
                        <p className="text-xs text-slate-400">
                          Cron expression for data update schedule (Default: Every day at 2 AM)
                        </p>
                      </div>
                      
                      <div className="flex justify-between pt-4">
                        <Button
                          onClick={testCloudConnections}
                          disabled={isTestingCloud}
                          variant="outline"
                        >
                          {isTestingCloud ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>Test Cloud Connections</>
                          )}
                        </Button>
                        <Button onClick={saveCloudCredentials}>Save Cloud Credentials</Button>
                      </div>
                      
                      {cloudTestResult && (
                        <div className="mt-4 space-y-3">
                          <div 
                            className={cn(
                              "p-3 rounded-md text-sm",
                              cloudTestResult.success 
                                ? "bg-green-900/30 text-green-200 border border-green-900" 
                                : "bg-amber-900/30 text-amber-200 border border-amber-900"
                            )}
                          >
                            <div className="flex items-start">
                              {cloudTestResult.success ? (
                                <CheckCircle className="h-5 w-5 mr-2 text-green-400 shrink-0" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 mr-2 text-amber-400 shrink-0" />
                              )}
                              <p>{cloudTestResult.message}</p>
                            </div>
                          </div>
                          
                          {cloudFormData.gcpEnabled && (
                            <div 
                              className={cn(
                                "p-3 rounded-md text-sm",
                                cloudTestResult.results.gcp.success 
                                  ? "bg-green-900/30 text-green-200 border border-green-900" 
                                  : "bg-red-900/30 text-red-200 border border-red-900"
                              )}
                            >
                              <div className="flex items-start">
                                {cloudTestResult.results.gcp.success ? (
                                  <CheckCircle className="h-5 w-5 mr-2 text-green-400 shrink-0" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 mr-2 text-red-400 shrink-0" />
                                )}
                                <div>
                                  <p className="font-medium">Google Cloud Platform (GKE)</p>
                                  <p>{cloudTestResult.results.gcp.message}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {cloudFormData.azureEnabled && (
                            <div 
                              className={cn(
                                "p-3 rounded-md text-sm",
                                cloudTestResult.results.azure.success 
                                  ? "bg-green-900/30 text-green-200 border border-green-900" 
                                  : "bg-red-900/30 text-red-200 border border-red-900"
                              )}
                            >
                              <div className="flex items-start">
                                {cloudTestResult.results.azure.success ? (
                                  <CheckCircle className="h-5 w-5 mr-2 text-green-400 shrink-0" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 mr-2 text-red-400 shrink-0" />
                                )}
                                <div>
                                  <p className="font-medium">Microsoft Azure (AKS)</p>
                                  <p>{cloudTestResult.results.azure.message}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {cloudFormData.awsEnabled && (
                            <div 
                              className={cn(
                                "p-3 rounded-md text-sm",
                                cloudTestResult.results.aws.success 
                                  ? "bg-green-900/30 text-green-200 border border-green-900" 
                                  : "bg-red-900/30 text-red-200 border border-red-900"
                              )}
                            >
                              <div className="flex items-start">
                                {cloudTestResult.results.aws.success ? (
                                  <CheckCircle className="h-5 w-5 mr-2 text-green-400 shrink-0" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 mr-2 text-red-400 shrink-0" />
                                )}
                                <div>
                                  <p className="font-medium">Amazon Web Services (EKS)</p>
                                  <p>{cloudTestResult.results.aws.message}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800 border-slate-700 shadow-md mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Lock className="h-5 w-5 mr-2 text-primary" />
                        Authentication
                      </CardTitle>
                      <CardDescription>
                        Configure single sign-on (SSO) authentication for production
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auth-enabled">Enable Authentication</Label>
                        <p className="text-sm text-slate-400">
                          {isProduction ? 
                            "Authentication will be enforced for all users" : 
                            "Authentication will be enabled in production only"
                          }
                        </p>
                      </div>
                      <Switch
                        id="auth-enabled"
                        checked={authFormData.enabled}
                        onCheckedChange={handleAuthToggle}
                      />
                    </div>
                    
                    <div className="pt-2 border-t border-slate-700">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="auth-provider">Authentication Provider</Label>
                          <Select
                            value={authFormData.provider}
                            onValueChange={(value) => handleAuthSelectChange(value, 'provider')}
                            disabled={!authFormData.enabled}
                          >
                            <SelectTrigger id="auth-provider" className="bg-slate-700 border-slate-600 text-slate-100">
                              <SelectValue placeholder="Select a provider" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="okta">Okta SSO</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-slate-400">
                            Select the authentication provider to use
                          </p>
                        </div>
                        
                        {authFormData.provider === 'okta' && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="oktaIssuer">Okta Issuer URL</Label>
                              <Input
                                id="oktaIssuer"
                                name="oktaIssuer"
                                placeholder="https://dev-123456.okta.com/oauth2/default"
                                value={authFormData.oktaIssuer}
                                onChange={handleAuthInputChange}
                                className="bg-slate-700 border-slate-600 text-slate-100"
                                disabled={!authFormData.enabled}
                              />
                              <p className="text-xs text-slate-400">
                                The issuer URL from your Okta application
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="oktaClientId">Okta Client ID</Label>
                              <Input
                                id="oktaClientId"
                                name="oktaClientId"
                                placeholder="0oa1234567890abcDEF"
                                value={authFormData.oktaClientId}
                                onChange={handleAuthInputChange}
                                className="bg-slate-700 border-slate-600 text-slate-100"
                                disabled={!authFormData.enabled}
                              />
                              <p className="text-xs text-slate-400">
                                The client ID from your Okta application
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="redirectUri">Redirect URI</Label>
                              <Input
                                id="redirectUri"
                                name="redirectUri"
                                value={authFormData.redirectUri}
                                onChange={handleAuthInputChange}
                                className="bg-slate-700 border-slate-600 text-slate-100"
                                disabled={!authFormData.enabled}
                              />
                              <p className="text-xs text-slate-400">
                                The callback URL after successful authentication
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="postLogoutRedirectUri">Post Logout Redirect URI</Label>
                              <Input
                                id="postLogoutRedirectUri"
                                name="postLogoutRedirectUri"
                                value={authFormData.postLogoutRedirectUri}
                                onChange={handleAuthInputChange}
                                className="bg-slate-700 border-slate-600 text-slate-100"
                                disabled={!authFormData.enabled}
                              />
                              <p className="text-xs text-slate-400">
                                The URL to redirect to after logout
                              </p>
                            </div>
                          </>
                        )}
                        
                        <div className="flex justify-end pt-4">
                          <Button
                            onClick={saveAuthSettings}
                            disabled={saveAuthSettingsMutation.isPending || !authFormData.enabled}
                          >
                            {saveAuthSettingsMutation.isPending ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Authentication Settings
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
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
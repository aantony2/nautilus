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
import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Define the AppSettings type
export interface AppSettings {
  productName: string;
  logoUrl?: string;
  logoSvgCode?: string;
  primaryColor?: string;
  accentColor?: string;
}

// Default app settings
const defaultAppSettings: AppSettings = {
  productName: "Nautilus",
  logoSvgCode: `<path d="M12 16L19.36 10.27C21.5 8.58 21.5 5.42 19.36 3.73C17.22 2.04 13.78 2.04 11.64 3.73L4.27 9.46C3.16 10.33 3.16 12.67 4.27 13.54L11.64 19.27C13.78 20.96 17.22 20.96 19.36 19.27C21.5 17.58 21.5 14.42 19.36 12.73L12 7"></path>`,
  primaryColor: "#0ea5e9",
  accentColor: "#6366f1"
};

// Create context for app settings
type AppSettingsContextType = {
  appSettings: AppSettings;
  isLoading: boolean;
}

const AppSettingsContext = createContext<AppSettingsContextType>({
  appSettings: defaultAppSettings,
  isLoading: true
});

// App settings provider component
export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  
  // Query for app settings
  const { data, isLoading } = useQuery<AppSettings>({
    queryKey: ['/api/settings/app'],
  });
  
  // Update app settings when data changes
  useEffect(() => {
    if (data) {
      setAppSettings({
        productName: data.productName || defaultAppSettings.productName,
        logoUrl: data.logoUrl,
        logoSvgCode: data.logoSvgCode || defaultAppSettings.logoSvgCode,
        primaryColor: data.primaryColor || defaultAppSettings.primaryColor,
        accentColor: data.accentColor || defaultAppSettings.accentColor
      });
    }
  }, [data]);
  
  return (
    <AppSettingsContext.Provider value={{ appSettings, isLoading }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

// Hook for using app settings
export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  
  if (context === undefined) {
    throw new Error("useAppSettings must be used within an AppSettingsProvider");
  }
  
  return context;
}
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface AuthSettings {
  enabled: boolean;
  provider: 'okta' | 'none';
  oktaIssuer?: string;
  oktaClientId?: string;
  redirectUri?: string;
  postLogoutRedirectUri?: string;
}

const defaultAuthSettings: AuthSettings = {
  enabled: false,
  provider: 'none',
};

type AuthSettingsContextType = {
  authSettings: AuthSettings;
  isLoading: boolean;
  isProduction: boolean;
}

const AuthSettingsContext = createContext<AuthSettingsContextType>({
  authSettings: defaultAuthSettings,
  isLoading: true,
  isProduction: false,
});

export function AuthSettingsProvider({ children }: { children: React.ReactNode }) {
  const [authSettings, setAuthSettings] = useState<AuthSettings>(defaultAuthSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    // Check environment
    const isProductionEnv = import.meta.env.MODE === 'production';
    setIsProduction(isProductionEnv);
    
    // Fetch auth settings
    fetchAuthSettings();
  }, []);

  async function fetchAuthSettings() {
    try {
      setIsLoading(true);
      const response = await apiRequest<{ settings: AuthSettings }>('/api/settings/auth');
      if (response) {
        setAuthSettings(response.settings || defaultAuthSettings);
      }
    } catch (error) {
      console.error('Error fetching auth settings:', error);
      setAuthSettings(defaultAuthSettings);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthSettingsContext.Provider value={{ authSettings, isLoading, isProduction }}>
      {children}
    </AuthSettingsContext.Provider>
  );
}

export function useAuthSettings() {
  return useContext(AuthSettingsContext);
}
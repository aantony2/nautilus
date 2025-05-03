import { useState, useEffect, createContext, useContext } from 'react';
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
  // Determine if this is a production environment
  // In a real app, this would check for process.env.NODE_ENV or similar
  const isProduction = window.location.hostname !== 'localhost' && 
                      !window.location.hostname.includes('replit');

  useEffect(() => {
    async function fetchAuthSettings() {
      try {
        setIsLoading(true);
        const data = await apiRequest<AuthSettings>('/api/settings/auth');
        setAuthSettings(data);
      } catch (error) {
        console.error('Failed to fetch auth settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAuthSettings();
  }, []);

  return (
    <AuthSettingsContext.Provider value={{ authSettings, isLoading, isProduction }}>
      {children}
    </AuthSettingsContext.Provider>
  );
}

export function useAuthSettings() {
  const context = useContext(AuthSettingsContext);
  if (context === undefined) {
    throw new Error('useAuthSettings must be used within an AuthSettingsProvider');
  }
  return context;
}
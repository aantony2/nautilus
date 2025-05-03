import React, { createContext, useContext, useEffect, useState } from 'react';
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js';
import { Security, SecureRoute } from '@okta/okta-react';
import { useLocation } from 'wouter';
import { useAuthSettings } from '@/hooks/use-auth-settings';

// Create a context for authentication state
interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: () => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: () => {},
  isLoading: true
});

export const useAuth = () => useContext(AuthContext);

// This component provides auth context to all children
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { authSettings, isLoading: isLoadingSettings, isProduction } = useAuthSettings();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [oktaAuth, setOktaAuth] = useState<OktaAuth | null>(null);
  const [location, navigate] = useLocation();

  // Initialize Okta Auth if enabled in production
  useEffect(() => {
    if (isLoadingSettings) return;

    // Only use Okta in production and if enabled
    if (isProduction && authSettings.enabled && authSettings.provider === 'okta') {
      if (authSettings.oktaIssuer && authSettings.oktaClientId) {
        const oktaAuthClient = new OktaAuth({
          issuer: authSettings.oktaIssuer,
          clientId: authSettings.oktaClientId,
          redirectUri: authSettings.redirectUri,
          postLogoutRedirectUri: authSettings.postLogoutRedirectUri,
          scopes: ['openid', 'profile', 'email'],
        });
        
        setOktaAuth(oktaAuthClient);
      }
    } else {
      // In dev environment, skip auth
      setIsLoading(false);
      setIsAuthenticated(true);
    }
  }, [authSettings, isProduction, isLoadingSettings]);

  // Auth methods for development or when auth is disabled
  const mockLogin = () => {
    setIsAuthenticated(true);
    setUser({ name: 'Dev User' });
  };

  const mockLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  // Handle Okta authentication
  const handleAuthenticated = async () => {
    if (!oktaAuth) return;
    
    setIsLoading(true);
    try {
      const tokens = await oktaAuth.token.parseFromUrl();
      // Store tokens appropriately based on Okta's response structure
      if (tokens.tokens) {
        oktaAuth.tokenManager.setTokens(tokens.tokens);
      }
      const userInfo = await oktaAuth.token.getUserInfo();
      setUser(userInfo);
      setIsAuthenticated(true);
      
      // Redirect to the original path or dashboard
      const originalUri = toRelativeUrl(
        window.location.href, 
        window.location.origin
      );
      navigate(originalUri || '/');
    } catch (error) {
      console.error('Authentication error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Only use Okta in production mode with proper configuration
  if (isProduction && authSettings.enabled && authSettings.provider === 'okta' && oktaAuth) {
    return (
      <Security
        oktaAuth={oktaAuth}
        onAuthRequired={() => navigate('/login')}
        restoreOriginalUri={async (_oktaAuth, originalUri) => {
          navigate(toRelativeUrl(originalUri || '/', window.location.origin));
        }}
      >
        <AuthContext.Provider
          value={{
            isAuthenticated,
            user,
            login: () => oktaAuth.signInWithRedirect(),
            logout: () => oktaAuth.signOut(),
            isLoading
          }}
        >
          {children}
        </AuthContext.Provider>
      </Security>
    );
  }

  // For development or when auth is disabled
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: true, // Always authenticated in development
        user: { name: 'Development User' },
        login: mockLogin,
        logout: mockLogout,
        isLoading: false
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// You can use this to protect routes if needed
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return <div>Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return <>{children}</>;
}
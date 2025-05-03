import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { useAppSettings } from '@/hooks/use-app-settings';

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { appSettings } = useAppSettings();
  
  // If we're already authenticated, redirect to home
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 text-slate-50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-20 w-20 rounded-lg bg-slate-800 p-4 shadow-lg">
              <svg 
                className="h-full w-full" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                style={{ color: appSettings?.primaryColor || "#0ea5e9" }}
              >
                <path d="M12 16L19.36 10.27C21.5 8.58 21.5 5.42 19.36 3.73C17.22 2.04 13.78 2.04 11.64 3.73L4.27 9.46C3.16 10.33 3.16 12.67 4.27 13.54L11.64 19.27C13.78 20.96 17.22 20.96 19.36 19.27C21.5 17.58 21.5 14.42 19.36 12.73L12 7"></path>
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold">{appSettings?.productName || 'Nautilus'}</h1>
          <p className="mt-2 text-slate-400">Sign in to your account</p>
        </div>
        <div className="rounded-lg bg-slate-800 p-6 shadow-lg">
          <div className="mt-4 space-y-6">
            <Button 
              className="w-full"
              onClick={login}
              disabled={isLoading}
            >
              <Lock className="mr-2 h-4 w-4" />
              Sign in with Okta SSO
            </Button>
            <div className="text-center text-sm text-slate-400">
              <p>Authentication is only enforced in production.</p>
              <p className="mt-1">In development mode, you're automatically signed in.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useAppSettings } from '@/hooks/use-app-settings';
import { useTheme } from '@/hooks/use-theme';

export default function DynamicStyles() {
  const { appSettings } = useAppSettings();
  const { colors } = useTheme();
  
  // Default to blue if settings aren't loaded yet
  const primaryColor = colors.primary || appSettings.primaryColor || '#0ea5e9';
  const accentColor = colors.accent || appSettings.accentColor || '#6366f1';
  const secondaryColor = colors.secondary || '#8b5cf6';
  
  const cssStyles = `
    :root {
      --primary: ${primaryColor};
      --primary-foreground: ${colors.foreground || '#ffffff'};
      --secondary: ${secondaryColor};
      --secondary-foreground: ${colors.foreground || '#ffffff'};
      --accent: ${accentColor};
      --accent-foreground: ${colors.foreground || '#ffffff'};
      --background: ${colors.background || '#0f172a'};
      --foreground: ${colors.foreground || '#f8fafc'};
      --card: ${colors.card || '#1e293b'};
      --card-foreground: ${colors.cardForeground || '#f1f5f9'};
      --muted: ${colors.muted || '#334155'};
      --muted-foreground: ${colors.mutedForeground || '#94a3b8'};
      --destructive: ${colors.error || '#ef4444'};
      --destructive-foreground: ${colors.foreground || '#ffffff'};
      --success: ${colors.success || '#10b981'};
      --warning: ${colors.warning || '#f59e0b'};
      --info: ${colors.info || '#3b82f6'};
    }
    
    .text-primary {
      color: ${primaryColor} !important;
    }
    
    .bg-primary {
      background-color: ${primaryColor} !important;
    }
    
    .text-accent {
      color: ${accentColor} !important;
    }
    
    .bg-accent {
      background-color: ${accentColor} !important;
    }
    
    .border-primary {
      border-color: ${primaryColor} !important;
    }
    
    .border-accent {
      border-color: ${accentColor} !important;
    }
    
    /* Apply button and other component styles */
    .btn-primary, 
    .btn-primary:hover {
      background-color: ${primaryColor} !important;
      border-color: ${primaryColor} !important;
    }
    
    /* Forms */
    input:focus, 
    select:focus, 
    textarea:focus {
      border-color: ${primaryColor} !important;
      box-shadow: 0 0 0 1px ${primaryColor}25 !important;
    }
  `;
  
  return <style dangerouslySetInnerHTML={{ __html: cssStyles }} />;
}
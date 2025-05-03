import { useAppSettings } from '@/hooks/use-app-settings';

export default function DynamicStyles() {
  const { appSettings } = useAppSettings();
  
  // Default to blue if settings aren't loaded yet
  const primaryColor = appSettings.primaryColor || '#0ea5e9';
  const accentColor = appSettings.accentColor || '#6366f1';
  
  const cssStyles = `
    :root {
      --primary: ${primaryColor};
      --accent: ${accentColor};
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
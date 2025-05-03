import { useState } from "react";
import { useTheme, ThemePreset, ThemeColors } from "@/hooks/use-theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Paintbrush, 
  Check, 
  Waves, 
  Sunset, 
  Leaf, 
  Moon, 
  Palette, 
  RotateCcw 
} from "lucide-react";

// Theme generator component
export function ThemeGenerator() {
  const { colors, preset, setPreset, updateColor, resetToPreset } = useTheme();
  const [activeTab, setActiveTab] = useState<"preset" | "custom">("preset");
  const [customColorKey, setCustomColorKey] = useState<keyof ThemeColors>("primary");

  // Preset theme options with icons and names
  const presetOptions: Array<{ value: ThemePreset, label: string, icon: React.ReactNode, colors: string[] }> = [
    { 
      value: 'default', 
      label: 'Default', 
      icon: <Check className="h-4 w-4" />,
      colors: ['#6366f1', '#8b5cf6', '#f43f5e']
    },
    { 
      value: 'ocean', 
      label: 'Ocean', 
      icon: <Waves className="h-4 w-4" />,
      colors: ['#0ea5e9', '#06b6d4', '#0284c7']
    },
    { 
      value: 'sunset', 
      label: 'Sunset', 
      icon: <Sunset className="h-4 w-4" />,
      colors: ['#f97316', '#f43f5e', '#fbbf24']
    },
    { 
      value: 'forest', 
      label: 'Forest', 
      icon: <Leaf className="h-4 w-4" />,
      colors: ['#10b981', '#059669', '#84cc16']
    },
    { 
      value: 'midnight', 
      label: 'Midnight', 
      icon: <Moon className="h-4 w-4" />,
      colors: ['#8b5cf6', '#a855f7', '#6366f1']
    },
    {
      value: 'custom',
      label: 'Custom',
      icon: <Palette className="h-4 w-4" />,
      colors: [colors.primary, colors.secondary, colors.accent]
    }
  ];

  // Color options that can be customized
  const colorOptions: Array<{ key: keyof ThemeColors, label: string }> = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'accent', label: 'Accent' },
    { key: 'background', label: 'Background' },
    { key: 'foreground', label: 'Foreground' },
    { key: 'card', label: 'Card Background' },
    { key: 'cardForeground', label: 'Card Text' },
    { key: 'muted', label: 'Muted Background' },
    { key: 'mutedForeground', label: 'Muted Text' },
    { key: 'success', label: 'Success' },
    { key: 'warning', label: 'Warning' },
    { key: 'error', label: 'Error' },
    { key: 'info', label: 'Info' }
  ];

  // Generate a random color
  const generateRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  // Randomize the current selected color
  const randomizeColor = () => {
    updateColor(customColorKey, generateRandomColor());
  };

  // Generates a complementary color palette
  const generateComplementaryPalette = () => {
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result 
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          }
        : { r: 0, g: 0, b: 0 };
    };

    const rgbToHex = (r: number, g: number, b: number) => {
      return '#' + [r, g, b]
        .map(x => {
          const hex = Math.round(x).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('');
    };

    // Get RGB for primary
    const primary = hexToRgb(colors.primary);
    
    // Generate complementary color (opposite on color wheel)
    const complementary = {
      r: 255 - primary.r,
      g: 255 - primary.g,
      b: 255 - primary.b
    };
    
    // Generate accent (90 degrees on color wheel)
    const accent = {
      r: primary.b,
      g: primary.r,
      b: primary.g
    };
    
    // Update colors
    updateColor('secondary', rgbToHex(complementary.r, complementary.g, complementary.b));
    updateColor('accent', rgbToHex(accent.r, accent.g, accent.b));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Paintbrush className="mr-2 h-5 w-5" />
          Theme Generator
        </CardTitle>
        <CardDescription>
          Customize your dashboard appearance with predefined themes or create your own
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="preset" onValueChange={(val) => setActiveTab(val as any)}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="preset">Preset Themes</TabsTrigger>
            <TabsTrigger value="custom">Customize Colors</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preset" className="space-y-4">
            <RadioGroup 
              value={preset} 
              onValueChange={(value) => setPreset(value as ThemePreset)}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {presetOptions.map((theme) => (
                <div key={theme.value} className="relative">
                  <RadioGroupItem
                    value={theme.value}
                    id={`theme-${theme.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`theme-${theme.value}`}
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <div className="flex items-center justify-center mb-2">
                      {theme.icon}
                      <span className="ml-2">{theme.label}</span>
                    </div>
                    <div className="flex space-x-2 mt-2">
                      {theme.colors.map((color, index) => (
                        <div
                          key={index}
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            
            <div className="flex justify-center mt-4">
              <div className="bg-card p-4 rounded-md max-w-md w-full">
                <h3 className="text-lg font-medium mb-2">Theme Preview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="h-8 rounded-md bg-primary"></div>
                    <div className="h-8 rounded-md bg-secondary"></div>
                    <div className="h-8 rounded-md bg-accent"></div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="h-8 rounded-md bg-success"></div>
                    <div className="h-8 rounded-md bg-warning"></div>
                    <div className="h-8 rounded-md bg-error"></div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="custom">
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {colorOptions.map((option) => (
                  <Button 
                    key={option.key}
                    variant={customColorKey === option.key ? "default" : "outline"}
                    onClick={() => setCustomColorKey(option.key)}
                    className="justify-start"
                  >
                    <div 
                      className="w-4 h-4 rounded-full mr-2" 
                      style={{ backgroundColor: colors[option.key] }} 
                    />
                    {option.label}
                  </Button>
                ))}
              </div>
              
              <div className="flex flex-col space-y-4 bg-card p-4 rounded-md">
                <div className="flex items-center">
                  <h3 className="text-lg font-medium flex-1">
                    {colorOptions.find(o => o.key === customColorKey)?.label || "Color"}: {colors[customColorKey]}
                  </h3>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={randomizeColor}
                    >
                      Random
                    </Button>
                    {customColorKey === 'primary' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={generateComplementaryPalette}
                      >
                        Generate Palette
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={resetToPreset}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div 
                    className="w-10 h-10 rounded-md" 
                    style={{ backgroundColor: colors[customColorKey] }} 
                  />
                  <Input
                    type="text"
                    value={colors[customColorKey]}
                    onChange={(e) => updateColor(customColorKey, e.target.value)}
                    className="w-32"
                  />
                  <Input 
                    type="color" 
                    value={colors[customColorKey]} 
                    onChange={(e) => updateColor(customColorKey, e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Color Preview</h4>
                  <div className="h-12 rounded-md" style={{ backgroundColor: colors[customColorKey] }}></div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Text on This Color</h4>
                  <div 
                    className="h-12 rounded-md flex items-center justify-center"
                    style={{ 
                      backgroundColor: colors[customColorKey],
                      color: isLightColor(colors[customColorKey]) ? '#000' : '#fff'
                    }}
                  >
                    Sample Text
                  </div>
                </div>
                
                {customColorKey === 'primary' && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Current Theme Palette</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div 
                          className="h-16 rounded-t-md flex items-center justify-center"
                          style={{ 
                            backgroundColor: colors.primary,
                            color: isLightColor(colors.primary) ? '#000' : '#fff'
                          }}
                        >
                          Primary
                        </div>
                        <div className="text-xs mt-1 text-center">{colors.primary}</div>
                      </div>
                      <div>
                        <div 
                          className="h-16 rounded-t-md flex items-center justify-center"
                          style={{ 
                            backgroundColor: colors.secondary,
                            color: isLightColor(colors.secondary) ? '#000' : '#fff'
                          }}
                        >
                          Secondary
                        </div>
                        <div className="text-xs mt-1 text-center">{colors.secondary}</div>
                      </div>
                      <div>
                        <div 
                          className="h-16 rounded-t-md flex items-center justify-center"
                          style={{ 
                            backgroundColor: colors.accent,
                            color: isLightColor(colors.accent) ? '#000' : '#fff'
                          }}
                        >
                          Accent
                        </div>
                        <div className="text-xs mt-1 text-center">{colors.accent}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Helper function to determine if a color is light or dark
function isLightColor(color: string): boolean {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return true if light, false if dark
  return luminance > 0.5;
}
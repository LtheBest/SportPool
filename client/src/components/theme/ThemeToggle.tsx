import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Sun, 
  Moon, 
  Laptop, 
  Palette,
  Check,
  Monitor,
  Sunrise,
  Sunset,
  Eye
} from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'button' | 'icon' | 'card';
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ 
  variant = 'button', 
  showLabel = false,
  className = '' 
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    {
      value: 'light',
      label: 'Clair',
      icon: Sun,
      description: 'Thème lumineux optimal pour le jour',
      gradient: 'from-yellow-400 to-orange-500'
    },
    {
      value: 'dark',
      label: 'Sombre',
      icon: Moon,
      description: 'Thème sombre reposant pour les yeux',
      gradient: 'from-slate-600 to-slate-800'
    },
    {
      value: 'system',
      label: 'Système',
      icon: Laptop,
      description: 'Suit automatiquement les préférences système',
      gradient: 'from-blue-500 to-purple-600'
    }
  ] as const;

  const getCurrentIcon = () => {
    if (theme === 'system') {
      return resolvedTheme === 'dark' ? Moon : Sun;
    }
    return theme === 'dark' ? Moon : Sun;
  };

  const getCurrentTheme = () => {
    return themes.find(t => t.value === theme) || themes[0];
  };

  if (variant === 'icon') {
    const CurrentIcon = getCurrentIcon();
    
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`relative overflow-hidden group hover:bg-primary/10 ${className}`}
            aria-label="Changer le thème"
          >
            <CurrentIcon className="h-5 w-5 transition-all duration-300 group-hover:scale-110" />
            {theme === 'system' && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full border border-background" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-64 p-2"
          sideOffset={5}
        >
          <DropdownMenuLabel className="flex items-center gap-2 text-sm font-medium">
            <Palette className="h-4 w-4" />
            Apparence
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <div className="space-y-1">
            {themes.map((themeOption) => {
              const Icon = themeOption.icon;
              const isSelected = theme === themeOption.value;
              
              return (
                <DropdownMenuItem
                  key={themeOption.value}
                  onClick={() => setTheme(themeOption.value as any)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200
                    hover:bg-primary/5 focus:bg-primary/5
                    ${isSelected ? 'bg-primary/10 border border-primary/20' : ''}
                  `}
                >
                  <div className={`
                    p-2 rounded-md bg-gradient-to-r ${themeOption.gradient} 
                    flex items-center justify-center
                  `}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {themeOption.label}
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {themeOption.description}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
          
          {theme === 'system' && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2 text-xs text-muted-foreground bg-muted/50 rounded-md flex items-center gap-2">
                <Eye className="h-3 w-3" />
                <span>
                  Actuellement: {resolvedTheme === 'dark' ? 'Sombre' : 'Clair'}
                </span>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`p-4 rounded-lg border bg-card ${className}`}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Thème d'affichage</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {themes.map((themeOption) => {
              const Icon = themeOption.icon;
              const isSelected = theme === themeOption.value;
              
              return (
                <button
                  key={themeOption.value}
                  onClick={() => setTheme(themeOption.value as any)}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all duration-200
                    hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20
                    ${isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/30'
                    }
                  `}
                >
                  <div className="text-center space-y-2">
                    <div className={`
                      mx-auto w-10 h-10 rounded-lg bg-gradient-to-r ${themeOption.gradient}
                      flex items-center justify-center
                    `}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">
                        {themeOption.label}
                      </p>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary mx-auto mt-1" />
                      )}
                    </div>
                  </div>
                  
                  {theme === 'system' && themeOption.value === 'system' && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-background flex items-center justify-center">
                      <Eye className="h-2 w-2 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {theme === 'system' && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md flex items-center gap-2">
              <Monitor className="h-3 w-3" />
              <span>
                Le système utilise actuellement le thème {resolvedTheme === 'dark' ? 'sombre' : 'clair'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default button variant
  const currentTheme = getCurrentTheme();
  const CurrentIcon = currentTheme.icon;
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`gap-2 ${className}`}
          aria-label="Changer le thème"
        >
          <CurrentIcon className="h-4 w-4" />
          {showLabel && (
            <span className="hidden sm:inline">
              {currentTheme.label}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Choisir un thème</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isSelected = theme === themeOption.value;
          
          return (
            <DropdownMenuItem
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value as any)}
              className={`flex items-center gap-2 ${isSelected ? 'bg-primary/10' : ''}`}
            >
              <Icon className="h-4 w-4" />
              <span>{themeOption.label}</span>
              {isSelected && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Export hook pour un contrôle programmatique
export function useThemeControl() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  
  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isSystem: theme === 'system',
  };
}
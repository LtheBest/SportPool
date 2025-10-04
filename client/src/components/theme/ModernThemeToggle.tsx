import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ModernThemeToggle() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const themeLabels = {
    light: 'Clair',
    dark: 'Sombre',
    system: 'Système',
  };

  const themeDescriptions = {
    light: 'Thème clair permanent',
    dark: 'Thème sombre permanent',
    system: `Automatique (${systemTheme === 'dark' ? 'Sombre' : 'Clair'})`,
  };

  const CurrentIcon = themeIcons[theme];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-9 h-9 rounded-full relative group"
          aria-label="Changer le thème"
        >
          <div className="relative w-4 h-4">
            <CurrentIcon className="h-4 w-4 transition-all duration-300 group-hover:scale-110" />
            {theme === 'system' && (
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full border border-background"></div>
            )}
          </div>
          <span className="sr-only">Changer le thème</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={`cursor-pointer ${theme === 'light' ? 'bg-accent' : ''}`}
        >
          <Sun className="mr-3 h-4 w-4" />
          <div className="flex flex-col">
            <span className="font-medium">{themeLabels.light}</span>
            <span className="text-xs text-muted-foreground">
              {themeDescriptions.light}
            </span>
          </div>
          {theme === 'light' && (
            <div className="ml-auto w-2 h-2 bg-primary rounded-full"></div>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={`cursor-pointer ${theme === 'dark' ? 'bg-accent' : ''}`}
        >
          <Moon className="mr-3 h-4 w-4" />
          <div className="flex flex-col">
            <span className="font-medium">{themeLabels.dark}</span>
            <span className="text-xs text-muted-foreground">
              {themeDescriptions.dark}
            </span>
          </div>
          {theme === 'dark' && (
            <div className="ml-auto w-2 h-2 bg-primary rounded-full"></div>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={`cursor-pointer ${theme === 'system' ? 'bg-accent' : ''}`}
        >
          <Monitor className="mr-3 h-4 w-4" />
          <div className="flex flex-col">
            <span className="font-medium">{themeLabels.system}</span>
            <span className="text-xs text-muted-foreground">
              {themeDescriptions.system}
            </span>
          </div>
          {theme === 'system' && (
            <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></div>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Composant simple pour les cas où on veut juste un toggle rapide
export function QuickThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-9 h-9 rounded-full group"
      aria-label="Basculer le thème"
    >
      <div className="relative w-4 h-4 overflow-hidden">
        <Sun className={`absolute h-4 w-4 transition-all duration-500 ${
          resolvedTheme === 'dark' 
            ? 'rotate-90 scale-0 opacity-0' 
            : 'rotate-0 scale-100 opacity-100'
        } group-hover:scale-110`} />
        <Moon className={`absolute h-4 w-4 transition-all duration-500 ${
          resolvedTheme === 'dark' 
            ? 'rotate-0 scale-100 opacity-100' 
            : '-rotate-90 scale-0 opacity-0'
        } group-hover:scale-110`} />
      </div>
      <span className="sr-only">Basculer le thème</span>
    </Button>
  );
}
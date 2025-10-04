import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = [
  {
    value: 'light',
    label: 'Clair',
    description: 'Lumineux et énergique',
    icon: Sun,
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    value: 'dark', 
    label: 'Sombre',
    description: 'Reposant pour les yeux',
    icon: Moon,
    gradient: 'from-indigo-500 to-purple-600',
  },
  {
    value: 'system',
    label: 'Automatique',
    description: 'Suit votre système',
    icon: Monitor,
    gradient: 'from-blue-500 to-cyan-500',
  },
] as const;

export function ModernThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const currentTheme = themes.find(t => t.value === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className={cn(
            "relative h-10 w-10 rounded-full",
            "bg-gradient-to-br",
            currentTheme.gradient,
            "border-0 shadow-lg hover:shadow-xl",
            "transition-all duration-300 ease-out",
            "hover:scale-110 active:scale-95",
            "group"
          )}
          data-testid="button-theme-toggle"
        >
          <CurrentIcon 
            className="h-5 w-5 text-white transition-transform duration-300 group-hover:rotate-12" 
          />
          <span className="sr-only">Changer le thème - {currentTheme.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className={cn(
          "w-64 p-2 backdrop-blur-xl",
          "bg-white/90 dark:bg-gray-900/90",
          "border border-gray-200/50 dark:border-gray-700/50",
          "shadow-2xl rounded-2xl"
        )}
      >
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Thème d'affichage
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Actuellement : <span className="font-medium">{resolvedTheme === 'dark' ? 'Sombre' : 'Clair'}</span>
          </p>
        </div>
        
        <div className="space-y-1">
          {themes.map((themeOption) => {
            const ThemeIcon = themeOption.icon;
            const isActive = theme === themeOption.value;
            
            return (
              <DropdownMenuItem
                key={themeOption.value}
                onClick={() => setTheme(themeOption.value)}
                className={cn(
                  "cursor-pointer rounded-xl p-3 transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20",
                  isActive && "bg-primary/10 dark:bg-primary/20"
                )}
                data-testid={`menuitem-theme-${themeOption.value}`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={cn(
                    "relative h-10 w-10 rounded-lg flex items-center justify-center",
                    "bg-gradient-to-br transition-all duration-200",
                    themeOption.gradient,
                    isActive ? "shadow-lg scale-110" : "opacity-70"
                  )}>
                    <ThemeIcon className="h-5 w-5 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium text-sm transition-colors",
                      isActive && "text-primary"
                    )}>
                      {themeOption.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {themeOption.description}
                    </p>
                  </div>
                  
                  {isActive && (
                    <div className="flex-shrink-0">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
        
        <div className="mt-2 px-3 py-2 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground leading-relaxed">
            💡 Le thème est sauvegardé automatiquement et synchronisé sur tous vos appareils
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

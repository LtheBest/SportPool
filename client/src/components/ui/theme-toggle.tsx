import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const themes = [
  {
    value: 'light',
    label: 'Mode clair',
    description: 'Interface lumineuse et claire',
    icon: 'fas fa-sun',
    color: 'text-yellow-500',
  },
  {
    value: 'dark', 
    label: 'Mode sombre',
    description: 'Interface sombre et moderne',
    icon: 'fas fa-moon',
    color: 'text-blue-400',
  },
  {
    value: 'system',
    label: 'Automatique',
    description: 'Suit les préférences système',
    icon: 'fas fa-desktop',
    color: 'text-gray-500',
  },
] as const;

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const currentTheme = themes.find(t => t.value === theme) || themes[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 w-9 p-0 transition-all duration-200 hover:scale-110"
            >
              <i className={`${currentTheme.icon} text-sm ${currentTheme.color} transition-colors duration-200`} />
              <span className="sr-only">Changer le thème - {currentTheme.label}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Thème: {currentTheme.label}</p>
            <p className="text-xs text-muted-foreground">{currentTheme.description}</p>
          </TooltipContent>
        </Tooltip>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">Apparence</p>
          <p className="text-xs text-muted-foreground">
            Thème actuel: {resolvedTheme === 'dark' ? 'Sombre' : 'Clair'}
          </p>
        </div>
        <DropdownMenuSeparator />
        {themes.map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className="cursor-pointer flex flex-col items-start p-3 space-y-1"
          >
            <div className="flex items-center w-full">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 transition-colors
                ${theme === themeOption.value 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}>
                <i className={`${themeOption.icon} text-xs`} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{themeOption.label}</p>
                <p className="text-xs text-muted-foreground">{themeOption.description}</p>
              </div>
              {theme === themeOption.value && (
                <i className="fas fa-check text-primary ml-2" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground">
            Le thème sera sauvegardé automatiquement
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
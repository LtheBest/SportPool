import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const themes = [
  {
    value: 'light',
    label: 'Clair',
    icon: 'fas fa-sun',
  },
  {
    value: 'dark', 
    label: 'Sombre',
    icon: 'fas fa-moon',
  },
  {
    value: 'system',
    label: 'Système',
    icon: 'fas fa-desktop',
  },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  const currentTheme = themes.find(t => t.value === theme) || themes[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
          <i className={`${currentTheme.icon} text-sm`} />
          <span className="sr-only">Changer le thème</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className="cursor-pointer"
          >
            <i className={`${themeOption.icon} mr-2`} />
            {themeOption.label}
            {theme === themeOption.value && (
              <i className="fas fa-check ml-auto text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
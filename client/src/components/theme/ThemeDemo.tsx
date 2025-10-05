import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Palette, 
  Eye, 
  Moon, 
  Sun, 
  Monitor, 
  Sparkles,
  Zap,
  Star,
  Heart
} from 'lucide-react';

export function ThemeDemo() {
  const { theme, resolvedTheme, isSystemTheme } = useTheme();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Palette className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Thème Moderne
          </h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Découvrez notre nouveau système de thèmes avec des transitions fluides, 
          des couleurs soigneusement sélectionnées et une expérience utilisateur optimisée.
        </p>
      </div>

      {/* Current Theme Info */}
      <Card className="card-shadow animate-fadeIn">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Thème Actuel
          </CardTitle>
          <CardDescription>
            Configuration actuelle de l'apparence de l'application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Thème Sélectionné</div>
              <Badge variant={theme === 'system' ? 'default' : 'secondary'} className="capitalize">
                {theme === 'light' && <Sun className="h-3 w-3 mr-1" />}
                {theme === 'dark' && <Moon className="h-3 w-3 mr-1" />}
                {theme === 'system' && <Monitor className="h-3 w-3 mr-1" />}
                {theme === 'light' ? 'Clair' : theme === 'dark' ? 'Sombre' : 'Système'}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Apparence Actuelle</div>
              <Badge variant="outline" className="capitalize">
                {resolvedTheme === 'dark' ? (
                  <>
                    <Moon className="h-3 w-3 mr-1" />
                    Sombre
                  </>
                ) : (
                  <>
                    <Sun className="h-3 w-3 mr-1" />
                    Clair
                  </>
                )}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Mode Auto</div>
              <Badge variant={isSystemTheme ? 'default' : 'secondary'}>
                {isSystemTheme ? 'Activé' : 'Désactivé'}
              </Badge>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Changer le thème</span>
              <ThemeToggle variant="card" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Smooth Transitions */}
        <Card className="card-shadow animate-slideInLeft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Transitions Fluides
            </CardTitle>
            <CardDescription>
              Changements de thème avec animations douces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 border transition-all duration-300">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium">Animation 300ms</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Les couleurs, les ombres et les éléments d'interface changent en douceur 
                lors du basculement entre les thèmes.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Colors */}
        <Card className="card-shadow animate-slideInRight">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-blue-500" />
              Couleurs Optimisées
            </CardTitle>
            <CardDescription>
              Palette de couleurs moderne et accessible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { name: 'Primary', class: 'bg-primary' },
                  { name: 'Secondary', class: 'bg-secondary' },
                  { name: 'Accent', class: 'bg-accent' },
                  { name: 'Muted', class: 'bg-muted' },
                ].map((color) => (
                  <div key={color.name} className="text-center">
                    <div className={`w-full h-8 rounded-md ${color.class} transition-colors`} />
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {color.name}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Contraste amélioré et lisibilité optimisée pour tous les environnements.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* System Integration */}
        <Card className="card-shadow animate-fadeIn">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-purple-500" />
              Intégration Système
            </CardTitle>
            <CardDescription>
              Synchronisation automatique avec les préférences OS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 border transition-all duration-300">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium">Mode Système Actif</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Détection automatique des préférences système et adaptation en temps réel.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* User Experience */}
        <Card className="card-shadow animate-fadeIn">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Expérience Utilisateur
            </CardTitle>
            <CardDescription>
              Confort visuel et accessibilité améliorée
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Barres de défilement stylisées</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Focus amélioré</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Ombres modernes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Animations fluides</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center pt-4">
        <ThemeToggle variant="button" showLabel className="modern-button" />
        <Button variant="outline" className="modern-button">
          <Sparkles className="h-4 w-4 mr-2" />
          Tester les Animations
        </Button>
      </div>
    </div>
  );
}
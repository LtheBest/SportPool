import React, { useEffect, useState, createContext, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Cookie, BarChart3, Settings, Users, Zap } from "lucide-react";

interface CookiePreferences {
  essential: boolean; // Toujours true, non désactivable
  analytics: boolean;
  functional: boolean;
  performance: boolean;
  marketing: boolean;
}

interface CookieConsent {
  timestamp: string;
  version: string;
  preferences: CookiePreferences;
  userAgent?: string;
  ipHash?: string;
}

// Service de gestion des cookies
export class CookieService {
  private static readonly CONSENT_KEY = "sportpool_cookie_consent";
  private static readonly CONSENT_VERSION = "2.0";
  
  static getConsent(): CookieConsent | null {
    try {
      const stored = localStorage.getItem(this.CONSENT_KEY);
      if (stored) {
        const consent = JSON.parse(stored) as CookieConsent;
        // Vérifier si la version du consentement est à jour
        if (consent.version !== this.CONSENT_VERSION) {
          return null; // Forcer un nouveau consentement
        }
        return consent;
      }
    } catch (error) {
      console.error("Error reading cookie consent:", error);
    }
    return null;
  }

  static saveConsent(preferences: CookiePreferences): void {
    const consent: CookieConsent = {
      timestamp: new Date().toISOString(),
      version: this.CONSENT_VERSION,
      preferences: {
        ...preferences,
        essential: true // Toujours true
      },
      userAgent: navigator.userAgent,
    };

    try {
      localStorage.setItem(this.CONSENT_KEY, JSON.stringify(consent));
      this.applyCookieSettings(preferences);
    } catch (error) {
      console.error("Error saving cookie consent:", error);
    }
  }

  static clearConsent(): void {
    localStorage.removeItem(this.CONSENT_KEY);
    // Nettoyer tous les cookies non essentiels
    this.clearNonEssentialCookies();
  }

  private static applyCookieSettings(preferences: CookiePreferences): void {
    // Appliquer les paramètres de cookies selon les préférences
    
    // Analytics (Google Analytics, etc.)
    if (preferences.analytics) {
      this.enableAnalytics();
    } else {
      this.disableAnalytics();
    }

    // Performance (monitoring, métriques)
    if (preferences.performance) {
      this.enablePerformanceTracking();
    } else {
      this.disablePerformanceTracking();
    }

    // Marketing (pixels de suivi, publicité)
    if (preferences.marketing) {
      this.enableMarketing();
    } else {
      this.disableMarketing();
    }

    // Fonctionnel (préférences utilisateur, chat, etc.)
    if (preferences.functional) {
      this.enableFunctionalCookies();
    } else {
      this.disableFunctionalCookies();
    }
  }

  private static enableAnalytics(): void {
    // Implémenter Google Analytics ou autre service d'analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }
    console.log("Analytics enabled");
  }

  private static disableAnalytics(): void {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied'
      });
    }
    console.log("Analytics disabled");
  }

  private static enablePerformanceTracking(): void {
    // Activer les outils de monitoring de performance
    console.log("Performance tracking enabled");
  }

  private static disablePerformanceTracking(): void {
    console.log("Performance tracking disabled");
  }

  private static enableMarketing(): void {
    // Activer les pixels de suivi marketing
    console.log("Marketing cookies enabled");
  }

  private static disableMarketing(): void {
    console.log("Marketing cookies disabled");
  }

  private static enableFunctionalCookies(): void {
    // Activer les cookies fonctionnels (préférences, thème, etc.)
    console.log("Functional cookies enabled");
  }

  private static disableFunctionalCookies(): void {
    console.log("Functional cookies disabled");
  }

  private static clearNonEssentialCookies(): void {
    // Nettoyer tous les cookies non essentiels
    const cookies = document.cookie.split(';');
    
    // Liste des cookies essentiels à préserver
    const essentialCookies = [
      'sportpool_access_token',
      'sportpool_refresh_token',
      this.CONSENT_KEY
    ];

    cookies.forEach(cookie => {
      const [name] = cookie.split('=');
      const cleanName = name.trim();
      
      if (!essentialCookies.includes(cleanName)) {
        // Supprimer le cookie
        document.cookie = `${cleanName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `${cleanName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
      }
    });
  }

  static hasConsent(type: keyof CookiePreferences): boolean {
    const consent = this.getConsent();
    return consent ? consent.preferences[type] : false;
  }
}

// Context pour les cookies
const CookieContext = createContext<{
  consent: CookieConsent | null;
  hasConsented: boolean;
  updateConsent: (preferences: CookiePreferences) => void;
  clearConsent: () => void;
}>({
  consent: null,
  hasConsented: false,
  updateConsent: () => {},
  clearConsent: () => {}
});

export const useCookies = () => useContext(CookieContext);

interface CookieProviderProps {
  children: React.ReactNode;
}

export function CookieProvider({ children }: CookieProviderProps) {
  const [consent, setConsent] = useState<CookieConsent | null>(null);

  useEffect(() => {
    const storedConsent = CookieService.getConsent();
    setConsent(storedConsent);
  }, []);

  const updateConsent = (preferences: CookiePreferences) => {
    CookieService.saveConsent(preferences);
    setConsent(CookieService.getConsent());
  };

  const clearConsent = () => {
    CookieService.clearConsent();
    setConsent(null);
  };

  return (
    <CookieContext.Provider
      value={{
        consent,
        hasConsented: !!consent,
        updateConsent,
        clearConsent
      }}
    >
      {children}
    </CookieContext.Provider>
  );
}

export function CookieBanner() {
  const { consent, updateConsent } = useCookies();
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: true,
    functional: true,
    performance: false,
    marketing: false
  });

  // Si le consentement existe, ne pas afficher la bannière
  if (consent) {
    return null;
  }

  const cookieCategories = [
    {
      id: 'essential' as keyof CookiePreferences,
      title: 'Cookies essentiels',
      description: 'Nécessaires au fonctionnement de base du site. Ne peuvent pas être désactivés.',
      icon: Shield,
      required: true,
      examples: 'Authentification, sécurité, navigation'
    },
    {
      id: 'functional' as keyof CookiePreferences,
      title: 'Cookies fonctionnels',
      description: 'Améliorent votre expérience en se souvenant de vos préférences.',
      icon: Settings,
      required: false,
      examples: 'Thème, langue, préférences d\'affichage'
    },
    {
      id: 'analytics' as keyof CookiePreferences,
      title: 'Cookies analytiques',
      description: 'Nous aident à comprendre comment vous utilisez notre site.',
      icon: BarChart3,
      required: false,
      examples: 'Google Analytics, statistiques de visite'
    },
    {
      id: 'performance' as keyof CookiePreferences,
      title: 'Cookies de performance',
      description: 'Surveillent les performances et améliorent la vitesse du site.',
      icon: Zap,
      required: false,
      examples: 'Monitoring, métriques de performance'
    },
    {
      id: 'marketing' as keyof CookiePreferences,
      title: 'Cookies marketing',
      description: 'Permettent de personnaliser la publicité et le contenu.',
      icon: Users,
      required: false,
      examples: 'Pixels de suivi, publicité ciblée'
    }
  ];

  const handleAcceptAll = () => {
    updateConsent({
      essential: true,
      analytics: true,
      functional: true,
      performance: true,
      marketing: true
    });
  };

  const handleRejectAll = () => {
    updateConsent({
      essential: true,
      analytics: false,
      functional: false,
      performance: false,
      marketing: false
    });
  };

  const handleSavePreferences = () => {
    updateConsent(preferences);
    setShowPreferences(false);
  };

  const togglePreference = (key: keyof CookiePreferences) => {
    if (key === 'essential') return; // Les cookies essentiels ne peuvent pas être désactivés
    
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <>
      {/* Bannière principale */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Nous respectons votre vie privée
                </h3>
                <p className="text-sm text-gray-600">
                  Ce site utilise des cookies pour améliorer votre expérience, 
                  analyser le trafic et personnaliser le contenu. 
                  <button 
                    onClick={() => setShowPreferences(true)}
                    className="text-blue-600 hover:text-blue-800 underline ml-1"
                  >
                    Gérer les préférences
                  </button>
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 lg:ml-4">
              <Button 
                variant="outline" 
                onClick={handleRejectAll}
                className="text-sm"
              >
                Refuser
              </Button>
              <Button 
                onClick={handleAcceptAll}
                className="text-sm"
              >
                Accepter tout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal des préférences */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5" />
              Gestion des cookies
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Personnalisez vos préférences de cookies. Vous pouvez modifier ces paramètres 
              à tout moment dans les paramètres de votre compte.
            </p>

            <div className="grid gap-4">
              {cookieCategories.map((category) => {
                const IconComponent = category.icon;
                const isEnabled = preferences[category.id];
                
                return (
                  <Card key={category.id} className={`transition-colors ${
                    isEnabled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <IconComponent className="w-5 h-5 text-blue-600" />
                          <div>
                            <CardTitle className="text-base">{category.title}</CardTitle>
                            <CardDescription className="text-sm">
                              {category.description}
                            </CardDescription>
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => togglePreference(category.id)}
                          disabled={category.required}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-gray-500">
                        Exemples: {category.examples}
                      </p>
                      {category.required && (
                        <p className="text-xs text-blue-600 mt-1">
                          Requis pour le fonctionnement du site
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPreferences(false)}>
                Annuler
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setPreferences({
                      essential: true,
                      analytics: false,
                      functional: false,
                      performance: false,
                      marketing: false
                    });
                  }}
                >
                  Refuser tout
                </Button>
                <Button onClick={handleSavePreferences}>
                  Sauvegarder les préférences
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CookieBanner;
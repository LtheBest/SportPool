import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Configuration des règles de réécriture d'URL
const URL_REWRITE_RULES = {
  // Règles de sécurité - bloquer les patterns dangereux
  security: [
    /[<>'"(){}[\];:\\|`~!@#$%^&*+=]/,  // Caractères potentiellement dangereux
    /\.\./,                            // Tentatives de path traversal
    /javascript:/i,                    // Tentatives d'injection JavaScript
    /data:/i,                         // Tentatives d'injection data URI
    /vbscript:/i,                     // Scripts VBScript
    /__proto__|constructor|prototype/i // Pollution de prototype
  ],
  
  // Règles de redirection SEO-friendly
  seoRedirects: {
    // Anciens patterns vers nouveaux
    '/event/': '/evenements/',
    '/events/': '/evenements/',
    '/dashboard/': '/tableau-de-bord/',
    '/profile/': '/profil/',
    '/messages/': '/messagerie/',
    '/participants/': '/participants/',
    '/invitations/': '/invitations/'
  },
  
  // Patterns d'URL canoniques pour SEO
  canonicalPatterns: {
    '/evenements/:id': '/evenements/{id}',
    '/tableau-de-bord': '/tableau-de-bord',
    '/profil': '/profil',
    '/messagerie': '/messagerie'
  }
};

// Service de validation et nettoyage d'URL
export class UrlSecurityService {
  /**
   * Valide une URL pour détecter les tentatives d'attaques
   */
  static validateUrl(url: string): { isValid: boolean; reason?: string } {
    // Vérifier les patterns de sécurité
    for (const pattern of URL_REWRITE_RULES.security) {
      if (pattern.test(url)) {
        return {
          isValid: false,
          reason: `URL contains potentially dangerous pattern: ${pattern.source}`
        };
      }
    }

    // Vérifier la longueur de l'URL
    if (url.length > 2048) {
      return {
        isValid: false,
        reason: 'URL too long (potential buffer overflow attack)'
      };
    }

    // Vérifier l'encodage
    try {
      decodeURIComponent(url);
    } catch (error) {
      return {
        isValid: false,
        reason: 'Invalid URL encoding'
      };
    }

    return { isValid: true };
  }

  /**
   * Nettoie et normalise une URL
   */
  static sanitizeUrl(url: string): string {
    // Décoder et réencoder pour normaliser
    let sanitized = decodeURIComponent(url);
    
    // Supprimer les caractères dangereux
    sanitized = sanitized.replace(/[<>'"(){}[\];:\\|`~]/g, '');
    
    // Normaliser les slashes
    sanitized = sanitized.replace(/\/+/g, '/');
    
    // Supprimer le trailing slash sauf pour la racine
    if (sanitized.length > 1 && sanitized.endsWith('/')) {
      sanitized = sanitized.slice(0, -1);
    }
    
    return sanitized;
  }

  /**
   * Applique les règles de redirection SEO
   */
  static applySEORedirects(url: string): string | null {
    for (const [oldPattern, newPattern] of Object.entries(URL_REWRITE_RULES.seoRedirects)) {
      if (url.startsWith(oldPattern)) {
        return url.replace(oldPattern, newPattern);
      }
    }
    return null;
  }

  /**
   * Génère une URL canonique pour SEO
   */
  static getCanonicalUrl(pathname: string, search: string = ''): string {
    const baseUrl = import.meta.env.VITE_APP_URL || 'https://sportpool.onrender.com';
    const cleanPath = this.sanitizeUrl(pathname);
    const cleanSearch = search && !search.includes('?') ? `?${search}` : search;
    
    return `${baseUrl}${cleanPath}${cleanSearch}`;
  }
}

interface UrlRewriterProps {
  children: React.ReactNode;
}

export function UrlRewriter({ children }: UrlRewriterProps) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const currentUrl = location.pathname + location.search;
    
    // 1. Valider la sécurité de l'URL
    const validation = UrlSecurityService.validateUrl(currentUrl);
    if (!validation.isValid) {
      console.warn('Potentially dangerous URL detected:', validation.reason);
      // Rediriger vers la page d'accueil en cas d'URL suspecte
      navigate('/', { replace: true });
      return;
    }

    // 2. Vérifier les redirections SEO
    const seoRedirect = UrlSecurityService.applySEORedirects(location.pathname);
    if (seoRedirect) {
      navigate(seoRedirect + location.search, { replace: true });
      return;
    }

    // 3. Nettoyer l'URL si nécessaire
    const sanitizedPath = UrlSecurityService.sanitizeUrl(location.pathname);
    if (sanitizedPath !== location.pathname) {
      navigate(sanitizedPath + location.search, { replace: true });
    }

    // 4. Mise à jour des métadonnées SEO
    updateSEOMetadata(location.pathname);
  }, [location, navigate]);

  return <>{children}</>;
}

// Fonction pour mettre à jour les métadonnées SEO
function updateSEOMetadata(pathname: string) {
  const head = document.head;
  
  // Mettre à jour l'URL canonique
  let canonicalLink = head.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    head.appendChild(canonicalLink);
  }
  canonicalLink.href = UrlSecurityService.getCanonicalUrl(pathname);

  // Mettre à jour les métadonnées spécifiques aux pages
  const pageMetadata = getPageMetadata(pathname);
  updateMetaTag('description', pageMetadata.description);
  updateMetaTag('keywords', pageMetadata.keywords);
  
  // Open Graph
  updateMetaTag('og:url', canonicalLink.href, 'property');
  updateMetaTag('og:title', pageMetadata.title, 'property');
  updateMetaTag('og:description', pageMetadata.description, 'property');
  
  // Twitter Card
  updateMetaTag('twitter:url', canonicalLink.href, 'name');
  updateMetaTag('twitter:title', pageMetadata.title, 'name');
  updateMetaTag('twitter:description', pageMetadata.description, 'name');

  // Mise à jour du titre
  document.title = pageMetadata.title;
}

function updateMetaTag(name: string, content: string, attribute: string = 'name') {
  let metaTag = document.head.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.setAttribute(attribute, name);
    document.head.appendChild(metaTag);
  }
  metaTag.content = content;
}

function getPageMetadata(pathname: string): { title: string; description: string; keywords: string } {
  const baseTitle = 'SportPool - Covoiturage Sportif';
  
  const metadata = {
    '/': {
      title: baseTitle,
      description: 'Plateforme de covoiturage pour événements sportifs. Organisez et participez facilement aux événements sportifs avec du covoiturage intelligent.',
      keywords: 'covoiturage, sport, événements, transport, communauté, organisation'
    },
    '/evenements': {
      title: `Événements - ${baseTitle}`,
      description: 'Découvrez tous les événements sportifs disponibles et rejoignez la communauté SportPool.',
      keywords: 'événements sportifs, inscription, covoiturage, sport, activités'
    },
    '/tableau-de-bord': {
      title: `Tableau de bord - ${baseTitle}`,
      description: 'Gérez vos événements, participants et messages depuis votre tableau de bord personnalisé.',
      keywords: 'dashboard, gestion, organisateur, événements, statistiques'
    },
    '/profil': {
      title: `Profil - ${baseTitle}`,
      description: 'Gérez votre profil et vos préférences sur SportPool.',
      keywords: 'profil, paramètres, organisation, compte'
    },
    '/messagerie': {
      title: `Messagerie - ${baseTitle}`,
      description: 'Communiquez avec vos participants et organisateurs.',
      keywords: 'messagerie, communication, participants, organisateur'
    }
  };

  // Gestion des pages dynamiques
  if (pathname.startsWith('/evenements/')) {
    return {
      title: `Événement - ${baseTitle}`,
      description: 'Détails de l\'événement sportif et inscription au covoiturage.',
      keywords: 'événement, inscription, covoiturage, détails, sport'
    };
  }

  return metadata[pathname as keyof typeof metadata] || metadata['/'];
}

// Hook personnalisé pour utiliser les fonctionnalités URL
export function useUrlSecurity() {
  const location = useLocation();
  const navigate = useNavigate();

  const navigateSecure = (to: string, options?: any) => {
    const validation = UrlSecurityService.validateUrl(to);
    if (!validation.isValid) {
      console.warn('Blocked navigation to potentially dangerous URL:', validation.reason);
      return;
    }
    
    const sanitizedUrl = UrlSecurityService.sanitizeUrl(to);
    navigate(sanitizedUrl, options);
  };

  const getCurrentCanonicalUrl = () => {
    return UrlSecurityService.getCanonicalUrl(location.pathname, location.search);
  };

  return {
    navigateSecure,
    getCurrentCanonicalUrl,
    validateUrl: UrlSecurityService.validateUrl,
    sanitizeUrl: UrlSecurityService.sanitizeUrl
  };
}

export default UrlRewriter;
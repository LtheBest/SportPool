// Configuration pour différents environnements
export const config = {
  // API Base URL - s'adapte automatiquement à l'environnement
  apiBaseUrl: (() => {
    // En développement local
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'https://sportpool.onrender.com';
    }
    
    // En production ou preview, utiliser l'URL courante
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    
    // Fallback pour SSR ou environnements sans window
    return '';
  })(),

  // Configuration pour différents environnements
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // URLs spécifiques par environnement
  environments: {
    development: {
      apiUrl: 'https://sportpool.onrender.com',
      wsUrl: 'ws://sportpool.onrender.com/'
    },
    production: {
      apiUrl: '', // Sera l'origine courante
      wsUrl: '' // Sera l'origine courante avec ws://
    }
  }
};

// Helper pour construire des URLs absolues
export function buildApiUrl(path: string): string {
  const baseUrl = config.apiBaseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  if (baseUrl) {
    return `${baseUrl}${cleanPath}`;
  }
  
  // Si pas de baseUrl (ex: même origine), retourner le path tel quel
  return cleanPath;
}

// Helper pour vérifier si on est sur Render
export function isRenderEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('onrender.com');
}

// Helper pour vérifier si on est sur Vercel  
export function isVercelEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('vercel.app');
}

// Configuration des headers par défaut
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Configuration de timeout pour les requêtes
export const requestTimeout = {
  development: 10000, // 10s en dev
  production: 30000   // 30s en prod
};
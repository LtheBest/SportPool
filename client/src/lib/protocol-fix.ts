/**
 * Utilitaires pour détecter et corriger les problèmes de protocole HTTP/HTTPS
 * qui causent des pages blanches dans certains navigateurs
 */

// Types
interface ProtocolInfo {
  current: string;
  optimal: string;
  needsRedirect: boolean;
  reason?: string;
}

/**
 * Détecte le protocole optimal pour l'environnement actuel
 */
export function detectOptimalProtocol(): ProtocolInfo {
  if (typeof window === 'undefined') {
    return {
      current: 'https:',
      optimal: 'https:',
      needsRedirect: false,
    };
  }

  const { protocol, hostname, port } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const isProduction = hostname.includes('onrender.com') || hostname.includes('vercel.app');

  // En développement local
  if (isLocal) {
    // Pour localhost, nous acceptons HTTP et HTTPS
    // Pas de redirection nécessaire en local
    return {
      current: protocol,
      optimal: protocol, // Garder le protocole actuel en local
      needsRedirect: false,
    };
  }

  // En production
  if (isProduction) {
    const needsHttpsRedirect = protocol === 'http:';
    return {
      current: protocol,
      optimal: 'https:',
      needsRedirect: needsHttpsRedirect,
      reason: needsHttpsRedirect ? 'Production environments require HTTPS' : undefined,
    };
  }

  // Pour tous les autres cas, HTTPS est préférable
  const needsHttpsRedirect = protocol === 'http:';
  return {
    current: protocol,
    optimal: 'https:',
    needsRedirect: needsHttpsRedirect,
    reason: needsHttpsRedirect ? 'HTTPS is more secure' : undefined,
  };
}

/**
 * Applique une redirection HTTPS si nécessaire (uniquement en production)
 */
export function enforceOptimalProtocol(): void {
  if (typeof window === 'undefined') return;

  const protocolInfo = detectOptimalProtocol();

  // Ne rediriger que si c'est vraiment nécessaire et que nous ne sommes pas en local
  if (protocolInfo.needsRedirect && !isLocalEnvironment()) {
    const newUrl = window.location.href.replace(/^http:/, 'https:');
    
    console.info(`🔒 Redirecting to HTTPS for security: ${newUrl}`);
    
    // Redirection douce pour éviter les erreurs
    try {
      window.location.replace(newUrl);
    } catch (error) {
      console.warn('Protocol redirection failed:', error);
      // Si la redirection échoue, continuer avec le protocole actuel
    }
  }
}

/**
 * Vérifie si nous sommes dans un environnement local
 */
export function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname.startsWith('192.168.') ||
         hostname.startsWith('10.') ||
         hostname.endsWith('.local');
}

/**
 * Vérifie si nous sommes dans un environnement de production
 */
export function isProductionEnvironment(): boolean {
  if (typeof window === 'undefined') return true; // Assume production by default
  
  const hostname = window.location.hostname;
  return hostname.includes('onrender.com') || 
         hostname.includes('vercel.app') ||
         hostname.includes('netlify.app') ||
         (!isLocalEnvironment() && hostname !== 'localhost');
}

/**
 * Obtient l'URL de base appropriée pour les requêtes API
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.VITE_API_URL || 'https://teammove.onrender.com';
  }

  const { protocol, hostname, port } = window.location;

  // En développement local, utiliser le même protocole et port 8080
  if (isLocalEnvironment()) {
    const apiPort = port === '3000' ? '8080' : port || '8080';
    return `${protocol}//${hostname}:${apiPort}`;
  }

  // En production, utiliser HTTPS et le même hostname
  if (isProductionEnvironment()) {
    return `https://${hostname}`;
  }

  // Fallback
  return window.location.origin;
}

/**
 * Initialise la détection et correction du protocole
 * À appeler au début de l'application
 */
export function initializeProtocolHandling(): void {
  // Log des informations de protocole pour le debug
  const protocolInfo = detectOptimalProtocol();
  
  console.info('🌐 Protocol Detection:', {
    environment: isLocalEnvironment() ? 'local' : (isProductionEnvironment() ? 'production' : 'other'),
    current: protocolInfo.current,
    optimal: protocolInfo.optimal,
    needsRedirect: protocolInfo.needsRedirect,
    reason: protocolInfo.reason,
    apiBaseUrl: getApiBaseUrl(),
  });

  // Appliquer la redirection si nécessaire (seulement en production)
  if (!isLocalEnvironment()) {
    enforceOptimalProtocol();
  }
}

/**
 * Middleware pour gérer les erreurs de mixed content
 */
export function handleMixedContentErrors(): void {
  // Écouter les erreurs de sécurité
  window.addEventListener('securitypolicyviolation', (event) => {
    if (event.blockedURI && event.blockedURI.startsWith('http:')) {
      console.warn('🚫 Mixed content blocked:', event.blockedURI);
      
      // Suggérer une solution
      const httpsUrl = event.blockedURI.replace(/^http:/, 'https:');
      console.info('💡 Try using HTTPS version:', httpsUrl);
    }
  });

  // Écouter les erreurs de réseau générales
  window.addEventListener('error', (event) => {
    const target = event.target as HTMLElement;
    
    if (target?.tagName === 'SCRIPT' || target?.tagName === 'LINK') {
      const src = (target as any).src || (target as any).href;
      
      if (src && src.startsWith('http:') && window.location.protocol === 'https:') {
        console.warn('🚫 Mixed content error for:', src);
        console.info('💡 Consider using HTTPS or relative URLs');
      }
    }
  });
}
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JWTPayload } from '../auth';

// Configuration JWT
const JWT_CONFIG = {
  ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_SECRET || "access-secret-key-change-in-production",
  REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_TOKEN_SECRET || "refresh-secret-key-change-in-production",
  ISSUER: process.env.JWT_ISSUER || "TeamMove",
};

// Interface pour les requêtes authentifiées
export interface AuthenticatedRequest extends Request {
  user?: {
    organizationId: string;
    email: string;
    name: string;
    organization?: any; // Objet organisation complet
  };
}

/**
 * Middleware pour vérifier l'authentification JWT
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'accès requis',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.slice(7); // Supprimer "Bearer "
    
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, JWT_CONFIG.ACCESS_TOKEN_SECRET) as JWTPayload;
    
    // Vérifier que c'est bien un token d'accès
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Type de token invalide',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Vérifier l'issuer
    if (decoded.iss !== JWT_CONFIG.ISSUER) {
      return res.status(401).json({
        success: false,
        error: 'Issuer du token invalide',
        code: 'INVALID_ISSUER'
      });
    }

    // Ajouter les informations utilisateur à la requête
    req.user = {
      organizationId: decoded.organizationId,
      email: decoded.email,
      name: decoded.name,
      // L'objet organization sera ajouté par un autre middleware si nécessaire
    };

    next();
  } catch (error: any) {
    console.error('❌ Erreur vérification JWT:', error);
    
    let errorCode = 'INVALID_TOKEN';
    let errorMessage = 'Token invalide';
    
    if (error.name === 'TokenExpiredError') {
      errorCode = 'TOKEN_EXPIRED';
      errorMessage = 'Token expiré';
    } else if (error.name === 'JsonWebTokenError') {
      errorCode = 'MALFORMED_TOKEN';
      errorMessage = 'Token malformé';
    }
    
    return res.status(401).json({
      success: false,
      error: errorMessage,
      code: errorCode
    });
  }
}

/**
 * Middleware pour enrichir les données utilisateur avec l'organisation complète
 */
export async function enrichUserData(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return next();
  }

  try {
    // Importer dynamiquement pour éviter les dépendances circulaires
    const { db, organizations } = await import('../db/index');
    const { eq } = await import('drizzle-orm');
    
    // Récupérer l'organisation complète
    const orgResult = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, req.user.organizationId))
      .limit(1);
      
    if (orgResult.length > 0) {
      req.user.organization = orgResult[0];
    } else {
      return res.status(404).json({
        success: false,
        error: 'Organisation non trouvée',
        code: 'ORG_NOT_FOUND'
      });
    }
    
    next();
  } catch (error) {
    console.error('❌ Erreur enrichissement données utilisateur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la vérification utilisateur',
      code: 'USER_DATA_ERROR'
    });
  }
}

/**
 * Middleware combiné : authentification + enrichissement des données
 */
export function requireAuthWithOrg(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, (authError) => {
    if (authError) return;
    
    enrichUserData(req, res, next);
  });
}
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";

// Configuration JWT sécurisée
const JWT_CONFIG = {
  ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_SECRET || "access-secret-key-change-in-production",
  REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_SECRET || "refresh-secret-key-change-in-production", 
  ACCESS_TOKEN_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m", // 15 minutes par défaut
  REFRESH_TOKEN_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d", // 7 jours par défaut
  ISSUER: process.env.JWT_ISSUER || "TeamMove",
  ALGORITHM: "HS256" as const,
};

// Interface pour les claims JWT
export interface JWTPayload {
  organizationId: string;
  email: string;
  name: string;
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
  iss?: string;
}

// Interface pour l'utilisateur authentifié dans la requête
export interface AuthenticatedRequest extends Request {
  user: {
    organizationId: string;
    email: string;
    name: string;
  };
}

/**
 * Génère un token d'accès JWT sécurisé
 */
export function generateAccessToken(payload: Omit<JWTPayload, "type" | "iat" | "exp" | "iss">): string {
  return jwt.sign(
    {
      ...payload,
      type: "access",
    },
    JWT_CONFIG.ACCESS_TOKEN_SECRET,
    {
      expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRES_IN,
      issuer: JWT_CONFIG.ISSUER,
      algorithm: JWT_CONFIG.ALGORITHM,
    }
  );
}

/**
 * Génère un token de rafraîchissement JWT sécurisé
 */
export function generateRefreshToken(payload: Omit<JWTPayload, "type" | "iat" | "exp" | "iss">): string {
  return jwt.sign(
    {
      ...payload,
      type: "refresh",
    },
    JWT_CONFIG.REFRESH_TOKEN_SECRET,
    {
      expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRES_IN,
      issuer: JWT_CONFIG.ISSUER,
      algorithm: JWT_CONFIG.ALGORITHM,
    }
  );
}

/**
 * Vérifie et décode un token d'accès JWT
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.ACCESS_TOKEN_SECRET, {
      issuer: JWT_CONFIG.ISSUER,
      algorithms: [JWT_CONFIG.ALGORITHM],
    }) as JWTPayload;

    if (decoded.type !== "access") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    throw new Error("Invalid access token");
  }
}

/**
 * Vérifie et décode un token de rafraîchissement JWT
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.REFRESH_TOKEN_SECRET, {
      issuer: JWT_CONFIG.ISSUER,
      algorithms: [JWT_CONFIG.ALGORITHM],
    }) as JWTPayload;

    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
}

/**
 * Hash un mot de passe de manière sécurisée
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Augmenté pour plus de sécurité
  return bcrypt.hash(password, saltRounds);
}

/**
 * Vérifie un mot de passe contre son hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Middleware d'authentification JWT
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extraire le token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ 
        message: "Access token required",
        code: "NO_TOKEN"
      });
      return;
    }

    // Vérifier le format "Bearer <token>"
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      res.status(401).json({ 
        message: "Invalid token format. Expected: Bearer <token>",
        code: "INVALID_TOKEN_FORMAT"
      });
      return;
    }

    const token = parts[1];

    // Vérifier et décoder le token
    const decoded = verifyAccessToken(token);

    // Ajouter les informations utilisateur à la requête
    (req as AuthenticatedRequest).user = {
      organizationId: decoded.organizationId,
      email: decoded.email,
      name: decoded.name,
    };

    console.log(`✅ JWT Auth success for organization: ${decoded.organizationId}`);
    next();
  } catch (error) {
    console.error("JWT Auth error:", error);
    
    let errorCode = "INVALID_TOKEN";
    let message = "Invalid or expired access token";

    if (error instanceof jwt.TokenExpiredError) {
      errorCode = "TOKEN_EXPIRED";
      message = "Access token expired";
    } else if (error instanceof jwt.JsonWebTokenError) {
      errorCode = "MALFORMED_TOKEN";
      message = "Malformed access token";
    }

    res.status(401).json({ 
      message,
      code: errorCode
    });
  }
}

/**
 * Middleware optionnel d'authentification JWT (ne rejette pas si pas de token)
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      next();
      return;
    }

    const token = parts[1];
    const decoded = verifyAccessToken(token);

    (req as AuthenticatedRequest).user = {
      organizationId: decoded.organizationId,
      email: decoded.email,
      name: decoded.name,
    };

    next();
  } catch (error) {
    // En cas d'erreur, continuer sans authentification
    next();
  }
}

/**
 * Génère une paire de tokens (access + refresh)
 */
export function generateTokenPair(payload: Omit<JWTPayload, "type" | "iat" | "exp" | "iss">) {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRES_IN,
  };
}

/**
 * Extrait le token depuis l'en-tête Authorization
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}

/**
 * Valide la force d'un mot de passe
 */
export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Le mot de passe doit contenir au moins 8 caractères");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une lettre minuscule");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une lettre majuscule");
  }

  if (!/\d/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un caractère spécial");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
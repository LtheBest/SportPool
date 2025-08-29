import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT-based session for Vercel (stateless)
const JWT_SECRET = process.env.SESSION_SECRET || 'fallback-secret-key';
const JWT_EXPIRY = '7d';

export interface SessionData {
  organizationId?: string;
  [key: string]: any;
}

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      session: SessionData & {
        save: () => Promise<void>;
        destroy: () => Promise<void>;
      };
    }
  }
}

export function createVercelSession() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Initialize empty session
    let sessionData: SessionData = {};

    // Try to read JWT from cookie or Authorization header
    const token = req.cookies?.session || 
                  req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        sessionData = jwt.verify(token, JWT_SECRET) as SessionData;
      } catch (error) {
        console.warn('Invalid session token:', error.message);
        sessionData = {};
      }
    }

    // Create session object with methods
    req.session = {
      ...sessionData,
      save: async () => {
        const newToken = jwt.sign(sessionData, JWT_SECRET, { expiresIn: JWT_EXPIRY });
        
        // Set as HTTP-only cookie
        res.cookie('session', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Also send in response header for client-side access if needed
        res.setHeader('X-Session-Token', newToken);
      },
      destroy: async () => {
        res.clearCookie('session');
        res.removeHeader('X-Session-Token');
        Object.keys(sessionData).forEach(key => {
          delete sessionData[key];
        });
      }
    };

    // Proxy to update sessionData when properties are set
    req.session = new Proxy(req.session, {
      set(target, prop: string, value) {
        if (prop !== 'save' && prop !== 'destroy') {
          sessionData[prop] = value;
        }
        target[prop] = value;
        return true;
      }
    });

    next();
  };
}

// Cookie parser middleware (simple implementation)
export function cookieParser() {
  return (req: Request, res: Response, next: NextFunction) => {
    req.cookies = {};
    
    if (req.headers.cookie) {
      req.headers.cookie.split(';').forEach(cookie => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name && rest.length > 0) {
          req.cookies[name] = decodeURIComponent(rest.join('='));
        }
      });
    }

    next();
  };
}
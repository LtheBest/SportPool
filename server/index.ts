import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes-jwt"; // Switch to JWT routes
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// ========== MIDDLEWARES DE SÉCURITÉ ==========
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for development
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting pour les API
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Limiter plus strictement les routes sensibles
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 10, // limit each IP to 10 requests per windowMs
  skipSuccessfulRequests: true,
  message: 'Trop de tentatives, veuillez réessayer plus tard.',
});
app.use(['/api/login', '/api/register', '/api/forgot-password'], strictLimiter);

// Redirection HTTPS en production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(301, `https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// URL rewriting pour SEO
app.use((req, res, next) => {
  // Normaliser les URLs (retirer trailing slashes sauf pour root)
  if (req.path !== '/' && req.path.endsWith('/')) {
    const query = req.url.slice(req.path.length);
    res.redirect(301, req.path.slice(0, -1) + query);
    return;
  }

  // Convertir en minuscules
  if (req.path !== req.path.toLowerCase()) {
    const query = req.url.slice(req.path.length);
    res.redirect(301, req.path.toLowerCase() + query);
    return;
  }

  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '8080', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║            🏆 Covoit Sports by LtheBest 🏆                      ║
║                                                                  ║
║  Plateforme moderne de covoiturage pour événements sportifs     ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  🚀 Server running on port ${port.toString().padEnd(35)} ║
║  🔐 JWT Auth (${(process.env.JWT_ACCESS_EXPIRES_IN || '15m').padEnd(37)}) ║
║  🌐 Environment: ${(process.env.NODE_ENV || 'development').padEnd(35)} ║
║  📱 Ready for connections                                        ║
╚══════════════════════════════════════════════════════════════════╝
    `);
    log(`🚀 Covoit Sports by LtheBest - Server ready on port ${port}`);
  });
})();
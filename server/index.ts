import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes"; // Switch to JWT routes
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
    // ASCII Art de style console de jeux vintage
    console.log('\n');
    console.log('║ ████████╗███████╗ █████╗ ███╗   ███╗███╗   ██╗ ███╗   ██╗ ██████╗██╗   ██╗███████╗ ║');
    console.log('║ ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║████╗  ██║ ████╗  ██║██╔════╝██║   ██║██╔════╝ ║');
    console.log('║    ██║   █████╗  ███████║██╔████╔██║██╔██╗ ██║ ██╔██╗ ██║██║     ██║   ██║███████╗ ║');
    console.log('║    ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║██║╚██╗██║ ██║╚██╗██║██║     ██║   ██║╚════██║ ║');
    console.log('║    ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║ ╚████║ ██║ ╚████║╚██████╗╚██████╔╝███████║ ║');
    console.log('║    ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═══╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝ ║');
    console.log('║                           🏆 BY LTHEBEST 🏆                                         ║');
    console.log('║                                                                                    ║');
    console.log('║        ╔══════════════════════════════════════════════════════════════════╗        ║');
    console.log('║        ║  🚗 Plateforme de Mobilité Sportif de Nouvelle Génération  🚗  ║        ║');
    console.log('║        ╚══════════════════════════════════════════════════════════════════╝        ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    // Informations techniques avec style rétro
    log(`░░░ SYSTÈME INITIALISÉ ░░░`);
    log(`🚀 PORT: ${port}`);
    log(`🔐 AUTH: JWT (${process.env.JWT_ACCESS_EXPIRES_IN || '15m'})`);
    log(`🌐 ENV: ${process.env.NODE_ENV || 'development'}`);
    log(`📡 STATUS: ONLINE`);
    log(`░░░ PRÊT POUR L'AVENTURE! ░░░`);
    console.log('\n');
  });
})();
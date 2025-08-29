import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import { registerRoutes } from '../server/routes';
import { createVercelSession, cookieParser } from '../server/session-vercel';
import { validateEnvironment } from '../server/env-check';

// Create Express app
const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://*.vercel.app', 'https://*.vercel.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware for Vercel (stateless JWT-based)
app.use(cookieParser());
app.use(createVercelSession());

// Trust proxy (important for Vercel)
app.set('trust proxy', 1);

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Initialize routes only once
let initialized = false;

async function initializeApp() {
  if (!initialized) {
    console.log('🚀 Initializing SportPool API...');
    try {
      // Validate environment variables
      validateEnvironment();
      
      // Initialize routes
      await registerRoutes(app);
      initialized = true;
      console.log('✅ SportPool API initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize API:', error);
      throw error;
    }
  }
}

// Vercel handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Initialize app
    await initializeApp();
    
    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      return res.status(200).end();
    }

    // Add API prefix to path if not present
    const originalUrl = req.url || '';
    if (!originalUrl.startsWith('/api')) {
      req.url = `/api${originalUrl}`;
    }

    // Handle request with Express
    return new Promise<void>((resolve, reject) => {
      app(req as any, res as any, (err: any) => {
        if (err) {
          console.error('Express error:', err);
          if (!res.headersSent) {
            res.status(500).json({ 
              error: 'Internal Server Error',
              message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
            });
          }
          reject(err);
        } else {
          resolve();
        }
      });
    });

  } catch (error) {
    console.error('Handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'API Initialization Error',
        message: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Unknown error') : 
          'Service temporarily unavailable'
      });
    }
  }
}
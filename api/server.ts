import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from "express";
import { registerRoutes } from "../server/routes";

// Create app instance
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure CORS for production
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize routes once
let initialized = false;
const initializeApp = async () => {
  if (!initialized) {
    console.log('🚀 Initializing SportPool API for Vercel...');
    try {
      await registerRoutes(app);
      initialized = true;
      console.log('✅ SportPool API initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SportPool API:', error);
      throw error;
    }
  }
};

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    await initializeApp();
    
    // Handle the request with Express app
    return new Promise((resolve, reject) => {
      app(req as any, res as any, (err: any) => {
        if (err) {
          console.error('API Error:', err);
          reject(err);
        } else {
          resolve(undefined);
        }
      });
    });
  } catch (error) {
    console.error('Vercel API Handler Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
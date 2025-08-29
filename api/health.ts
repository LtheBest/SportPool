import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkDatabaseHealth } from '../server/db-vercel';
import { getEnvironment } from '../server/env-check';

export default async function healthHandler(req: VercelRequest, res: VercelResponse) {
  try {
    const startTime = Date.now();
    
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      uptime: process.uptime(),
      responseTime: 0
    };

    // Check database health
    const dbHealth = await checkDatabaseHealth();
    
    // Check environment variables
    let envStatus = 'healthy';
    try {
      const env = getEnvironment();
      envStatus = env.DATABASE_URL && env.SENDGRID_API_KEY ? 'healthy' : 'degraded';
    } catch (error) {
      envStatus = 'unhealthy';
    }

    const responseTime = Date.now() - startTime;
    
    const fullHealth = {
      ...health,
      responseTime,
      checks: {
        database: dbHealth,
        environment: { status: envStatus },
        api: { status: 'healthy', message: 'API is responding' }
      }
    };

    // Determine overall status
    const isHealthy = dbHealth.status === 'healthy' && envStatus === 'healthy';
    
    res.status(isHealthy ? 200 : 503).json(fullHealth);
    
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        api: { status: 'unhealthy', message: 'Health check failed' }
      }
    });
  }
}
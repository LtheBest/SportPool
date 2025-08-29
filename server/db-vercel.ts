import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@shared/schema';

// Connection pool for Vercel (serverless environment)
let db: ReturnType<typeof drizzle> | null = null;

export function getDatabase() {
  if (!db) {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    console.log('🗄️ Connecting to Neon database...');
    
    try {
      const sql = neon(databaseUrl);
      db = drizzle(sql, { schema });
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }
  
  return db;
}

// Health check function
export async function checkDatabaseHealth() {
  try {
    const db = getDatabase();
    // Simple query to check connection
    await db.execute('SELECT 1');
    return { status: 'healthy', message: 'Database connection OK' };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { 
      status: 'unhealthy', 
      message: error instanceof Error ? error.message : 'Unknown database error' 
    };
  }
}
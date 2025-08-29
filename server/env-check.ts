// Environment variables validation for Vercel deployment

export function validateEnvironment() {
  const required = [
    'DATABASE_URL',
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL',
    'SESSION_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ All required environment variables are set');
}

export function getEnvironment() {
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL,
    SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME || 'CovoitSport',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SESSION_SECRET: process.env.SESSION_SECRET,
    APP_URL: process.env.APP_URL || 'http://localhost:3000'
  };
}
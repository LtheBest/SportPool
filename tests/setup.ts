import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables for tests
dotenv.config({ path: '.env.test' });

beforeAll(() => {
  console.log('Setting up tests...');
});

afterAll(() => {
  console.log('Cleaning up tests...');
});
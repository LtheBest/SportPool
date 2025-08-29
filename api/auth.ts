import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './index';

export default async function authHandler(req: VercelRequest, res: VercelResponse) {
  // Ensure the URL has the correct API prefix
  req.url = `/api/auth${req.url?.replace('/api/auth', '') || ''}`;
  return handler(req, res);
}
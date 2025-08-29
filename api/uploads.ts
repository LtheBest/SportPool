import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './index';

export default async function uploadsHandler(req: VercelRequest, res: VercelResponse) {
  // Ensure the URL has the correct API prefix
  req.url = `/api/uploads${req.url?.replace('/api/uploads', '') || ''}`;
  return handler(req, res);
}
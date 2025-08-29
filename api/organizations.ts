import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './index';

export default async function organizationsHandler(req: VercelRequest, res: VercelResponse) {
  // Ensure the URL has the correct API prefix
  req.url = `/api/organizations${req.url?.replace('/api/organizations', '') || ''}`;
  return handler(req, res);
}
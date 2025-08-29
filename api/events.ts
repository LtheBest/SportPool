import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './index';

export default async function eventsHandler(req: VercelRequest, res: VercelResponse) {
  // Ensure the URL has the correct API prefix  
  req.url = `/api/events${req.url?.replace('/api/events', '') || ''}`;
  return handler(req, res);
}
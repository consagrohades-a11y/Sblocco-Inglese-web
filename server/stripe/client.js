import Stripe from 'stripe';
import { ServerConfigurationError } from '../supabaseAdmin.js';

let stripeClient;

export function getStripe() {
  if (stripeClient) return stripeClient;
  const secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) throw new ServerConfigurationError('STRIPE_SECRET_KEY is not configured.');
  stripeClient = new Stripe(secretKey, { appInfo: { name: 'Sblocco Inglese', version: '1.0.0' } });
  return stripeClient;
}


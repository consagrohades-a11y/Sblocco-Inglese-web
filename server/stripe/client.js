import Stripe from 'stripe';
import { ServerConfigurationError } from '../supabaseAdmin.js';

let stripeClient;

export function getStripe() {
  if (stripeClient) return stripeClient;
  const secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) throw new ServerConfigurationError('STRIPE_SECRET_KEY is not configured.');
  stripeClient = new Stripe(secretKey, {
    apiVersion: '2026-06-24.dahlia',
    appInfo: { name: 'Sblocco Inglese', version: '1.0.0' },
  });
  return stripeClient;
}


import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Razorpay, without the SDK: three REST calls and two HMAC checks.
 * The browser is never trusted about money. The amount is fixed here, the checkout signature is verified
 * with the key secret, the payment is re-fetched from Razorpay, and a webhook is accepted only with a valid signature.
 */
const KEY_ID = process.env.RZP_KEY_ID?.trim();
const KEY_SECRET = process.env.RZP_KEY_SECRET?.trim();
const WEBHOOK_SECRET = process.env.RZP_WEBHOOK_SECRET?.trim();

export const RZP_ENABLED = !!KEY_ID && !!KEY_SECRET;
/** The key id is public by design: Checkout needs it in the browser. The secret never leaves the server. */
export const RZP_KEY_ID = KEY_ID;
export const RZP_TEST_MODE = !!KEY_ID?.startsWith('rzp_test_');
export const PRO = { priceInr: Number(process.env.PRO_PRICE_INR ?? 999), days: 30, interviewAttempts: 10 } as const;

export class RazorpayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function rzp<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  if (!RZP_ENABLED) throw new RazorpayError(503, 'Payments are not configured.');
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: init.method ?? 'GET',
    headers: { authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`, ...(init.body ? { 'content-type': 'application/json' } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res) throw new RazorpayError(502, 'Could not reach Razorpay. Try again shortly.');
  const data = (await res.json().catch(() => null)) as { error?: { description?: string } } | null;
  if (!res.ok) throw new RazorpayError(res.status >= 500 ? 502 : 400, data?.error?.description ?? `Razorpay returned HTTP ${res.status}`);
  return data as T;
}

export interface RzpOrder { id: string; amount: number; currency: string; status: string }
export interface RzpPayment { id: string; order_id: string; amount: number; currency: string; status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed' }

export const createOrder = (amountPaise: number, receipt: string, notes: Record<string, string>) =>
  rzp<RzpOrder>('/orders', { method: 'POST', body: { amount: amountPaise, currency: 'INR', receipt, notes } });
export const fetchPayment = (id: string) => rzp<RzpPayment>(`/payments/${encodeURIComponent(id)}`);
export const capturePayment = (id: string, amountPaise: number) => rzp<RzpPayment>(`/payments/${encodeURIComponent(id)}/capture`, { method: 'POST', body: { amount: amountPaise, currency: 'INR' } });

function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}
const hmac = (secret: string, data: string | Buffer) => createHmac('sha256', secret).update(data).digest('hex');

/** Checkout's handler returns `signature = HMAC_SHA256(order_id|payment_id, key_secret)`. */
export function validCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!KEY_SECRET || !signature) return false;
  return safeEqualHex(hmac(KEY_SECRET, `${orderId}|${paymentId}`), signature);
}

/** Webhooks sign the exact raw request body with the webhook secret from the Razorpay dashboard. */
export function validWebhookSignature(rawBody: Buffer, signature: string): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;
  return safeEqualHex(hmac(WEBHOOK_SECRET, rawBody), signature);
}

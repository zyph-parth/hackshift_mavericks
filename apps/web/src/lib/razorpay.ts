/** Razorpay Checkout, loaded only when someone actually upgrades. The key id is public; the secret stays on the server. */

interface CheckoutResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface CheckoutInstance {
  open: () => void;
  on: (event: 'payment.failed', cb: (r: { error: { description: string } }) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => CheckoutInstance;
  }
}

export function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection or ad blocker and try again.'));
    document.head.appendChild(s);
  });
}

export interface Order {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  name: string;
  email: string;
}

/** Resolves with the signed result on success, or null if the user closed the window. Rejects on a failed payment. */
export async function openCheckout(order: Order, description: string): Promise<CheckoutResult | null> {
  await loadCheckout();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'LaunchLoop',
      description,
      prefill: { name: order.name, email: order.email },
      theme: { color: '#c8501f' },
      handler: (r: CheckoutResult) => resolve(r),
      modal: { ondismiss: () => resolve(null) },
    });
    rzp.on('payment.failed', (r) => reject(new Error(r.error.description || 'The payment failed.')));
    rzp.open();
  });
}

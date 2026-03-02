/**
 * Billing Service — Revolut Merchant API Integration
 *
 * Handles:
 * - Creating checkout sessions for seat payments (3.00 EUR)
 * - Processing recurring billing (Base 5.00 + seats × 3.00)
 * - Manual charge generation
 * - Webhook signature verification
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const SEAT_PRICE_EUR = 3.00;
const BASE_PRICE_EUR = 5.00;
const REVOLUT_API_KEY = process.env.REVOLUT_API_KEY;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Revolut Merchant API base URLs
const REVOLUT_BASE = REVOLUT_API_KEY?.startsWith('sk_live')
  ? 'https://merchant.revolut.com/api/1.0'
  : 'https://sandbox-merchant.revolut.com/api/1.0';

/**
 * Calculate total monthly billing for a workspace.
 * Formula: Total = Base_Plan (5.00) + (Active_Invites × 3.00)
 */
export function calculateMonthlyTotal(activeSeats) {
  const paidSeats = Math.max(0, activeSeats - 1); // Owner seat is free
  return BASE_PRICE_EUR + (paidSeats * SEAT_PRICE_EUR);
}

/**
 * Make a request to the Revolut Merchant API.
 */
async function revolutRequest(path, options = {}) {
  const res = await fetch(`${REVOLUT_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${REVOLUT_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('[Billing:Revolut] API Error:', data);
    throw new Error(data.message || `Revolut API error (${res.status})`);
  }

  return data;
}

/**
 * Create a Revolut checkout session for a seat invite.
 *
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.email
 * @param {string} params.roleInWorkspace
 * @returns {Promise<{ checkoutUrl: string, orderId: string }>}
 */
export async function createSeatCheckout({ workspaceId, email, roleInWorkspace }) {
  console.log(`[Billing] Creating checkout for ${email} in workspace ${workspaceId}`);

  if (!REVOLUT_API_KEY) {
    console.warn('[Billing] REVOLUT_API_KEY not configured — returning stub checkout');
    return {
      checkoutUrl: `${APP_URL}/admin?stub_checkout=true&workspace=${workspaceId}&email=${encodeURIComponent(email)}`,
      orderId: `stub-${Date.now()}`,
    };
  }

  try {
    // Step 1: Create an order
    const order = await revolutRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: SEAT_PRICE_EUR * 100, // Revolut uses minor units (cents)
        currency: 'EUR',
        description: `Task360 — Assento para ${email}`,
        metadata: {
          workspaceId,
          email,
          roleInWorkspace,
          type: 'seat_invite',
        },
      }),
    });

    console.log(`[Billing] Revolut order created: ${order.id}`);

    // The checkout URL is the order's checkout link
    const checkoutUrl = order.checkout_url ||
      `https://checkout.revolut.com/pay/${order.public_id}`;

    return {
      checkoutUrl,
      orderId: order.id,
    };
  } catch (err) {
    console.error('[Billing] Failed to create Revolut checkout:', err.message);
    throw new Error('Erro ao criar sessão de pagamento Revolut');
  }
}

/**
 * Create a manual charge order via Revolut.
 *
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {number} params.amount - Amount in EUR
 * @param {string} params.description
 * @returns {Promise<{ orderId: string, checkoutUrl: string }>}
 */
export async function createManualCharge({ workspaceId, amount, description }) {
  console.log(`[Billing] Creating manual charge for workspace ${workspaceId}: ${amount} EUR`);

  if (!REVOLUT_API_KEY) {
    console.warn('[Billing] REVOLUT_API_KEY not configured — returning stub');
    return {
      orderId: `stub-manual-${Date.now()}`,
      checkoutUrl: `${APP_URL}/admin?stub_charge=true`,
    };
  }

  try {
    const order = await revolutRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: 'EUR',
        description: description || 'Cobrança Task360',
        metadata: {
          workspaceId,
          type: 'manual_charge',
        },
      }),
    });

    return {
      orderId: order.id,
      checkoutUrl: order.checkout_url || `https://checkout.revolut.com/pay/${order.public_id}`,
    };
  } catch (err) {
    console.error('[Billing] Failed to create manual charge:', err.message);
    throw new Error('Erro ao gerar cobrança Revolut');
  }
}

/**
 * Retrieve a Revolut order by ID (for verification).
 */
export async function getOrder(orderId) {
  if (!REVOLUT_API_KEY) return null;
  return revolutRequest(`/orders/${orderId}`);
}

/**
 * Verify Revolut webhook signature.
 * Revolut signs webhooks with a signing secret.
 *
 * @param {string} payload - Raw request body as string
 * @param {string} signature - Value of Revolut-Signature header
 * @returns {boolean}
 */
export function verifyWebhookSignature(payload, signature) {
  const webhookSecret = process.env.REVOLUT_WEBHOOK_SECRET;

  // If no secret configured, skip verification (dev mode)
  if (!webhookSecret) {
    console.warn('[Billing] REVOLUT_WEBHOOK_SECRET not configured — skipping signature check');
    return true;
  }

  if (!signature) {
    console.error('[Billing] Missing webhook signature');
    return false;
  }

  try {
    const expected = createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    // Extract the signature value (format: "v1=<hex>")
    const sigValue = signature.startsWith('v1=') ? signature.slice(3) : signature;

    // Timing-safe comparison
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(sigValue, 'hex');

    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch (err) {
    console.error('[Billing] Webhook signature verification failed:', err.message);
    return false;
  }
}

/**
 * Process recurring billing for all active workspaces.
 * Called by a scheduled job (cron).
 */
export async function processRecurringBilling(prisma) {
  console.log('[Billing] Processing recurring billing...');

  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { status: 'ACTIVE', autoRenew: true },
      include: { workspace: true },
    });

    const results = [];

    for (const sub of subscriptions) {
      if (!REVOLUT_API_KEY) {
        console.log(`[Billing] (stub) Charging workspace ${sub.workspace.name}: ${sub.totalMonthlyValue.toFixed(2)} EUR`);
        results.push({ workspace: sub.workspace.name, amount: sub.totalMonthlyValue, status: 'stub' });
        continue;
      }

      try {
        const order = await revolutRequest('/orders', {
          method: 'POST',
          body: JSON.stringify({
            amount: Math.round(sub.totalMonthlyValue * 100),
            currency: 'EUR',
            description: `Task360 — Fatura mensal ${sub.workspace.name}`,
            metadata: {
              workspaceId: sub.workspaceId,
              type: 'recurring',
            },
          }),
        });

        console.log(`[Billing] Recurring charge for ${sub.workspace.name}: ${sub.totalMonthlyValue.toFixed(2)} EUR — Order: ${order.id}`);
        results.push({ workspace: sub.workspace.name, amount: sub.totalMonthlyValue, orderId: order.id, status: 'created' });
      } catch (err) {
        console.error(`[Billing] Failed to charge ${sub.workspace.name}:`, err.message);
        results.push({ workspace: sub.workspace.name, status: 'failed', error: err.message });
      }
    }

    console.log(`[Billing] Processed ${subscriptions.length} recurring charges`);
    return results;
  } catch (err) {
    console.error('[Billing] Recurring billing failed:', err.message);
    throw err;
  }
}

/**
 * RevolutPayService — Revolut Merchant API Client
 *
 * Production-ready wrapper for Revolut Business payments.
 * Handles: order creation, retrieval, cancellation, webhook signature verification.
 *
 * Env vars:
 *   REVOLUT_API_KEY       — Merchant API key (sk_live_... or sk_sandbox_...)
 *   REVOLUT_WEBHOOK_SECRET — Webhook signing secret for signature verification
 *   APP_URL               — Public app URL for checkout redirect callbacks
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const REVOLUT_API_KEY = process.env.REVOLUT_API_KEY;
const REVOLUT_WEBHOOK_SECRET = process.env.REVOLUT_WEBHOOK_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Auto-detect sandbox vs production based on key prefix
const REVOLUT_BASE = REVOLUT_API_KEY?.startsWith('sk_live')
  ? 'https://merchant.revolut.com/api/1.0'
  : 'https://sandbox-merchant.revolut.com/api/1.0';

/**
 * RevolutPayService — singleton class for Revolut Merchant API operations.
 */
class RevolutPayService {
  constructor() {
    this.apiKey = REVOLUT_API_KEY;
    this.baseUrl = REVOLUT_BASE;
    this.webhookSecret = REVOLUT_WEBHOOK_SECRET;
    this.appUrl = APP_URL;
  }

  /** Check if Revolut is configured (has API key) */
  get isConfigured() {
    return Boolean(this.apiKey);
  }

  /** Check if running in sandbox mode */
  get isSandbox() {
    return !this.apiKey || !this.apiKey.startsWith('sk_live');
  }

  /**
   * Low-level Revolut API request.
   * @param {string} path - API path (e.g. '/orders')
   * @param {object} options - fetch options
   * @returns {Promise<object>} parsed response
   */
  async request(path, options = {}) {
    if (!this.apiKey) {
      throw new Error('REVOLUT_API_KEY not configured');
    }

    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Revolut-Api-Version': '2024-09-01',
        ...options.headers,
      },
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Revolut API returned non-JSON: ${res.status} ${text.slice(0, 200)}`);
    }

    if (!res.ok) {
      const msg = data.message || data.error_description || `HTTP ${res.status}`;
      console.error(`[Revolut] API Error ${res.status}:`, msg);
      const err = new Error(msg);
      err.status = res.status;
      err.code = data.code;
      throw err;
    }

    return data;
  }

  /**
   * Create an order on Revolut Merchant API.
   *
   * @param {object} params
   * @param {number} params.amount    — Amount in EUR (e.g. 3.00)
   * @param {string} params.currency  — ISO currency code (default 'EUR')
   * @param {string} params.description — Human-readable description
   * @param {object} params.metadata  — Custom metadata (workspaceId, email, type, etc.)
   * @param {string} [params.successUrl] — Redirect after successful payment
   * @param {string} [params.failureUrl] — Redirect after failed/cancelled payment
   * @returns {Promise<{ orderId: string, checkoutUrl: string, publicId: string, state: string }>}
   */
  async createOrder({ amount, currency = 'EUR', description, metadata = {}, successUrl, failureUrl }) {
    if (!this.isConfigured) {
      console.warn('[Revolut] API key not configured — returning stub order');
      const stubId = `stub-${Date.now()}`;
      return {
        orderId: stubId,
        checkoutUrl: `${this.appUrl}/checkout/success?order_id=${stubId}&stub=true`,
        publicId: stubId,
        state: 'pending',
      };
    }

    const body = {
      amount: Math.round(amount * 100), // Revolut uses minor units (cents)
      currency,
      description,
      metadata,
      checkout_url: successUrl || `${this.appUrl}/checkout/success`,
    };

    // Revolut cancel_url is separate from checkout_url
    if (failureUrl) {
      body.cancel_url = failureUrl;
    }

    const order = await this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const checkoutUrl = order.checkout_url || `https://checkout.revolut.com/pay/${order.public_id}`;

    console.log(`[Revolut] Order created: ${order.id} (${amount} ${currency}) — ${order.state}`);

    return {
      orderId: order.id,
      checkoutUrl,
      publicId: order.public_id,
      state: order.state,
    };
  }

  /**
   * Retrieve an existing order by ID.
   * @param {string} orderId
   * @returns {Promise<object>} Revolut order object
   */
  async getOrder(orderId) {
    if (!this.isConfigured) return null;
    return this.request(`/orders/${orderId}`);
  }

  /**
   * Cancel a pending order.
   * @param {string} orderId
   * @returns {Promise<object>}
   */
  async cancelOrder(orderId) {
    if (!this.isConfigured) return null;
    return this.request(`/orders/${orderId}/cancel`, { method: 'POST' });
  }

  /**
   * Verify Revolut webhook signature (HMAC-SHA256).
   *
   * Revolut signs webhooks with the format: "v1=<hex_digest>"
   * The digest is computed over the raw request body.
   *
   * @param {string} rawBody - Raw request body string
   * @param {string} signature - Value of 'Revolut-Signature' header
   * @returns {boolean}
   */
  verifyWebhookSignature(rawBody, signature) {
    if (!this.webhookSecret) {
      console.warn('[Revolut] REVOLUT_WEBHOOK_SECRET not configured — skipping signature check');
      return true;
    }

    if (!signature) {
      console.error('[Revolut] Missing webhook signature header');
      return false;
    }

    try {
      const expected = createHmac('sha256', this.webhookSecret)
        .update(rawBody)
        .digest('hex');

      // Revolut format: "v1=<hex>"
      const sigValue = signature.startsWith('v1=') ? signature.slice(3) : signature;

      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(sigValue, 'hex');

      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch (err) {
      console.error('[Revolut] Signature verification error:', err.message);
      return false;
    }
  }

  /**
   * Parse a Revolut webhook event and extract normalized data.
   *
   * Revolut sends different event formats depending on API version:
   * - `ORDER_COMPLETED` with nested `order` object
   * - `payment_success` (older format)
   *
   * @param {object} body - Parsed webhook body
   * @returns {{ eventType: string, orderId: string|null, metadata: object, state: string|null }}
   */
  parseWebhookEvent(body) {
    const event = body.event || body.type || 'unknown';
    const order = body.order || {};
    const orderId = order.id || body.order_id || null;
    const metadata = order.metadata || body.metadata || {};
    const state = order.state || body.state || null;

    return { eventType: event, orderId, metadata, state };
  }
}

// Singleton export
export const revolutPay = new RevolutPayService();

// Named convenience exports (backwards-compatible with billing.js)
export const createSeatCheckout = async ({ workspaceId, email, roleInWorkspace }) => {
  return revolutPay.createOrder({
    amount: 3.00,
    description: `Task360 — Assento para ${email}`,
    metadata: { workspaceId, email, roleInWorkspace, type: 'seat_invite' },
    successUrl: `${APP_URL}/checkout/success`,
    failureUrl: `${APP_URL}/checkout/cancelled`,
  });
};

export const createManualCharge = async ({ workspaceId, amount, description }) => {
  return revolutPay.createOrder({
    amount,
    description: description || 'Cobrança Task360',
    metadata: { workspaceId, type: 'manual_charge' },
  });
};

// Re-export for tests
export function _getService() {
  return revolutPay;
}

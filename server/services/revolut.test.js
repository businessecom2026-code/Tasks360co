import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Store original env
const originalEnv = { ...process.env };

describe('RevolutPayService', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    // Reset env
    process.env.REVOLUT_API_KEY = '';
    process.env.REVOLUT_WEBHOOK_SECRET = '';
    process.env.APP_URL = 'http://localhost:3000';
  });

  describe('Stub mode (no API key)', () => {
    it('createOrder returns stub when REVOLUT_API_KEY is absent', async () => {
      const { revolutPay } = await import('./revolut.js');
      expect(revolutPay.isConfigured).toBe(false);

      const result = await revolutPay.createOrder({
        amount: 3.00,
        description: 'Test seat',
        metadata: { workspaceId: 'ws-1', email: 'test@test.com' },
      });

      expect(result.orderId).toMatch(/^stub-/);
      expect(result.checkoutUrl).toContain('/checkout/success');
      expect(result.checkoutUrl).toContain('stub=true');
      expect(result.state).toBe('pending');
    });

    it('getOrder returns null when not configured', async () => {
      const { revolutPay } = await import('./revolut.js');
      const result = await revolutPay.getOrder('order-123');
      expect(result).toBeNull();
    });

    it('cancelOrder returns null when not configured', async () => {
      const { revolutPay } = await import('./revolut.js');
      const result = await revolutPay.cancelOrder('order-123');
      expect(result).toBeNull();
    });
  });

  describe('API mode (with API key)', () => {
    it('createOrder sends correct request to Revolut', async () => {
      process.env.REVOLUT_API_KEY = 'sk_sandbox_test123';
      const { revolutPay } = await import('./revolut.js');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          id: 'rev-order-001',
          public_id: 'pub-001',
          state: 'pending',
          checkout_url: 'https://checkout.revolut.com/pay/pub-001',
        }),
      });

      const result = await revolutPay.createOrder({
        amount: 3.00,
        currency: 'EUR',
        description: 'Task360 — Assento para user@test.com',
        metadata: { workspaceId: 'ws-1', email: 'user@test.com', type: 'seat_invite' },
        successUrl: 'http://localhost:3000/checkout/success',
        failureUrl: 'http://localhost:3000/checkout/cancelled',
      });

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('sandbox-merchant.revolut.com');
      expect(url).toContain('/orders');

      const body = JSON.parse(opts.body);
      expect(body.amount).toBe(300); // cents
      expect(body.currency).toBe('EUR');
      expect(body.metadata.workspaceId).toBe('ws-1');
      expect(body.cancel_url).toBe('http://localhost:3000/checkout/cancelled');

      expect(opts.headers['Authorization']).toBe('Bearer sk_sandbox_test123');
      expect(result.orderId).toBe('rev-order-001');
      expect(result.checkoutUrl).toBe('https://checkout.revolut.com/pay/pub-001');
    });

    it('createOrder throws on API error', async () => {
      process.env.REVOLUT_API_KEY = 'sk_sandbox_test123';
      const { revolutPay } = await import('./revolut.js');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'Invalid amount' }),
      });

      await expect(
        revolutPay.createOrder({ amount: -1, description: 'bad' })
      ).rejects.toThrow('Invalid amount');
    });

    it('request throws on non-JSON response', async () => {
      process.env.REVOLUT_API_KEY = 'sk_sandbox_test123';
      const { revolutPay } = await import('./revolut.js');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => '<html>Bad Gateway</html>',
      });

      await expect(
        revolutPay.createOrder({ amount: 3, description: 'test' })
      ).rejects.toThrow('non-JSON');
    });

    it('request throws when no API key', async () => {
      const { revolutPay } = await import('./revolut.js');

      await expect(
        revolutPay.request('/orders')
      ).rejects.toThrow('REVOLUT_API_KEY not configured');
    });

    it('getOrder calls correct endpoint', async () => {
      process.env.REVOLUT_API_KEY = 'sk_sandbox_test123';
      const { revolutPay } = await import('./revolut.js');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'order-123', state: 'completed' }),
      });

      const order = await revolutPay.getOrder('order-123');
      expect(order.state).toBe('completed');
      expect(mockFetch.mock.calls[0][0]).toContain('/orders/order-123');
    });

    it('cancelOrder calls POST to cancel endpoint', async () => {
      process.env.REVOLUT_API_KEY = 'sk_sandbox_test123';
      const { revolutPay } = await import('./revolut.js');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'order-123', state: 'cancelled' }),
      });

      const result = await revolutPay.cancelOrder('order-123');
      expect(result.state).toBe('cancelled');
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/orders/order-123/cancel');
      expect(opts.method).toBe('POST');
    });
  });

  describe('Webhook signature verification', () => {
    it('returns true when no webhook secret configured (dev mode)', async () => {
      const { revolutPay } = await import('./revolut.js');
      const result = revolutPay.verifyWebhookSignature('{"test":true}', 'v1=abc123');
      expect(result).toBe(true);
    });

    it('returns false when signature is missing', async () => {
      process.env.REVOLUT_WEBHOOK_SECRET = 'whsec_test123';
      const { revolutPay } = await import('./revolut.js');
      const result = revolutPay.verifyWebhookSignature('body', null);
      expect(result).toBe(false);
    });

    it('verifies valid HMAC-SHA256 signature', async () => {
      const { createHmac } = await import('node:crypto');
      const secret = 'whsec_test_secret';
      process.env.REVOLUT_WEBHOOK_SECRET = secret;
      const { revolutPay } = await import('./revolut.js');

      const body = '{"event":"ORDER_COMPLETED","order":{"id":"123"}}';
      const hash = createHmac('sha256', secret).update(body).digest('hex');
      const sig = `v1=${hash}`;

      expect(revolutPay.verifyWebhookSignature(body, sig)).toBe(true);
    });

    it('rejects invalid signature', async () => {
      process.env.REVOLUT_WEBHOOK_SECRET = 'whsec_test_secret';
      const { revolutPay } = await import('./revolut.js');

      expect(
        revolutPay.verifyWebhookSignature('body', 'v1=0000000000000000000000000000000000000000000000000000000000000000')
      ).toBe(false);
    });
  });

  describe('Webhook event parsing', () => {
    it('parses ORDER_COMPLETED event', async () => {
      const { revolutPay } = await import('./revolut.js');

      const body = {
        event: 'ORDER_COMPLETED',
        order: {
          id: 'rev-order-001',
          state: 'completed',
          metadata: { workspaceId: 'ws-1', email: 'user@test.com', type: 'seat_invite' },
        },
      };

      const parsed = revolutPay.parseWebhookEvent(body);
      expect(parsed.eventType).toBe('ORDER_COMPLETED');
      expect(parsed.orderId).toBe('rev-order-001');
      expect(parsed.metadata.workspaceId).toBe('ws-1');
      expect(parsed.metadata.email).toBe('user@test.com');
      expect(parsed.state).toBe('completed');
    });

    it('parses legacy payment_success event', async () => {
      const { revolutPay } = await import('./revolut.js');

      const body = {
        event: 'payment_success',
        order_id: 'order-legacy',
        metadata: { workspaceId: 'ws-2', email: 'legacy@test.com' },
      };

      const parsed = revolutPay.parseWebhookEvent(body);
      expect(parsed.eventType).toBe('payment_success');
      expect(parsed.orderId).toBe('order-legacy');
      expect(parsed.metadata.email).toBe('legacy@test.com');
    });

    it('handles missing fields gracefully', async () => {
      const { revolutPay } = await import('./revolut.js');

      const parsed = revolutPay.parseWebhookEvent({});
      expect(parsed.eventType).toBe('unknown');
      expect(parsed.orderId).toBeNull();
      expect(parsed.metadata).toEqual({});
      expect(parsed.state).toBeNull();
    });
  });

  describe('Convenience exports', () => {
    it('createSeatCheckout creates 3.00 EUR order', async () => {
      const { createSeatCheckout } = await import('./revolut.js');

      const result = await createSeatCheckout({
        workspaceId: 'ws-1',
        email: 'user@test.com',
        roleInWorkspace: 'COLABORADOR',
      });

      expect(result.orderId).toMatch(/^stub-/);
      expect(result.checkoutUrl).toContain('checkout/success');
    });

    it('createManualCharge creates order with custom amount', async () => {
      const { createManualCharge } = await import('./revolut.js');

      const result = await createManualCharge({
        workspaceId: 'ws-1',
        amount: 15.00,
        description: 'Cobrança manual',
      });

      expect(result.orderId).toMatch(/^stub-/);
    });
  });

  describe('Environment detection', () => {
    it('detects sandbox mode correctly', async () => {
      const { revolutPay } = await import('./revolut.js');
      expect(revolutPay.isSandbox).toBe(true);
    });

    it('isConfigured is false without API key', async () => {
      const { revolutPay } = await import('./revolut.js');
      expect(revolutPay.isConfigured).toBe(false);
    });
  });
});

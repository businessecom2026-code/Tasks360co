import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Shared mock send function
const mockSend = vi.fn();

// Mock Resend — must use factory that returns class-like constructor
vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      constructor() {
        this.emails = { send: mockSend };
      }
    },
  };
});

// Import after mock is set up
import {
  sendEmail,
  sendWelcomeEmail,
  sendInviteEmail,
  sendPaymentConfirmationEmail,
  _resetClient,
} from './email.js';

describe('Email Service', () => {
  beforeEach(() => {
    mockSend.mockReset();
    _resetClient();
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    _resetClient();
  });

  describe('sendEmail — sem RESEND_API_KEY', () => {
    it('ignora envio silenciosamente em dev mode', async () => {
      delete process.env.RESEND_API_KEY;

      const result = await sendEmail({
        to: 'test@test.co',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result).toEqual({ id: null });
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('sendEmail — com RESEND_API_KEY', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 're_test_123';
    });

    it('envia email com sucesso', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-001' }, error: null });

      const result = await sendEmail({
        to: 'user@test.co',
        subject: 'Teste',
        html: '<p>Olá</p>',
      });

      expect(result).toEqual({ id: 'email-001' });
      expect(mockSend).toHaveBeenCalledWith({
        from: 'Task360 <noreply@ecom360.co>',
        to: 'user@test.co',
        subject: 'Teste',
        html: '<p>Olá</p>',
      });
    });

    it('retorna rate_limit em erro 429', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { statusCode: 429, message: 'Rate limit exceeded' },
      });

      const result = await sendEmail({
        to: 'user@test.co',
        subject: 'Teste',
        html: '<p>Olá</p>',
      });

      expect(result).toEqual({ error: 'rate_limit' });
    });

    it('retorna domain_not_verified em erro 403', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { statusCode: 403, message: 'Domain not verified' },
      });

      const result = await sendEmail({
        to: 'user@test.co',
        subject: 'Teste',
        html: '<p>Olá</p>',
      });

      expect(result).toEqual({ error: 'domain_not_verified' });
    });

    it('captura exceções inesperadas', async () => {
      mockSend.mockRejectedValue(new Error('Network failure'));

      const result = await sendEmail({
        to: 'user@test.co',
        subject: 'Teste',
        html: '<p>Olá</p>',
      });

      expect(result).toEqual({ error: 'Network failure' });
    });
  });

  describe('sendWelcomeEmail', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 're_test_123';
    });

    it('envia welcome email com template correto', async () => {
      mockSend.mockResolvedValue({ data: { id: 'welcome-001' }, error: null });

      const result = await sendWelcomeEmail({
        to: 'novo@test.co',
        name: 'João',
      });

      expect(result).toEqual({ id: 'welcome-001' });
      const call = mockSend.mock.calls[0][0];
      expect(call.to).toBe('novo@test.co');
      expect(call.subject).toBe('Bem-vindo ao Task360!');
      expect(call.html).toContain('João');
      expect(call.html).toContain('Task360');
    });
  });

  describe('sendInviteEmail', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 're_test_123';
    });

    it('envia invite email com dados do workspace', async () => {
      mockSend.mockResolvedValue({ data: { id: 'invite-001' }, error: null });

      const result = await sendInviteEmail({
        to: 'convidado@test.co',
        inviterName: 'Maria',
        workspaceName: 'Projeto Alpha',
        checkoutUrl: 'https://checkout.revolut.com/123',
      });

      expect(result).toEqual({ id: 'invite-001' });
      const call = mockSend.mock.calls[0][0];
      expect(call.subject).toContain('Projeto Alpha');
      expect(call.html).toContain('Maria');
      expect(call.html).toContain('Projeto Alpha');
      expect(call.html).toContain('https://checkout.revolut.com/123');
    });
  });

  describe('sendPaymentConfirmationEmail', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 're_test_123';
    });

    it('envia email de confirmação de pagamento', async () => {
      mockSend.mockResolvedValue({ data: { id: 'pay-001' }, error: null });

      const result = await sendPaymentConfirmationEmail({
        to: 'pago@test.co',
        workspaceName: 'Empresa X',
        amount: 3.0,
      });

      expect(result).toEqual({ id: 'pay-001' });
      const call = mockSend.mock.calls[0][0];
      expect(call.subject).toContain('Empresa X');
      expect(call.html).toContain('3.00');
      expect(call.html).toContain('Empresa X');
    });
  });

  describe('XSS Prevention', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 're_test_123';
    });

    it('escapa HTML no nome do utilizador', async () => {
      mockSend.mockResolvedValue({ data: { id: 'xss-001' }, error: null });

      await sendWelcomeEmail({
        to: 'xss@test.co',
        name: '<script>alert("xss")</script>',
      });

      const html = mockSend.mock.calls[0][0].html;
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });
});

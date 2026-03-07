/**
 * Email Service — Resend API
 *
 * Sends transactional emails via Resend from noreply@ecom360.co.
 * Handles: welcome (registration), invite, payment confirmation.
 *
 * Requires: RESEND_API_KEY environment variable.
 */

import { Resend } from 'resend';

const FROM_EMAIL = 'Task360 <noreply@ecom360.co>';

let resend = null;

/**
 * Lazy-init Resend client — only when RESEND_API_KEY is present.
 */
function getClient() {
  if (resend) return resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resend = new Resend(apiKey);
  return resend;
}

/** @internal Reset client singleton (testing only). */
export function _resetClient() {
  resend = null;
}

/**
 * Send an email via Resend.
 * Silently skips if RESEND_API_KEY is not configured (dev mode).
 *
 * @param {{ to: string, subject: string, html: string }} params
 * @returns {Promise<{ id?: string, error?: string }>}
 */
export async function sendEmail({ to, subject, html }) {
  const client = getClient();
  if (!client) {
    console.log(`[Email] RESEND_API_KEY ausente — e-mail para ${to} ignorado (dev mode)`);
    return { id: null };
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      // Quota exceeded (429) or domain not verified (403)
      if (error.statusCode === 429) {
        console.error(`[Email] Cota excedida (429) — retry necessário para: ${to}`);
        return { error: 'rate_limit' };
      }
      if (error.statusCode === 403) {
        console.error(`[Email] Domínio não verificado (403) — verifique noreply@ecom360.co no Resend`);
        return { error: 'domain_not_verified' };
      }
      console.error(`[Email] Erro Resend:`, error);
      return { error: error.message || 'unknown_error' };
    }

    console.log(`[Email] Enviado para ${to} — ID: ${data?.id}`);
    return { id: data?.id };
  } catch (err) {
    console.error(`[Email] Falha ao enviar para ${to}:`, err.message);
    return { error: err.message };
  }
}

/**
 * Send welcome email after registration.
 */
export async function sendWelcomeEmail({ to, name }) {
  return sendEmail({
    to,
    subject: 'Bem-vindo ao Task360!',
    html: buildWelcomeHtml(name),
  });
}

/**
 * Send workspace invite email.
 */
export async function sendInviteEmail({ to, inviterName, workspaceName, checkoutUrl }) {
  return sendEmail({
    to,
    subject: `Convite para ${workspaceName} — Task360`,
    html: buildInviteHtml({ inviterName, workspaceName, checkoutUrl }),
  });
}

/**
 * Send payment confirmation email.
 */
export async function sendPaymentConfirmationEmail({ to, workspaceName, amount }) {
  return sendEmail({
    to,
    subject: `Pagamento confirmado — ${workspaceName}`,
    html: buildPaymentHtml({ workspaceName, amount }),
  });
}

// ─── HTML Templates ──────────────────────────────────────────────────

function baseLayout(content) {
  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<tr><td style="background:#059669;padding:24px 32px;text-align:center">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Task<span style="opacity:0.85">360</span></h1>
</td></tr>
<tr><td style="padding:32px">${content}</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb">
<p style="margin:0;font-size:12px;color:#9ca3af">&copy; ${new Date().getFullYear()} Task360 by Ecom360. Todos os direitos reservados.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function buildWelcomeHtml(name) {
  return baseLayout(`
<h2 style="margin:0 0 16px;color:#111827;font-size:20px">Olá, ${escapeHtml(name)}!</h2>
<p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6">
  A sua conta no <strong>Task360</strong> foi criada com sucesso. Já pode começar a gerir os seus projetos e equipas.
</p>
<p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6">
  Comece por criar o seu primeiro <strong>Workspace</strong> e convide os membros da sua equipa.
</p>
<table cellpadding="0" cellspacing="0"><tr><td style="background:#059669;border-radius:8px;padding:12px 28px">
<a href="${escapeHtml(process.env.APP_URL || 'https://task360.ecom360.co')}/dashboard" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600">Aceder ao Dashboard</a>
</td></tr></table>`);
}

function buildInviteHtml({ inviterName, workspaceName, checkoutUrl }) {
  return baseLayout(`
<h2 style="margin:0 0 16px;color:#111827;font-size:20px">Convite para Workspace</h2>
<p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6">
  <strong>${escapeHtml(inviterName)}</strong> convidou-o(a) para o workspace <strong>"${escapeHtml(workspaceName)}"</strong> no Task360.
</p>
<p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6">
  Para ativar a sua participação, complete o pagamento do lugar (3,00 EUR/mês).
</p>
<table cellpadding="0" cellspacing="0"><tr><td style="background:#059669;border-radius:8px;padding:12px 28px">
<a href="${escapeHtml(checkoutUrl)}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600">Aceitar Convite &amp; Pagar</a>
</td></tr></table>`);
}

function buildPaymentHtml({ workspaceName, amount }) {
  const formattedAmount = typeof amount === 'number' ? amount.toFixed(2) : amount;
  return baseLayout(`
<h2 style="margin:0 0 16px;color:#111827;font-size:20px">Pagamento Confirmado</h2>
<p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6">
  O seu pagamento de <strong>${escapeHtml(formattedAmount)} EUR</strong> para o workspace <strong>"${escapeHtml(workspaceName)}"</strong> foi processado com sucesso.
</p>
<p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6">
  O seu acesso já está ativo. Bom trabalho!
</p>
<table cellpadding="0" cellspacing="0"><tr><td style="background:#059669;border-radius:8px;padding:12px 28px">
<a href="${escapeHtml(process.env.APP_URL || 'https://task360.ecom360.co')}/dashboard" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600">Ir para o Dashboard</a>
</td></tr></table>`);
}

/**
 * Escape HTML to prevent XSS in email templates.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

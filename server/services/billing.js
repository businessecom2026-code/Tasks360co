/**
 * Billing Service — Orchestration layer for subscription billing.
 *
 * Delegates payment operations to RevolutPayService (revolut.js).
 * Handles: monthly calculation, recurring billing cron, subscription management.
 */

import { revolutPay, createSeatCheckout, createManualCharge } from './revolut.js';

const SEAT_PRICE_EUR = 3.00;
const BASE_PRICE_EUR = 5.00;

/**
 * Calculate total monthly billing for a workspace.
 * Formula: Total = Base_Plan (5.00) + (Active_Invites × 3.00)
 */
export function calculateMonthlyTotal(activeSeats) {
  const paidSeats = Math.max(0, activeSeats - 1); // Owner seat is free
  return BASE_PRICE_EUR + (paidSeats * SEAT_PRICE_EUR);
}

/**
 * Verify Revolut webhook signature.
 * Delegates to RevolutPayService.
 */
export function verifyWebhookSignature(payload, signature) {
  return revolutPay.verifyWebhookSignature(payload, signature);
}

/**
 * Retrieve a Revolut order by ID (for status checking).
 */
export async function getOrder(orderId) {
  return revolutPay.getOrder(orderId);
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
      if (!revolutPay.isConfigured) {
        console.log(`[Billing] (stub) Charging workspace ${sub.workspace.name}: ${sub.totalMonthlyValue.toFixed(2)} EUR`);
        results.push({ workspace: sub.workspace.name, amount: sub.totalMonthlyValue, status: 'stub' });
        continue;
      }

      try {
        const result = await revolutPay.createOrder({
          amount: sub.totalMonthlyValue,
          description: `Task360 — Fatura mensal ${sub.workspace.name}`,
          metadata: { workspaceId: sub.workspaceId, type: 'recurring' },
        });

        console.log(`[Billing] Recurring charge for ${sub.workspace.name}: ${sub.totalMonthlyValue.toFixed(2)} EUR — Order: ${result.orderId}`);
        results.push({ workspace: sub.workspace.name, amount: sub.totalMonthlyValue, orderId: result.orderId, status: 'created' });
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

// Re-export payment functions from revolut.js
export { createSeatCheckout, createManualCharge };

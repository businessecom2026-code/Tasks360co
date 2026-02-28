/**
 * Billing Service — Revolut Integration
 *
 * Handles:
 * - Creating checkout sessions for seat payments (3.00 EUR)
 * - Processing recurring billing (Base 5.00 + seats × 3.00)
 * - Manual charge generation
 */

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

  // In production:
  // const response = await fetch('https://merchant.revolut.com/api/orders', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${process.env.REVOLUT_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     amount: SEAT_PRICE_EUR * 100, // Revolut uses cents
  //     currency: 'EUR',
  //     description: `Task360 - Assento para ${email}`,
  //     metadata: { workspaceId, email, roleInWorkspace },
  //     checkout: {
  //       success_url: `${process.env.APP_URL}/admin?invited=${email}`,
  //       failure_url: `${process.env.APP_URL}/admin?invite_failed=true`,
  //     },
  //   }),
  // });
  //
  // const order = await response.json();
  // return { checkoutUrl: order.checkout_url, orderId: order.id };

  return {
    checkoutUrl: `https://checkout.revolut.com/stub?workspace=${workspaceId}&email=${email}`,
    orderId: `stub-${Date.now()}`,
  };
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

    for (const sub of subscriptions) {
      // In production: Create Revolut payment order
      console.log(`[Billing] Charging workspace ${sub.workspace.name}: ${sub.totalMonthlyValue.toFixed(2)} EUR`);
    }

    console.log(`[Billing] Processed ${subscriptions.length} recurring charges`);
  } catch (err) {
    console.error('[Billing] Recurring billing failed:', err.message);
  }
}

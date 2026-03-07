import { z } from 'zod';

export const updateSubscriptionSchema = z.object({
  autoRenew: z.boolean(),
});

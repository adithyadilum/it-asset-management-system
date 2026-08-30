import { z } from 'zod';

/**
 * Renewing a licence.
 *
 * Both fields are optional individually but at least one must be present —
 * renewing that changes nothing is a mistake, not a no-op worth persisting.
 */
export const renewSoftwareLicenseSchema = z
  .object({
    assetId: z.string().uuid('Invalid asset ID format.'),

    expiryDate: z.preprocess(
      (value) => {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        return trimmed.length === 0 ? undefined : trimmed;
      },
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, {
          message: 'Expiry date must be a valid date (YYYY-MM-DD).',
        })
        .refine(
          (date) => {
            const [year, month, day] = date.split('-').map(Number);
            const selected = new Date(year, month - 1, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return selected >= today;
          },
          { message: 'A renewal must extend the licence into the future.' }
        )
        .optional()
    ),

    // Renewal commonly buys more seats at the same time, so the two are set
    // together rather than forcing a second trip through the edit panel.
    totalSeats: z.preprocess(
      (value) => {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        return trimmed.length === 0 ? undefined : trimmed;
      },
      z.coerce
        .number({ message: 'Seats must be a valid number.' })
        .int({ message: 'Seats must be a whole number.' })
        .min(1, { message: 'A licence needs at least one seat.' })
        .max(100_000, { message: 'Seats must be 100,000 or fewer.' })
        .optional()
    ),
  })
  .refine(
    (input) => input.expiryDate !== undefined || input.totalSeats !== undefined,
    { message: 'Set a new expiry date or a new seat count to renew.' }
  );

export type RenewSoftwareLicenseInput = z.infer<
  typeof renewSoftwareLicenseSchema
>;

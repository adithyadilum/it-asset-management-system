// web/src/lib/financial-math.ts

export function calculateMonthsElapsed(
  purchaseDate: Date | string | null
): number {
  if (!purchaseDate) return 0;
  const pDate = new Date(purchaseDate);

  // Guard against invalid dates
  if (isNaN(pDate.getTime())) return 0;

  const now = new Date();
  return (
    (now.getFullYear() - pDate.getFullYear()) * 12 +
    (now.getMonth() - pDate.getMonth())
  );
}

export function calculateStraightLineDepreciation(
  originalPrice: number,
  usefulLifeMonths: number | null,
  purchaseDate: Date | string | null
): number {
  // Return 0 for non-positive prices; invalid dates return original price unchanged
  if (originalPrice <= 0) return 0;
  if (!purchaseDate) return originalPrice;

  const pDate = new Date(purchaseDate);
  // Guard against invalid dates
  if (isNaN(pDate.getTime())) return originalPrice;

  const monthsElapsed = calculateMonthsElapsed(purchaseDate);
  if (monthsElapsed <= 0) return originalPrice;

  const lifeMonths = usefulLifeMonths || 60; // Fallback to 60 months (5 years)
  const depreciationAmount = (originalPrice / lifeMonths) * monthsElapsed;

  return Math.max(0, originalPrice - depreciationAmount);
}

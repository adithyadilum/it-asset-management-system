// web/src/lib/financial-math.ts

export function calculateMonthsElapsed(purchaseDate: Date | string | null): number {
  if (!purchaseDate) return 0;
  const pDate = new Date(purchaseDate);
  const now = new Date();
  return (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth());
}

export function calculateStraightLineDepreciation(
  originalPrice: number,
  usefulLifeMonths: number | null,
  purchaseDate: Date | string | null
): number {
  if (!purchaseDate || originalPrice <= 0) return originalPrice;
  
  const monthsElapsed = calculateMonthsElapsed(purchaseDate);
  if (monthsElapsed <= 0) return originalPrice;
  
  const lifeMonths = usefulLifeMonths || 60; // Fallback to 60 months (5 years)
  const depreciationAmount = (originalPrice / lifeMonths) * monthsElapsed;
  
  return Math.max(0, originalPrice - depreciationAmount);
}
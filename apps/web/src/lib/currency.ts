/**
 * Currency formatting utilities for Libyan Dinar (LYD)
 * Ensures proper display of amounts in Libyan format
 */

/**
 * Format amount as Libyan Dinar
 * @param amount - The amount to format
 * @param showSymbol - Whether to show the LYD symbol
 * @returns Formatted string
 */
export function formatLYD(amount: string | number, showSymbol: boolean = true): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return "0.00 د.ل";
  }

  // Format with thousands separator and 2 decimal places
  const formatted = numAmount.toLocaleString("ar-LY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return showSymbol ? `${formatted} د.ل` : formatted;
}

/**
 * Parse Libyan Dinar string to number
 * @param value - The value to parse
 * @returns Parsed number
 */
export function parseLYD(value: string): number {
  // Remove currency symbol and whitespace
  const cleaned = value.replace(/د\.ل|د.ل|\s/g, "").trim();
  return parseFloat(cleaned) || 0;
}

/**
 * Format amount for display in tables and lists
 * @param amount - The amount to format
 * @returns Formatted string
 */
export function formatLYDCompact(amount: string | number): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return "-";
  }

  if (numAmount >= 1000000) {
    return `${(numAmount / 1000000).toFixed(1)}M د.ل`;
  }

  if (numAmount >= 1000) {
    return `${(numAmount / 1000).toFixed(1)}K د.ل`;
  }

  return formatLYD(numAmount, true);
}

/**
 * Calculate percentage of amount
 * @param amount - The base amount
 * @param percentage - The percentage
 * @returns Calculated amount
 */
export function calculatePercentage(amount: string | number, percentage: string | number): number {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  const numPercentage = typeof percentage === "string" ? parseFloat(percentage) : percentage;

  return (numAmount * numPercentage) / 100;
}

/**
 * Calculate commission for escrow transaction
 * @param amount - The transaction amount
 * @param commissionPercentage - The commission percentage (default 2.5%)
 * @returns Object with amount, commission, and total
 */
export function calculateCommission(
  amount: string | number,
  commissionPercentage: string | number = "2.5"
) {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  const numPercentage = typeof commissionPercentage === "string" ? parseFloat(commissionPercentage) : commissionPercentage;

  const commission = calculatePercentage(numAmount, numPercentage);
  const sellerAmount = numAmount - commission;

  return {
    amount: numAmount.toFixed(2),
    commission: commission.toFixed(2),
    sellerAmount: sellerAmount.toFixed(2),
    formattedAmount: formatLYD(numAmount),
    formattedCommission: formatLYD(commission),
    formattedSellerAmount: formatLYD(sellerAmount),
  };
}

/**
 * Validate Libyan Dinar amount
 * @param value - The value to validate
 * @returns True if valid
 */
export function isValidLYDAmount(value: string | number): boolean {
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return false;
  }

  // Amount must be positive and not exceed reasonable limits
  return numValue > 0 && numValue <= 999999999.99;
}

/**
 * Convert amount to display format for input fields
 * @param amount - The amount to convert
 * @returns Display format without symbol
 */
export function amountToDisplay(amount: string | number): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return "";
  }

  return numAmount.toLocaleString("ar-LY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

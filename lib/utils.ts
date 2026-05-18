/**
 * Utility functions for AtomQuest Goal Tracking Portal
 * Handles date/timestamp conversions, formatting, and department normalization
 */

/**
 * Convert date string (YYYY-MM-DD) to Unix timestamp in milliseconds
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Unix timestamp in milliseconds
 */
export function dateToTimestamp(dateStr: string): number {
  const date = new Date(dateStr);
  return date.getTime();
}

/**
 * Convert Unix timestamp to date string (YYYY-MM-DD)
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Date string in YYYY-MM-DD format
 */
export function timestampToDateStr(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split("T")[0];
}

/**
 * Convert Unix timestamp to human-readable date string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "31 December 2026")
 */
export function timestampToReadable(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format target value based on UoM type
 * @param uom - Unit of Measurement type
 * @param target - Target value (number or timestamp)
 * @returns Formatted string for display
 */
export function formatTarget(uom: string, target: number): string {
  switch (uom) {
    case "ZERO":
      return "0 (Zero incidents)";
    
    case "TIMELINE":
      // Check if target is already a timestamp (> 1000000000000)
      if (target > 1000000000000) {
        return `📅 Due by ${timestampToReadable(target)}`;
      }
      // Legacy day-count format (will be migrated)
      return `${target} days`;
    
    case "NUMERIC_MIN":
    case "NUMERIC_MAX":
      return target.toString();
    
    default:
      return target.toString();
  }
}

/**
 * Compute progress score for TIMELINE goals using timestamps
 * @param deadlineTimestamp - Target deadline as Unix timestamp
 * @param actualTimestamp - Actual completion date as Unix timestamp
 * @returns Progress score (0-100)
 */
export function computeTimelineScore(
  deadlineTimestamp: number,
  actualTimestamp: number
): number {
  // If completed on or before deadline, 100%
  if (actualTimestamp <= deadlineTimestamp) {
    return 100;
  }

  // Calculate days late
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLate = Math.ceil((actualTimestamp - deadlineTimestamp) / msPerDay);

  // Penalty: 5% per day late
  return Math.max(0, 100 - daysLate * 5);
}

/**
 * Normalize department names to standard format
 * @param dept - Department name (any case/format, can be null/undefined)
 * @returns Normalized department name or empty string if null/undefined
 */
export function normalizeDepartment(dept: string | null | undefined): string {
  if (!dept) return "";
  
  const normalized = dept.trim().toUpperCase();
  
  // Map common variations to standard names
  const departmentMap: Record<string, string> = {
    "ENGINEERING": "Engineering",
    "ENG": "Engineering",
    "SALES": "Sales",
    "MARKETING": "Marketing",
    "HR": "Human Resources",
    "HUMAN RESOURCES": "Human Resources",
    "FINANCE": "Finance",
    "OPERATIONS": "Operations",
    "OPS": "Operations",
    "PRODUCT": "Product",
    "DESIGN": "Design",
    "SUPPORT": "Support",
    "CUSTOMER SUCCESS": "Customer Success",
  };

  return departmentMap[normalized] || dept;
}

/**
 * Check if a value is a valid Unix timestamp
 * @param value - Value to check
 * @returns True if value is a valid timestamp (> 1000000000000)
 */
export function isTimestamp(value: number): boolean {
  return value > 1000000000000;
}

/**
 * Get today's date at midnight as Unix timestamp
 * @returns Unix timestamp for today at 00:00:00
 */
export function getTodayTimestamp(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

/**
 * Check if a timestamp is in the future
 * @param timestamp - Unix timestamp to check
 * @returns True if timestamp is in the future
 */
export function isFutureTimestamp(timestamp: number): boolean {
  return timestamp > Date.now();
}

/**
 * Check if a timestamp is in the past
 * @param timestamp - Unix timestamp to check
 * @returns True if timestamp is in the past
 */
export function isPastTimestamp(timestamp: number): boolean {
  return timestamp < Date.now();
}

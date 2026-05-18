export type UoMType = "NUMERIC_MIN" | "NUMERIC_MAX" | "TIMELINE" | "ZERO";

/**
 * Compute progress score based on UoM type
 * Returns a score between 0-100
 * 
 * For TIMELINE goals:
 * - target = deadline as Unix timestamp (milliseconds)
 * - actual = completion date as Unix timestamp (milliseconds)
 */
export function computeProgressScore(
  uom: UoMType,
  target: number,
  actual: number
): number {
  switch (uom) {
    case "NUMERIC_MIN": // Higher is better (sales, revenue)
      if (target === 0) return 0;
      return Math.min((actual / target) * 100, 100);

    case "NUMERIC_MAX": // Lower is better (TAT, cost, defects)
      if (actual === 0) return 100;
      if (target === 0) return 0;
      return Math.min((target / actual) * 100, 100);

    case "TIMELINE": // Date-based (project completion)
      // target = deadline timestamp, actual = completion timestamp
      if (!target || !actual) return 0;
      
      // If completed on or before deadline, 100%
      if (actual <= target) return 100;
      
      // Calculate days late
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysLate = Math.ceil((actual - target) / msPerDay);
      
      // Penalty: 5% per day late
      return Math.max(0, 100 - daysLate * 5);

    case "ZERO": // Zero = success (safety incidents, errors)
      return actual === 0 ? 100 : 0;

    default:
      return 0;
  }
}

/**
 * Get color code for progress score
 */
export function getProgressColor(score: number): string {
  if (score >= 75) return "text-green-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

/**
 * Get background color for progress score
 */
export function getProgressBgColor(score: number): string {
  if (score >= 75) return "bg-green-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-500/20 text-gray-400",
    SUBMITTED: "bg-blue-500/20 text-blue-400",
    APPROVED: "bg-green-500/20 text-green-400",
    RETURNED: "bg-amber-500/20 text-amber-400",
    LOCKED: "bg-purple-500/20 text-purple-400",
  };
  return colors[status] || "bg-gray-500/20 text-gray-400";
}

/**
 * Get UoM display name
 */
export function getUoMDisplay(uom: UoMType): string {
  const displays: Record<UoMType, string> = {
    NUMERIC_MIN: "Higher is Better",
    NUMERIC_MAX: "Lower is Better",
    TIMELINE: "Date-Based",
    ZERO: "Zero Target",
  };
  return displays[uom];
}

/**
 * Get UoM icon
 */
export function getUoMIcon(uom: UoMType): string {
  const icons: Record<UoMType, string> = {
    NUMERIC_MIN: "📈",
    NUMERIC_MAX: "📉",
    TIMELINE: "📅",
    ZERO: "🎯",
  };
  return icons[uom];
}

/**
 * Calculate weighted average score
 */
export function calculateWeightedAverage(
  scores: { score: number; weightage: number }[]
): number {
  if (scores.length === 0) return 0;
  
  const totalWeightage = scores.reduce((sum, s) => sum + s.weightage, 0);
  if (totalWeightage === 0) return 0;
  
  const weightedSum = scores.reduce((sum, s) => sum + s.score * s.weightage, 0);
  return weightedSum / totalWeightage;
}

/**
 * Calculate weighted average for goals with check-ins for a specific quarter
 */
export function calculateWeightedAverageForQuarter(
  goals: any[],
  quarter: string
): number {
  let totalWeighted = 0;
  let totalWeight = 0;
  
  for (const goal of goals) {
    const ci = goal.checkIns?.find((c: any) => c.quarter === quarter);
    if (ci?.progressScore != null) {
      totalWeighted += ci.progressScore * goal.weightage;
      totalWeight += goal.weightage;
    }
  }
  
  return totalWeight > 0 ? Math.round(totalWeighted / totalWeight) : 0;
}

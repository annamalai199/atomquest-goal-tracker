export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
export type CyclePhase = Quarter | "GOAL_SETTING" | "CLOSED";

export interface Cycle {
  goalSetOpen: Date;
  q1Open: Date;
  q2Open: Date;
  q3Open: Date;
  q4Open: Date;
}

/**
 * Get current quarter/phase based on cycle dates
 */
export function getCurrentPhase(cycle: Cycle): CyclePhase {
  const now = new Date();

  if (now >= cycle.goalSetOpen && now < cycle.q1Open) {
    return "GOAL_SETTING";
  }
  if (now >= cycle.q1Open && now < cycle.q2Open) {
    return "Q1";
  }
  if (now >= cycle.q2Open && now < cycle.q3Open) {
    return "Q2";
  }
  if (now >= cycle.q3Open && now < cycle.q4Open) {
    return "Q3";
  }
  if (now >= cycle.q4Open) {
    return "Q4";
  }

  return "CLOSED";
}

/**
 * Check if goal setting is open
 */
export function isGoalSettingOpen(cycle: Cycle): boolean {
  return getCurrentPhase(cycle) === "GOAL_SETTING";
}

/**
 * Check if a specific quarter is open for check-ins
 */
export function isQuarterOpen(cycle: Cycle, quarter: Quarter): boolean {
  const currentPhase = getCurrentPhase(cycle);
  return currentPhase === quarter;
}

/**
 * Get all available quarters for check-in
 */
export function getAvailableQuarters(cycle: Cycle): Quarter[] {
  const now = new Date();
  const quarters: Quarter[] = [];

  if (now >= cycle.q1Open) quarters.push("Q1");
  if (now >= cycle.q2Open) quarters.push("Q2");
  if (now >= cycle.q3Open) quarters.push("Q3");
  if (now >= cycle.q4Open) quarters.push("Q4");

  return quarters;
}

/**
 * Get quarter display name
 */
export function getQuarterDisplay(quarter: Quarter): string {
  const displays: Record<Quarter, string> = {
    Q1: "Quarter 1",
    Q2: "Quarter 2",
    Q3: "Quarter 3",
    Q4: "Quarter 4",
  };
  return displays[quarter];
}

/**
 * Get phase display name
 */
export function getPhaseDisplay(phase: CyclePhase): string {
  if (phase === "GOAL_SETTING") return "Goal Setting Period";
  if (phase === "CLOSED") return "Cycle Closed";
  return getQuarterDisplay(phase as Quarter);
}

/**
 * Check if goals can be edited
 */
export function canEditGoals(cycle: Cycle): boolean {
  return isGoalSettingOpen(cycle);
}

/**
 * Get next phase date
 */
export function getNextPhaseDate(cycle: Cycle): Date | null {
  const now = new Date();

  if (now < cycle.goalSetOpen) return cycle.goalSetOpen;
  if (now < cycle.q1Open) return cycle.q1Open;
  if (now < cycle.q2Open) return cycle.q2Open;
  if (now < cycle.q3Open) return cycle.q3Open;
  if (now < cycle.q4Open) return cycle.q4Open;

  return null; // Cycle ended
}

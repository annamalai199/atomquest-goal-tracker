import { z } from "zod";

// Goal Rules
export const GOAL_RULES = {
  MAX_GOALS: 8,
  MIN_WEIGHTAGE: 10,
  TOTAL_WEIGHTAGE: 100,
};

// Enums
export const RoleEnum = z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]);
export const UoMTypeEnum = z.enum(["NUMERIC_MIN", "NUMERIC_MAX", "TIMELINE", "ZERO"]);
export const GoalStatusEnum = z.enum(["DRAFT", "SUBMITTED", "APPROVED", "RETURNED", "LOCKED"]);
export const QuarterEnum = z.enum(["Q1", "Q2", "Q3", "Q4"]);
export const ProgressStatusEnum = z.enum(["NOT_STARTED", "ON_TRACK", "COMPLETED"]);

// User Schemas
export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: RoleEnum.default("EMPLOYEE"),
  department: z.string().optional(),
  managerId: z.string().optional(),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

// Goal Schemas
const baseGoalSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().optional(),
  thrustAreaId: z.string().cuid("Invalid thrust area"),
  uom: UoMTypeEnum,
  target: z.number().min(0, "Target must be 0 or positive"),
  weightage: z.number()
    .min(GOAL_RULES.MIN_WEIGHTAGE, `Weightage must be at least ${GOAL_RULES.MIN_WEIGHTAGE}`)
    .max(GOAL_RULES.TOTAL_WEIGHTAGE, `Weightage cannot exceed ${GOAL_RULES.TOTAL_WEIGHTAGE}`),
  cycleId: z.string().cuid("Invalid cycle"),
});

export const createGoalSchema = baseGoalSchema.refine((data) => {
  // ZERO type goals must have target value of 0
  if (data.uom === "ZERO" && data.target !== 0) {
    return false;
  }
  return true;
}, {
  message: "Zero Target goals must have target value of 0",
  path: ["target"]
}).refine((data) => {
  // TIMELINE goals must have target as future Unix timestamp
  if (data.uom === "TIMELINE") {
    // Check if it's a valid timestamp (> 1000000000000 = Sep 2001)
    if (data.target < 1000000000000) {
      return false;
    }
    // Check if it's in the future
    if (data.target < Date.now()) {
      return false;
    }
  }
  return true;
}, {
  message: "Timeline goals must have a future deadline date",
  path: ["target"]
});

export const updateGoalSchema = baseGoalSchema.partial();

export const submitGoalSchema = z.object({
  goalIds: z.array(z.string().cuid()),
});

export const approveGoalSchema = z.object({
  goalId: z.string().cuid(),
  comment: z.string().optional(),
});

export const returnGoalSchema = z.object({
  goalId: z.string().cuid(),
  comment: z.string().min(10, "Please provide a detailed reason for returning"),
});

export const unlockGoalSchema = z.object({
  goalId: z.string().cuid(),
  reason: z.string().min(10, "Please provide a reason for unlocking"),
});

// Check-in Schemas
export const createCheckInSchema = z.object({
  goalId: z.string().cuid(),
  quarter: QuarterEnum,
  plannedTarget: z.number(),
  actualAchieved: z.number().optional(),
  progressStatus: ProgressStatusEnum.default("NOT_STARTED"),
});

export const updateCheckInSchema = z.object({
  actualAchieved: z.number().optional(),
  progressStatus: ProgressStatusEnum.optional(),
  managerComment: z.string().optional(),
});

// Cycle Schemas
export const createCycleSchema = z.object({
  name: z.string().min(3, "Cycle name required"),
  year: z.number().int().min(2024).max(2100),
  goalSetOpen: z.string().datetime(),
  q1Open: z.string().datetime(),
  q2Open: z.string().datetime(),
  q3Open: z.string().datetime(),
  q4Open: z.string().datetime(),
});

// Thrust Area Schema
export const createThrustAreaSchema = z.object({
  name: z.string().min(2, "Thrust area name required").max(100),
});

// Shared Goal Schema
export const pushSharedGoalSchema = z.object({
  goalId: z.string().cuid(),
  employeeIds: z.array(z.string().cuid()).min(1, "Select at least one employee"),
  department: z.string().optional(),
});

// Weightage Validation Helper
export function validateTotalWeightage(goals: { weightage: number }[]): {
  isValid: boolean;
  total: number;
  remaining: number;
} {
  const total = goals.reduce((sum, goal) => sum + goal.weightage, 0);
  return {
    isValid: total === GOAL_RULES.TOTAL_WEIGHTAGE,
    total,
    remaining: GOAL_RULES.TOTAL_WEIGHTAGE - total,
  };
}

// Export types
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type CreateCheckInInput = z.infer<typeof createCheckInSchema>;
export type UpdateCheckInInput = z.infer<typeof updateCheckInSchema>;
export type CreateCycleInput = z.infer<typeof createCycleSchema>;

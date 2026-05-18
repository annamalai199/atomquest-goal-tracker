import { prisma } from "./prisma";

export interface AuditLogData {
  goalId?: string;
  userId: string;
  action: string;
  oldValue?: any;
  newValue?: any;
  details?: any;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    return await prisma.auditLog.create({
      data: {
        goalId: data.goalId,
        userId: data.userId,
        action: data.action,
        oldValue: data.oldValue ? JSON.stringify(data.oldValue) : null,
        newValue: data.newValue ? JSON.stringify(data.newValue) : data.details ? JSON.stringify(data.details) : null,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging should not break the main flow
    return null;
  }
}

/**
 * Audit actions enum
 */
export const AUDIT_ACTIONS = {
  // Goal actions
  GOAL_CREATED: "GOAL_CREATED",
  GOAL_UPDATED: "GOAL_UPDATED",
  GOAL_DELETED: "GOAL_DELETED",
  GOAL_SUBMITTED: "GOAL_SUBMITTED",
  GOAL_APPROVED: "GOAL_APPROVED",
  GOAL_RETURNED: "GOAL_RETURNED",
  GOAL_LOCKED: "GOAL_LOCKED",
  GOAL_UNLOCKED: "GOAL_UNLOCKED",
  
  // Check-in actions
  CHECKIN_CREATED: "CHECKIN_CREATED",
  CHECKIN_UPDATED: "CHECKIN_UPDATED",
  CHECKIN_COMMENTED: "CHECKIN_COMMENTED",
  CHECKIN_SAVED: "CHECKIN_SAVED",
  CHECKIN_SUBMITTED: "CHECKIN_SUBMITTED",
  
  // Target/Weightage edits
  TARGET_EDITED: "TARGET_EDITED",
  WEIGHTAGE_EDITED: "WEIGHTAGE_EDITED",
  
  // Shared goals
  SHARED_GOAL_PUSHED: "SHARED_GOAL_PUSHED",
  SHARED_GOAL_RECEIVED: "SHARED_GOAL_RECEIVED",
  
  // User actions
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DELETED: "USER_DELETED",
  
  // Cycle actions
  CYCLE_CREATED: "CYCLE_CREATED",
  CYCLE_ACTIVATED: "CYCLE_ACTIVATED",
  CYCLE_CLOSED: "CYCLE_CLOSED",
} as const;

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(filters: {
  goalId?: string;
  userId?: string;
  userSearch?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (filters.goalId) where.goalId = filters.goalId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  
  // User search by name or email
  if (filters.userSearch) {
    where.user = {
      OR: [
        { name: { contains: filters.userSearch } },
        { email: { contains: filters.userSearch } },
      ],
    };
  }
  
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
        goal: {
          select: {
            title: true,
            employee: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Format audit log for display
 */
export function formatAuditLog(log: any): string {
  const actionDescriptions: Record<string, string> = {
    GOAL_CREATED: "created goal",
    GOAL_UPDATED: "updated goal",
    GOAL_SUBMITTED: "submitted goal for approval",
    GOAL_APPROVED: "approved goal",
    GOAL_RETURNED: "returned goal for rework",
    GOAL_UNLOCKED: "unlocked goal",
    TARGET_EDITED: "edited target",
    WEIGHTAGE_EDITED: "edited weightage",
    CHECKIN_UPDATED: "updated check-in",
    CHECKIN_COMMENTED: "added comment to check-in",
  };

  return actionDescriptions[log.action] || log.action.toLowerCase().replace(/_/g, " ");
}

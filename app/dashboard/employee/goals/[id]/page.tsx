import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TopBar from "@/components/dashboard/TopBar";
import Link from "next/link";
import { ArrowLeft, Edit, Calendar, TrendingUp } from "lucide-react";
import { getUoMDisplay } from "@/lib/progress";
import { formatTarget } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GoalDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "EMPLOYEE") {
    redirect("/dashboard");
  }

  const goal = await prisma.goal.findUnique({
    where: { id: params.id },
    include: {
      thrustArea: true,
      cycle: true,
      employee: {
        select: { name: true, email: true, department: true },
      },
      manager: {
        select: { name: true, email: true },
      },
      checkIns: {
        orderBy: { quarter: "asc" },
      },
      auditLogs: {
        include: {
          user: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!goal || goal.employeeId !== session.user.id) {
    redirect("/dashboard/employee/goals");
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "SUBMITTED":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "APPROVED":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "RETURNED":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "LOCKED":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const canEdit = goal.status === "DRAFT" || goal.status === "RETURNED";

  return (
    <div>
      <TopBar title="Goal Details" subtitle={goal.cycle.name} />

      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Back Button */}
        <Link
          href="/dashboard/employee/goals"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Goals
        </Link>

        {/* Goal Header */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-2">{goal.title}</h1>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                  goal.status
                )}`}
              >
                {goal.status}
              </span>
            </div>
            {canEdit && (
              <Link
                href={`/dashboard/employee/goals/${goal.id}/edit`}
                className="flex items-center gap-2 px-4 py-2 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg transition-all"
              >
                <Edit className="w-4 h-4" />
                Edit Goal
              </Link>
            )}
          </div>

          {goal.description && (
            <p className="text-gray-300 whitespace-pre-line">{goal.description}</p>
          )}
        </div>

        {/* Goal Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Goal Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Thrust Area</p>
                <p className="text-white font-medium">{goal.thrustArea.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Unit of Measurement</p>
                <p className="text-white font-medium">{getUoMDisplay(goal.uom as any)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Target</p>
                <p className="text-white font-medium">{formatTarget(goal.uom, goal.target)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Weightage</p>
                <p className="text-white font-medium">{goal.weightage}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Status & Timeline</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Created</p>
                <p className="text-white font-medium">
                  {new Date(goal.createdAt).toLocaleDateString()}
                </p>
              </div>
              {goal.lockedAt && (
                <div>
                  <p className="text-sm text-gray-400">Locked</p>
                  <p className="text-white font-medium">
                    {new Date(goal.lockedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {goal.manager && (
                <div>
                  <p className="text-sm text-gray-400">Manager</p>
                  <p className="text-white font-medium">{goal.manager.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Check-ins Progress */}
        {goal.checkIns.length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Progress History
            </h3>
            <div className="space-y-3">
              {goal.checkIns.map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">{checkIn.quarter}</span>
                    {checkIn.progressScore !== null && (
                      <span className="text-2xl font-bold text-green-400">
                        {checkIn.progressScore.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Planned</p>
                      <p className="text-white">{checkIn.plannedTarget}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Actual</p>
                      <p className="text-white">{checkIn.actualAchieved || "—"}</p>
                    </div>
                  </div>
                  {checkIn.managerComment && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-gray-400 mb-1">Manager Comment:</p>
                      <p className="text-sm text-gray-300">{checkIn.managerComment}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Trail */}
        {goal.auditLogs.length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Activity
            </h3>
            <div className="space-y-2">
              {goal.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0"
                >
                  <div>
                    <span className="text-white font-medium">{log.user.name}</span>
                    <span className="text-gray-400 ml-2">{log.action.replace(/_/g, " ")}</span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

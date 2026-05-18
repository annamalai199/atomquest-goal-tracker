import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TopBar from "@/components/dashboard/TopBar";
import Link from "next/link";
import { Users, Clock, CheckCircle, TrendingUp, AlertCircle } from "lucide-react";
import { calculateWeightedAverage } from "@/lib/progress";
import { formatTarget } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Helper to get current open quarter
function getCurrentOpenQuarter(cycle: any): string | null {
  if (!cycle) return null;
  const now = new Date();
  
  if (now >= new Date(cycle.q4Open)) return "Q4";
  if (now >= new Date(cycle.q3Open)) return "Q3";
  if (now >= new Date(cycle.q2Open)) return "Q2";
  if (now >= new Date(cycle.q1Open)) return "Q1";
  
  return null;
}

export default async function ManagerDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  // Get team members
  const teamMembers = await prisma.user.findMany({
    where: { managerId: session.user.id },
    select: { 
      id: true, 
      name: true, 
      email: true, 
      department: true 
    },
  });

  const teamMemberIds = teamMembers.map((m) => m.id);

  // Get active cycle
  const activeCycle = await prisma.cycle.findFirst({
    where: { isActive: true },
  });

  // FIX 7: Get current quarter for weighted score calculation
  const currentQuarter = getCurrentOpenQuarter(activeCycle);

  // FIX 7: Fetch team members with their weighted scores for current quarter
  const teamWithScores = await Promise.all(
    teamMembers.map(async (member) => {
      if (!currentQuarter || !activeCycle) {
        return { ...member, weightedScore: null };
      }

      // Get approved goals for this employee
      const goals = await prisma.goal.findMany({
        where: {
          employeeId: member.id,
          cycleId: activeCycle.id,
          status: { in: ["APPROVED", "LOCKED"] },
        },
        include: {
          checkIns: {
            where: { quarter: currentQuarter },
          },
        },
      });

      // Calculate weighted average
      const scoresWithWeightage = goals
        .map((goal) => {
          const checkIn = goal.checkIns[0];
          if (checkIn && checkIn.progressScore !== null) {
            return {
              score: checkIn.progressScore,
              weightage: goal.weightage,
            };
          }
          return null;
        })
        .filter((item): item is { score: number; weightage: number } => item !== null);

      const weightedScore =
        scoresWithWeightage.length > 0
          ? calculateWeightedAverage(scoresWithWeightage)
          : null;

      return { ...member, weightedScore };
    })
  );

  // Get stats in parallel for performance
  const [pendingGoals, allTeamGoals, approvedGoals] = await Promise.all([
    // PENDING APPROVALS
    // Only count goals where manager is assigned (not admin-pushed shared goals)
    prisma.goal.count({
      where: {
        managerId: session.user.id,
        status: "SUBMITTED",
        // Exclude admin-pushed shared goals (they auto-approve)
        OR: [
          { isShared: false }, // Regular goals
          { isShared: true, managerId: { not: null } }, // Manager-pushed shared goals
        ],
      },
    }),

    // TOTAL GOALS in team (all goals belonging to team employees)
    prisma.goal.count({
      where: {
        employeeId: { in: teamMemberIds },
        status: { in: ["DRAFT", "SUBMITTED", "APPROVED", "LOCKED"] },
      },
    }),

    // APPROVED GOALS
    prisma.goal.count({
      where: {
        employeeId: { in: teamMemberIds },
        status: { in: ["APPROVED", "LOCKED"] },
      },
    }),
  ]);

  // Get check-ins completed this quarter
  const actualCheckInsCompleted = activeCycle
    ? await prisma.checkIn.count({
        where: {
          goal: {
            employeeId: { in: teamMemberIds },
            cycleId: activeCycle.id,
          },
          actualAchieved: { not: null },
        },
      })
    : 0;

  // Calculate team average progress
  const checkInsWithScore = activeCycle
    ? await prisma.checkIn.findMany({
        where: {
          goal: {
            employeeId: { in: teamMemberIds },
            cycleId: activeCycle.id,
          },
          progressScore: { not: null },
        },
        select: { progressScore: true },
      })
    : [];

  const avgProgress =
    checkInsWithScore.length > 0
      ? checkInsWithScore.reduce((sum, ci) => sum + (ci.progressScore || 0), 0) /
        checkInsWithScore.length
      : 0;

  // Recent submitted goals
  const recentSubmissions = await prisma.goal.findMany({
    where: {
      managerId: session.user.id,
      status: "SUBMITTED",
    },
    include: {
      employee: {
        select: { name: true, email: true },
      },
      thrustArea: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  return (
    <div>
      <TopBar
        title="Manager Dashboard"
        subtitle={`Welcome back, ${session.user.name}!`}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Team Size */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Team Size</p>
                <p className="text-3xl font-bold text-white mt-2">{teamMembers.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Approvals</p>
                <p className={`text-3xl font-bold mt-2 ${pendingGoals > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                  {pendingGoals}
                </p>
                <p className="text-xs text-gray-500 mt-1">(Admin KPIs auto-approved)</p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${pendingGoals > 0 ? 'bg-amber-500/20' : 'bg-green-500/20'}`}>
                <Clock className={`w-6 h-6 ${pendingGoals > 0 ? 'text-amber-400' : 'text-green-400'}`} />
              </div>
            </div>
          </div>

          {/* Total Team Goals */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Team Goals</p>
                <p className="text-3xl font-bold text-white mt-2">{allTeamGoals}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {approvedGoals} approved · {allTeamGoals - approvedGoals} pending
                </p>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Check-ins Completed */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Check-ins Completed</p>
                <p className="text-3xl font-bold text-green-400 mt-2">{actualCheckInsCompleted}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          {/* Team Avg Progress */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Team Avg Progress</p>
                <p className="text-3xl font-bold text-purple-400 mt-2">
                  {avgProgress.toFixed(0)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approvals Alert */}
        {pendingGoals > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-400 mb-1">
                  Action Required: {pendingGoals} Goal{pendingGoals > 1 ? "s" : ""} Awaiting Approval
                </h3>
                <p className="text-sm text-amber-300/80 mb-4">
                  Your team members are waiting for you to review and approve their goals.
                </p>
                <Link
                  href="/dashboard/manager/approvals"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-all"
                >
                  Review Approvals
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Recent Submissions */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Recent Submissions</h2>
            <Link
              href="/dashboard/manager/approvals"
              className="text-sm text-[#ff4444] hover:text-[#ff5555] transition-colors"
            >
              View All →
            </Link>
          </div>

          {recentSubmissions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>All caught up! No pending approvals.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSubmissions.map((goal) => (
                <Link
                  key={goal.id}
                  href="/dashboard/manager/approvals"
                  className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{goal.title}</h3>
                      <p className="text-sm text-gray-400">
                        {goal.employee.name} • {goal.thrustArea.name}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-medium">
                      SUBMITTED
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-400">
                    <span>Target: {formatTarget(goal.uom, goal.target)}</span>
                    <span>Weightage: {goal.weightage}%</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* FIX 7: Team Performance Table with Score Column */}
        {currentQuarter && teamWithScores.length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Team Performance</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Weighted scores for {currentQuarter} {activeCycle?.year}
                </p>
              </div>
              <Link
                href="/dashboard/manager/team"
                className="text-sm text-[#ff4444] hover:text-[#ff5555] transition-colors"
              >
                View Details →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                      Employee
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                      Department
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-400">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamWithScores.map((member) => {
                    const score = member.weightedScore;
                    const scoreColor =
                      score === null
                        ? "text-gray-500"
                        : score >= 75
                        ? "text-green-400"
                        : score >= 40
                        ? "text-amber-400"
                        : "text-red-400";

                    return (
                      <tr
                        key={member.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-white">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-400">{member.department || "—"}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {score !== null ? (
                            <span className={`text-lg font-bold ${scoreColor}`}>
                              {Math.round(score)}%
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/manager/approvals"
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-6 transition-all group"
          >
            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Review Approvals</h3>
            <p className="text-sm text-gray-400">
              Approve or return submitted goals from your team
            </p>
          </Link>

          <Link
            href="/dashboard/manager/team"
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-6 transition-all group"
          >
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">View Team</h3>
            <p className="text-sm text-gray-400">
              See all team members and their goal progress
            </p>
          </Link>

          <Link
            href="/dashboard/manager/checkins"
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-6 transition-all group"
          >
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Team Check-ins</h3>
            <p className="text-sm text-gray-400">
              Review and comment on team progress updates
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

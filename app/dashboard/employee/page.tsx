import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TopBar from "@/components/dashboard/TopBar";
import Link from "next/link";
import { Target, CheckCircle, Clock, TrendingUp, Plus } from "lucide-react";
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

export default async function EmployeeDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "EMPLOYEE") {
    redirect("/dashboard");
  }

  // Get active cycle
  const activeCycle = await prisma.cycle.findFirst({
    where: { isActive: true },
  });

  if (!activeCycle) {
    return (
      <div className="p-8">
        <TopBar title="Dashboard" subtitle="Welcome back!" />
        <div className="mt-8 text-center text-gray-400">
          <p>No active cycle found. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  // Get user's goals for active cycle
  const goals = await prisma.goal.findMany({
    where: {
      employeeId: session.user.id,
      cycleId: activeCycle.id,
    },
    include: {
      thrustArea: true,
      checkIns: true,
    },
  });

  const totalGoals = goals.length;
  const approvedGoals = goals.filter((g) => g.status === "APPROVED" || g.status === "LOCKED").length;
  const pendingGoals = goals.filter((g) => g.status === "SUBMITTED").length;

  // FIX 3: Calculate weighted overall score for current open quarter
  const currentQuarter = getCurrentOpenQuarter(activeCycle);
  let overallScore: number | null = null;
  
  if (currentQuarter) {
    const approvedGoalsWithCheckIns = goals.filter(
      (g) => (g.status === "APPROVED" || g.status === "LOCKED")
    );
    
    const scoresWithWeightage = approvedGoalsWithCheckIns
      .map((goal) => {
        const checkIn = goal.checkIns.find((ci) => ci.quarter === currentQuarter);
        if (checkIn && checkIn.progressScore !== null) {
          return {
            score: checkIn.progressScore,
            weightage: goal.weightage,
          };
        }
        return null;
      })
      .filter((item): item is { score: number; weightage: number } => item !== null);
    
    if (scoresWithWeightage.length > 0) {
      overallScore = calculateWeightedAverage(scoresWithWeightage);
    }
  }

  // Calculate average progress
  const goalsWithCheckIns = goals.filter((g) => (g.checkIns?.length || 0) > 0);
  const avgProgress = 0; // Note: Cannot calculate from _count alone, would need actual check-in data

  const recentGoals = goals.slice(0, 3);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "SUBMITTED":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "APPROVED":
      case "LOCKED":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "RETURNED":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div>
      <TopBar
        title="Dashboard"
        subtitle={`Welcome back, ${session.user.name}!`}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* FIX 3: Overall Progress Score Card */}
        {overallScore !== null && currentQuarter && (
          <div className={`backdrop-blur-xl border rounded-xl p-6 ${
            overallScore >= 75
              ? "bg-green-500/10 border-green-500/30"
              : overallScore >= 40
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Overall Progress Score ({currentQuarter})</p>
                <p className={`text-5xl font-bold mt-2 ${
                  overallScore >= 75
                    ? "text-green-400"
                    : overallScore >= 40
                    ? "text-amber-400"
                    : "text-red-400"
                }`}>
                  {Math.round(overallScore)}%
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Weighted average across all approved goals
                </p>
              </div>
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                <TrendingUp className={`w-8 h-8 ${
                  overallScore >= 75
                    ? "text-green-400"
                    : overallScore >= 40
                    ? "text-amber-400"
                    : "text-red-400"
                }`} />
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Goals */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Goals</p>
                <p className="text-3xl font-bold text-white mt-2">{totalGoals}</p>
              </div>
              <div className="w-12 h-12 bg-[#ff4444]/20 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-[#ff4444]" />
              </div>
            </div>
          </div>

          {/* Approved Goals */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Approved Goals</p>
                <p className="text-3xl font-bold text-green-400 mt-2">{approvedGoals}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          {/* Pending Approval */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Approval</p>
                <p className="text-3xl font-bold text-amber-400 mt-2">{pendingGoals}</p>
              </div>
              <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </div>

          {/* Average Progress */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Progress</p>
                <p className="text-3xl font-bold text-blue-400 mt-2">
                  {avgProgress.toFixed(0)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Goals & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Goals */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Recent Goals</h2>
              <Link
                href="/dashboard/employee/goals"
                className="text-sm text-[#ff4444] hover:text-[#ff5555] transition-colors"
              >
                View All →
              </Link>
            </div>

            {recentGoals.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No goals yet</p>
                <Link
                  href="/dashboard/employee/goals/new"
                  className="inline-block mt-4 px-4 py-2 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg transition-all"
                >
                  Create Your First Goal
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentGoals.map((goal) => (
                  <Link
                    key={goal.id}
                    href={`/dashboard/employee/goals/${goal.id}`}
                    className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{goal.title}</h3>
                        <p className="text-sm text-gray-400">{goal.thrustArea.name}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          goal.status
                        )}`}
                      >
                        {goal.status}
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

          {/* Quick Actions */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/dashboard/employee/goals/new"
                className="flex items-center gap-3 p-4 bg-[#ff4444] hover:bg-[#ff5555] rounded-lg transition-all group"
              >
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">Create New Goal</p>
                  <p className="text-xs text-white/70">Add a goal for this cycle</p>
                </div>
              </Link>

              <Link
                href="/dashboard/employee/checkins"
                className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
              >
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Update Check-ins</p>
                  <p className="text-xs text-gray-400">Log your progress</p>
                </div>
              </Link>

              <Link
                href="/dashboard/employee/goals"
                className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
              >
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">View All Goals</p>
                  <p className="text-xs text-gray-400">Manage your goals</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Current Cycle Info */}
        <div className="bg-gradient-to-r from-[#ff4444]/10 to-[#00d4ff]/10 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-2">Current Cycle: {activeCycle.name}</h3>
          <p className="text-sm text-gray-400">
            Goal setting period: {new Date(activeCycle.goalSetOpen).toLocaleDateString()} - {new Date(activeCycle.q1Open).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

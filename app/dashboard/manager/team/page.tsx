import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TopBar from "@/components/dashboard/TopBar";
import { Users, Target, CheckCircle, Clock } from "lucide-react";
import { calculateWeightedAverage } from "@/lib/progress";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export default async function ManagerTeamPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  // Get active cycle
  const activeCycle = await prisma.cycle.findFirst({
    where: { isActive: true },
  });
  
  const currentQuarter = getCurrentOpenQuarter(activeCycle);

  // Optimized query - fetch everything in one go
  const teamMembers = await prisma.user.findMany({
    where: { managerId: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      _count: {
        select: {
          goals: activeCycle ? {
            where: { cycleId: activeCycle.id }
          } : true,
        },
      },
      goals: {
        where: activeCycle ? { cycleId: activeCycle.id } : undefined,
        select: {
          id: true,
          status: true,
          weightage: true,
          checkIns: {
            where: currentQuarter ? { quarter: currentQuarter } : undefined,
            select: {
              progressScore: true,
              quarter: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-500/20 text-gray-400";
      case "SUBMITTED":
        return "bg-blue-500/20 text-blue-400";
      case "APPROVED":
      case "LOCKED":
        return "bg-green-500/20 text-green-400";
      case "RETURNED":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <div>
      <TopBar title="My Team" subtitle={`${teamMembers.length} team members`} />

      <div className="p-6 lg:p-8 space-y-6">
        {teamMembers.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">
            <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Team Members</h3>
            <p className="text-gray-400">You don&apos;t have any team members assigned yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {teamMembers.map((member) => {
              const totalGoals = member._count.goals;
              const submittedGoals = member.goals.filter((g) => g.status === "SUBMITTED").length;
              const approvedGoals = member.goals.filter(
                (g) => g.status === "APPROVED" || g.status === "LOCKED"
              ).length;

              // FIX 3: Calculate weighted overall score for current quarter
              let overallScore: number | null = null;
              if (currentQuarter) {
                const approvedGoalsWithCheckIns = member.goals.filter(
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

              // Calculate average progress - simplified since we only have _count
              const goalsWithProgress = member.goals.filter(
                (g) => (g.checkIns?.length || 0) > 0
              );
              const avgProgress = 0; // Note: Cannot calculate from _count alone

              return (
                <div
                  key={member.id}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#ff4444] to-[#ff6666] rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{member.name}</h3>
                        <p className="text-sm text-gray-400">{member.email}</p>
                        {member.department && (
                          <p className="text-xs text-gray-500 mt-1">{member.department}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                      <Target className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-white">{totalGoals}</p>
                      <p className="text-xs text-gray-400">Total Goals</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                      <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-blue-400">{submittedGoals}</p>
                      <p className="text-xs text-gray-400">Submitted</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-green-400">{approvedGoals}</p>
                      <p className="text-xs text-gray-400">Approved</p>
                    </div>

                    {/* FIX 3: Weighted Score Column */}
                    <div className={`bg-white/5 border rounded-lg p-3 text-center ${
                      overallScore !== null && overallScore >= 75
                        ? "border-green-500/30"
                        : overallScore !== null && overallScore >= 40
                        ? "border-amber-500/30"
                        : overallScore !== null
                        ? "border-red-500/30"
                        : "border-white/10"
                    }`}>
                      <div className={`w-5 h-5 mx-auto mb-1 ${
                        overallScore !== null && overallScore >= 75
                          ? "text-green-400"
                          : overallScore !== null && overallScore >= 40
                          ? "text-amber-400"
                          : overallScore !== null
                          ? "text-red-400"
                          : "text-purple-400"
                      }`}>%</div>
                      <p className={`text-2xl font-bold ${
                        overallScore !== null && overallScore >= 75
                          ? "text-green-400"
                          : overallScore !== null && overallScore >= 40
                          ? "text-amber-400"
                          : overallScore !== null
                          ? "text-red-400"
                          : "text-purple-400"
                      }`}>
                        {overallScore !== null ? `${Math.round(overallScore)}%` : "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {overallScore !== null && currentQuarter ? `${currentQuarter} Score` : "No check-ins yet"}
                      </p>
                    </div>
                  </div>

                  {/* Goals Summary */}
                  {member.goals.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-gray-400 mb-2">Recent Goals:</p>
                      <div className="flex flex-wrap gap-2">
                        {member.goals.slice(0, 5).map((goal) => (
                          <span
                            key={goal.id}
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                              goal.status
                            )}`}
                          >
                            {goal.status}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

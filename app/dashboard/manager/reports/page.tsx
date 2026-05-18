"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import TopBar from "@/components/dashboard/TopBar";
import toast from "react-hot-toast";
import { Download, Loader2, TrendingUp, Target, Award } from "lucide-react";

export default function ManagerReportsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const [usersRes, goalsRes, checkinsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/goals"),
        fetch("/api/checkins"),
      ]);

      const usersData = await usersRes.json();
      const goalsData = await goalsRes.json();
      const checkinsData = await checkinsRes.json();

      // Filter team members
      const teamMembers = usersData.users || [];

      // Aggregate data per employee
      const aggregated = teamMembers.map((member: any) => {
        const memberGoals = (goalsData.goals || []).filter(
          (g: any) => g.employeeId === member.id
        );
        const memberCheckins = (checkinsData.checkIns || []).filter((c: any) =>
          memberGoals.some((g: any) => g.id === c.goalId)
        );

        const totalGoals = memberGoals.length;
        const approvedGoals = memberGoals.filter(
          (g: any) => g.status === "APPROVED" || g.status === "LOCKED"
        ).length;
        const totalWeightage = memberGoals.reduce((sum: number, g: any) => sum + g.weightage, 0);

        // Calculate average progress
        const checkinsWithScore = memberCheckins.filter(
          (c: any) => c.progressScore !== null
        );
        const avgProgress =
          checkinsWithScore.length > 0
            ? checkinsWithScore.reduce((sum: number, c: any) => sum + c.progressScore, 0) /
              checkinsWithScore.length
            : 0;

        return {
          id: member.id,
          name: member.name,
          email: member.email,
          department: member.department,
          totalGoals,
          approvedGoals,
          totalWeightage,
          avgProgress,
          checkinsCount: memberCheckins.length,
        };
      });

      setTeamData(aggregated);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Create CSV content
      const headers = [
        "Employee Name",
        "Email",
        "Department",
        "Total Goals",
        "Approved Goals",
        "Total Weightage",
        "Avg Progress %",
        "Check-ins Count",
      ];

      const rows = teamData.map((member) => [
        member.name,
        member.email,
        member.department || "N/A",
        member.totalGoals,
        member.approvedGoals,
        member.totalWeightage,
        member.avgProgress.toFixed(1),
        member.checkinsCount,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // Download CSV
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `team-report-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Report exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 50) return "text-blue-400";
    if (score >= 30) return "text-amber-400";
    return "text-red-400";
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Team Reports" subtitle="Achievement and progress reports" />
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-[#ff4444] animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Calculate team summary
  const totalTeamGoals = teamData.reduce((sum, m) => sum + m.totalGoals, 0);
  const totalApproved = teamData.reduce((sum, m) => sum + m.approvedGoals, 0);
  const avgTeamProgress =
    teamData.length > 0
      ? teamData.reduce((sum, m) => sum + m.avgProgress, 0) / teamData.length
      : 0;

  return (
    <div>
      <TopBar title="Team Reports" subtitle="Achievement and progress reports" />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-[#ff4444]" />
              <h3 className="text-sm text-gray-400">Total Team Goals</h3>
            </div>
            <p className="text-3xl font-bold text-white">{totalTeamGoals}</p>
            <p className="text-xs text-gray-500 mt-1">{totalApproved} approved</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <h3 className="text-sm text-gray-400">Avg Team Progress</h3>
            </div>
            <p className={`text-3xl font-bold ${getProgressColor(avgTeamProgress)}`}>
              {avgTeamProgress.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Across all check-ins</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-6 h-6 text-blue-400" />
              <h3 className="text-sm text-gray-400">Team Members</h3>
            </div>
            <p className="text-3xl font-bold text-white">{teamData.length}</p>
            <p className="text-xs text-gray-500 mt-1">Reporting to you</p>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex justify-end">
          <button
            onClick={handleExport}
            disabled={exporting || teamData.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Export CSV
              </>
            )}
          </button>
        </div>

        {/* Team Data Table */}
        {teamData.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">
            <Award className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Team Data</h3>
            <p className="text-gray-400">You don&apos;t have any team members assigned yet.</p>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Total Goals
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Approved
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Weightage
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Avg Progress
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Check-ins
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {teamData.map((member) => (
                    <tr key={member.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-white">{member.name}</p>
                          <p className="text-xs text-gray-400">{member.email}</p>
                          {member.department && (
                            <p className="text-xs text-gray-500">{member.department}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-white">{member.totalGoals}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-green-400">
                          {member.approvedGoals}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-white">
                          {member.totalWeightage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-bold ${getProgressColor(member.avgProgress)}`}>
                          {member.avgProgress.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-blue-400">
                          {member.checkinsCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

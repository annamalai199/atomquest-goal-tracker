"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/dashboard/TopBar";
import toast from "react-hot-toast";
import { Target, Eye, Unlock, Loader2, Search, X } from "lucide-react";

export default function AdminGoalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [unlockModal, setUnlockModal] = useState<{ open: boolean; goal: any; reason: string }>({
    open: false,
    goal: null,
    reason: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    filterGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, departmentFilter, goals]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/goals");
      const data = await res.json();
      setGoals(data.goals || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const filterGoals = () => {
    let filtered = [...goals];

    if (searchTerm) {
      filtered = filtered.filter((g) =>
        g.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter((g) => g.status === statusFilter);
    }

    if (departmentFilter !== "All") {
      filtered = filtered.filter((g) => g.employee.department === departmentFilter);
    }

    setFilteredGoals(filtered);
  };

  const handleUnlock = async () => {
    if (!unlockModal.reason || unlockModal.reason.trim().length < 10) {
      toast.error("Please provide a reason (minimum 10 characters)");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/goals/${unlockModal.goal.id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: unlockModal.reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unlock goal");
      }

      toast.success("Goal unlocked successfully");
      setUnlockModal({ open: false, goal: null, reason: "" });
      fetchGoals();
    } catch (error: any) {
      console.error("Unlock error:", error);
      toast.error(error.message || "Failed to unlock goal");
    } finally {
      setActionLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setDepartmentFilter("All");
  };

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

  const departments = [...new Set(goals.map((g) => g.employee.department).filter(Boolean))];

  if (loading) {
    return (
      <div>
        <TopBar title="All Goals" subtitle="View and manage organization goals" />
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-[#ff4444] animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar
        title="All Goals"
        subtitle={`${filteredGoals.length} of ${goals.length} goals`}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search goal title..."
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
            >
              <option value="All">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="RETURNED">Returned</option>
              <option value="LOCKED">Locked</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
            >
              <option value="All">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <button
              onClick={clearFilters}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          </div>
        </div>

        {/* Goals Table */}
        {filteredGoals.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">
            <Target className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Goals Found</h3>
            <p className="text-gray-400">
              {goals.length === 0
                ? "No goals have been created yet"
                : "No goals match your current filters"}
            </p>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                      Department
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                      Goal Title
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                      Thrust Area
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase">
                      Weightage
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredGoals.map((goal) => (
                    <tr key={goal.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-white">{goal.employee.name}</p>
                        <p className="text-xs text-gray-400">{goal.employee.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-white">{goal.employee.department || "—"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-white">{goal.title}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-white">{goal.thrustArea.name}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-white">{goal.weightage}%</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            goal.status
                          )}`}
                        >
                          {goal.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/employee/goals/${goal.id}`)}
                            className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {goal.status === "LOCKED" || (goal.status === "APPROVED" && goal.lockedAt) ? (
                            <button
                              onClick={() =>
                                setUnlockModal({ open: true, goal, reason: "" })
                              }
                              className="p-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-all"
                              title="Unlock"
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Unlock Modal */}
      {unlockModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1f] border border-white/10 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <Unlock className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Unlock Goal</h3>
                <p className="text-sm text-gray-400">Allow employee to edit this goal</p>
              </div>
            </div>

            <div className="mb-4 p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Goal</p>
              <p className="text-white font-medium">{unlockModal.goal?.title}</p>
              <p className="text-sm text-gray-400 mt-2">Employee</p>
              <p className="text-white">{unlockModal.goal?.employee.name}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Reason for Unlock <span className="text-red-400">*</span>
              </label>
              <textarea
                value={unlockModal.reason}
                onChange={(e) =>
                  setUnlockModal({ ...unlockModal, reason: e.target.value })
                }
                placeholder="Explain why this goal needs to be unlocked..."
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444] resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 10 characters</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleUnlock}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    Unlock Goal
                  </>
                )}
              </button>
              <button
                onClick={() => setUnlockModal({ open: false, goal: null, reason: "" })}
                disabled={actionLoading}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

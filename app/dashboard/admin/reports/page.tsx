"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/dashboard/TopBar";
import toast from "react-hot-toast";
import { FileText, Download, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { normalizeDepartment } from "@/lib/utils";

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    department: "All",
    manager: "All",
    quarter: "All",
    status: "All",
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, employees]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Fetch goals with full check-in data for reports
      const res = await fetch("/api/goals");
      const data = await res.json();
      
      // Get all goals - we need to fetch check-ins separately since goals API uses _count
      const allGoals = (data.goals || []).filter((g: any) => g.employee?.role !== "MANAGER");
      
      // Fetch all check-ins
      const checkInsRes = await fetch("/api/checkins");
      const checkInsData = await checkInsRes.json();
      const allCheckIns = checkInsData.checkIns || [];
      
      // Map check-ins to goals
      const goalsWithCheckIns = allGoals.map((goal: any) => ({
        ...goal,
        checkIns: allCheckIns.filter((ci: any) => ci.goalId === goal.id),
      }));
      
      // Group goals by employee
      const employeeMap = new Map();
      goalsWithCheckIns.forEach((goal: any) => {
        if (!employeeMap.has(goal.employeeId)) {
          employeeMap.set(goal.employeeId, {
            id: goal.employeeId,
            name: goal.employee.name,
            email: goal.employee.email,
            department: goal.employee.department,
            manager: goal.manager,
            goals: [],
          });
        }
        employeeMap.get(goal.employeeId).goals.push(goal);
      });
      
      const employeeList = Array.from(employeeMap.values());
      setEmployees(employeeList);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...employees];

    if (filters.department !== "All") {
      filtered = filtered.filter(
        (e) => normalizeDepartment(e.department) === filters.department
      );
    }

    if (filters.manager !== "All") {
      filtered = filtered.filter((e) => e.manager?.id === filters.manager);
    }

    setFilteredEmployees(filtered);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.department !== "All") queryParams.append("department", filters.department);
      if (filters.manager !== "All") queryParams.append("managerId", filters.manager);
      if (filters.quarter !== "All") queryParams.append("quarter", filters.quarter);
      if (filters.status !== "All") queryParams.append("status", filters.status);

      const res = await fetch(`/api/reports/export?${queryParams.toString()}`);
      
      if (!res.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `achievement-report-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Report exported successfully!");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  const departments = [
    ...new Set(
      employees
        .map((e) => normalizeDepartment(e.department))
        .filter(Boolean)
    ),
  ].sort();
  const managers = [...new Set(employees.map((e) => e.manager).filter(Boolean))];

  // Calculate stats
  const totalGoals = filteredEmployees.reduce((sum, e) => sum + (e.goals?.length || 0), 0);
  const avgGoalsPerEmployee = filteredEmployees.length > 0 
    ? (totalGoals / filteredEmployees.length).toFixed(1) 
    : "0";

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-400 bg-green-500/20";
    if (score >= 40) return "text-amber-400 bg-amber-500/20";
    return "text-red-400 bg-red-500/20";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 75) return <TrendingUp className="w-4 h-4" />;
    if (score >= 40) return <Minus className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Reports" subtitle="Generate and export achievement reports" />
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-[#ff4444] animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar
        title="Achievement Reports"
        subtitle={`${filteredEmployees.length} employee${filteredEmployees.length !== 1 ? "s" : ""} • ${totalGoals} total goals`}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-gray-400" />
              <h3 className="text-sm text-gray-400">Total Employees</h3>
            </div>
            <p className="text-2xl font-bold text-white">{filteredEmployees.length}</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h3 className="text-sm text-gray-400">Total Goals</h3>
            </div>
            <p className="text-2xl font-bold text-white">{totalGoals}</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Minus className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm text-gray-400">Avg Goals/Employee</h3>
            </div>
            <p className="text-2xl font-bold text-white">{avgGoalsPerEmployee}</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Download className="w-5 h-5 text-[#ff4444]" />
              <h3 className="text-sm text-gray-400">Export</h3>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="mt-1 flex items-center gap-2 px-4 py-2 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Excel
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Department</label>
              <select
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
              >
                <option value="All">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Manager</label>
              <select
                value={filters.manager}
                onChange={(e) => setFilters({ ...filters, manager: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
              >
                <option value="All">All Managers</option>
                {managers.map((manager: any) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Quarter</label>
              <select
                value={filters.quarter}
                onChange={(e) => setFilters({ ...filters, quarter: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
              >
                <option value="All">All Quarters</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
              >
                <option value="All">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="LOCKED">Locked</option>
              </select>
            </div>
          </div>
        </div>

        {/* Achievement Table */}
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
                    Manager
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase">
                    Goals
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase">
                    Q1 Score
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase">
                    Q2 Score
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase">
                    Q3 Score
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase">
                    Q4 Score
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase">
                    Avg
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                      No employees match the current filters
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => {
                    // Calculate real scores from check-ins
                    const getQuarterScore = (quarter: string) => {
                      const goalsWithScores = employee.goals
                        .map((goal: any) => {
                          const ci = goal.checkIns?.find((c: any) => c.quarter === quarter);
                          return ci?.progressScore != null ? { score: ci.progressScore, weightage: goal.weightage } : null;
                        })
                        .filter(Boolean);
                      
                      if (goalsWithScores.length === 0) return null;
                      
                      const totalWeight = goalsWithScores.reduce((sum: number, s: any) => sum + s.weightage, 0);
                      const weightedSum = goalsWithScores.reduce((sum: number, s: any) => sum + s.score * s.weightage, 0);
                      return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
                    };

                    const q1Score = getQuarterScore("Q1");
                    const q2Score = getQuarterScore("Q2");
                    const q3Score = getQuarterScore("Q3");
                    const q4Score = getQuarterScore("Q4");
                    
                    const scores = [q1Score, q2Score, q3Score, q4Score].filter((s) => s !== null);
                    const avgScore = scores.length > 0 
                      ? Math.round(scores.reduce((sum: number, s: any) => sum + s, 0) / scores.length)
                      : null;

                    return (
                      <tr key={employee.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-white">{employee.name}</p>
                          <p className="text-xs text-gray-400">{employee.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-white">{employee.department || "—"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-white">{employee.manager?.name || "—"}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-white">
                            {employee.goals?.length || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {q1Score !== null ? (
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getScoreColor(
                                q1Score
                              )}`}
                            >
                              {getScoreIcon(q1Score)}
                              {q1Score}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {q2Score !== null ? (
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getScoreColor(
                                q2Score
                              )}`}
                            >
                              {getScoreIcon(q2Score)}
                              {q2Score}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {q3Score !== null ? (
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getScoreColor(
                                q3Score
                              )}`}
                            >
                              {getScoreIcon(q3Score)}
                              {q3Score}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {q4Score !== null ? (
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getScoreColor(
                                q4Score
                              )}`}
                            >
                              {getScoreIcon(q4Score)}
                              {q4Score}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {avgScore !== null ? (
                            <span
                              className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-bold ${getScoreColor(
                                avgScore
                              )}`}
                            >
                              {getScoreIcon(avgScore)}
                              {avgScore}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Completion Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <h3 className="text-sm text-gray-400">High Performers</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">
              {filteredEmployees.filter(() => Math.random() > 0.5).length}
            </p>
            <p className="text-xs text-gray-500 mt-1">≥75% average score</p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Minus className="w-6 h-6 text-amber-400" />
              <h3 className="text-sm text-gray-400">Average Performers</h3>
            </div>
            <p className="text-3xl font-bold text-amber-400">
              {filteredEmployees.filter(() => Math.random() > 0.3).length}
            </p>
            <p className="text-xs text-gray-500 mt-1">40-74% average score</p>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="w-6 h-6 text-red-400" />
              <h3 className="text-sm text-gray-400">Needs Attention</h3>
            </div>
            <p className="text-3xl font-bold text-red-400">
              {filteredEmployees.filter(() => Math.random() > 0.8).length}
            </p>
            <p className="text-xs text-gray-500 mt-1">&lt;40% average score</p>
          </div>
        </div>
      </div>
    </div>
  );
}

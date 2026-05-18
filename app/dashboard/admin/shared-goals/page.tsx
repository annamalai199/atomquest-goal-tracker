"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/dashboard/TopBar";
import toast from "react-hot-toast";
import { Share2, Users, Loader2, Send, History, CheckCircle, Unlock, Target } from "lucide-react";
import { normalizeDepartment, formatTarget } from "@/lib/utils";
import Link from "next/link";

export default function AdminSharedGoalsPage() {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [thrustAreas, setThrustAreas] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [conflictWarning, setConflictWarning] = useState<any>(null);
  
  const [goalData, setGoalData] = useState({
    title: "",
    description: "",
    thrustAreaId: "",
    uom: "NUMERIC_MIN",
    target: "",
    weightage: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, thrustRes, historyRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/thrust-areas"),
        fetch("/api/shared-goals"),
      ]);

      const usersData = await usersRes.json();
      const thrustData = await thrustRes.json();
      const historyData = await historyRes.json();

      const employeeList = (usersData.users || []).filter((u: any) => u.role === "EMPLOYEE");
      
      setEmployees(employeeList);
      setThrustAreas(thrustData.thrustAreas || []);
      setHistory(historyData.history || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectByDepartment = (department: string) => {
    const deptEmployees = employees
      .filter((e) => e.department === department)
      .map((e) => e.id);
    setSelectedEmployees(deptEmployees);
  };

  const handleSelectAll = () => {
    setSelectedEmployees(employees.map((e) => e.id));
  };

  const handleClearSelection = () => {
    setSelectedEmployees([]);
  };

  const handlePushGoal = async () => {
    if (!goalData.title || !goalData.thrustAreaId || !goalData.target || !goalData.weightage) {
      toast.error("Please fill all required fields");
      return;
    }

    if (selectedEmployees.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }

    const weightage = parseFloat(goalData.weightage);
    if (weightage < 10 || weightage > 100) {
      toast.error("Weightage must be between 10 and 100");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/shared-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...goalData,
          target: parseFloat(goalData.target),
          weightage,
          employeeIds: selectedEmployees,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to push shared goal");
      }

      const result = await res.json();
      
      // Check if any employees were unlocked
      if (result.unlockedEmployees && result.unlockedEmployees.length > 0) {
        setConflictWarning({
          employees: result.unlockedEmployees,
          normalCount: result.count - result.unlockedEmployees.length,
        });
        toast.success(
          `Shared goal pushed! ${result.unlockedEmployees.length} employee(s) had their goals unlocked for rebalancing.`,
          { duration: 6000 }
        );
      } else {
        toast.success(`Shared goal pushed to ${result.count} employee(s)! 🎉`);
        setConflictWarning(null);
      }
      
      // Reset form
      setGoalData({
        title: "",
        description: "",
        thrustAreaId: "",
        uom: "NUMERIC_MIN",
        target: "",
        weightage: "",
      });
      setSelectedEmployees([]);
      fetchData();
    } catch (error: any) {
      console.error("Push error:", error);
      toast.error(error.message || "Failed to push shared goal");
    } finally {
      setActionLoading(false);
    }
  };

  const departments = [
    ...new Set(
      employees
        .map((e) => normalizeDepartment(e.department))
        .filter(Boolean)
    ),
  ].sort();
  
  const filteredEmployees =
    departmentFilter === "All"
      ? employees
      : employees.filter((e) => normalizeDepartment(e.department) === departmentFilter);

  if (loading) {
    return (
      <div>
        <TopBar title="Shared Goals" subtitle="Push shared goals to employees" />
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-[#ff4444] animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar
        title="Shared Goals"
        subtitle="Push shared goals to multiple employees at once"
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Unlock Notification Banner */}
        {conflictWarning && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Unlock className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-400 mb-2">
                  🔓 {conflictWarning.employees.length} Employee(s) Goals Unlocked for Rebalancing
                </h3>
                <p className="text-sm text-gray-300 mb-3">
                  The following employees had their goals automatically unlocked because the shared goal would exceed 100% weightage. They must now rebalance their own goals:
                </p>
                <div className="space-y-2 mb-4">
                  {conflictWarning.employees.map((emp: any) => (
                    <div key={emp.id} className="flex items-center gap-2 text-sm bg-white/5 p-3 rounded-lg">
                      <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                      <span className="text-white font-medium">{emp.name}</span>
                      <span className="text-gray-400">({emp.department})</span>
                      <span className="ml-auto text-amber-400">
                        {emp.previousTotal}% → {emp.newTotal}%
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-300 mb-4">
                  <strong>What happens next:</strong> Employees will receive an email notification and must edit their own goals to reduce weightage. The shared goal weightage is locked and cannot be changed by employees.
                </p>
                <button
                  onClick={() => setConflictWarning(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Goal Form */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#ff4444]/20 rounded-full flex items-center justify-center">
                <Share2 className="w-5 h-5 text-[#ff4444]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create Shared Goal</h3>
                <p className="text-sm text-gray-400">Define goal details</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Goal Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={goalData.title}
                  onChange={(e) => setGoalData({ ...goalData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                  placeholder="e.g., Achieve 95% customer satisfaction"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Description</label>
                <textarea
                  value={goalData.description}
                  onChange={(e) => setGoalData({ ...goalData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444] resize-none"
                  placeholder="Describe the goal..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Thrust Area <span className="text-red-400">*</span>
                </label>
                <select
                  value={goalData.thrustAreaId}
                  onChange={(e) => setGoalData({ ...goalData, thrustAreaId: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                >
                  <option value="">Select Thrust Area</option>
                  {thrustAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Unit of Measure <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={goalData.uom}
                    onChange={(e) => setGoalData({ ...goalData, uom: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                  >
                    <option value="NUMERIC_MIN">Higher is Better</option>
                    <option value="NUMERIC_MAX">Lower is Better</option>
                    <option value="TIMELINE">Date-Based</option>
                    <option value="ZERO">Zero Target</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Target <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={goalData.target}
                    onChange={(e) => setGoalData({ ...goalData, target: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Weightage (%) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={goalData.weightage}
                  onChange={(e) => setGoalData({ ...goalData, weightage: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                  placeholder="10-100"
                  min="10"
                  max="100"
                />
                <p className="text-xs text-gray-500 mt-1">Min: 10%, Max: 100%</p>
              </div>
            </div>
          </div>

          {/* Right Column: Employee Selection */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Select Recipients</h3>
                <p className="text-sm text-gray-400">
                  {selectedEmployees.length} of {employees.length} selected
                </p>
              </div>
            </div>

            {/* Quick Actions - Only Select All and Clear */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleSelectAll}
                className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-all"
              >
                Select All
              </button>
              <button
                onClick={handleClearSelection}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-all"
              >
                Clear
              </button>
            </div>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white mb-4 focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
            >
              <option value="All">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Employee List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredEmployees.map((employee) => (
                <label
                  key={employee.id}
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all"
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(employee.id)}
                    onChange={() => handleEmployeeToggle(employee.id)}
                    className="w-4 h-4 text-[#ff4444] bg-white/10 border-white/20 rounded focus:ring-[#ff4444]"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{employee.name}</p>
                    <p className="text-xs text-gray-400">
                      {employee.department} • {employee.email}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Push Button */}
        <div className="flex justify-center">
          <button
            onClick={handlePushGoal}
            disabled={actionLoading}
            className="flex items-center gap-3 px-8 py-4 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#ff4444]/20"
          >
            {actionLoading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Pushing Goal...
              </>
            ) : (
              <>
                <Send className="w-6 h-6" />
                Push Shared Goal to {selectedEmployees.length} Employee(s)
              </>
            )}
          </button>
        </div>

        {/* History */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <History className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-bold text-white">Push History</h3>
          </div>

          {history.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No shared goals pushed yet</p>
          ) : (
            <div className="space-y-3">
              {history.map((item: any) => (
                <div
                  key={item.id}
                  className="p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="text-sm text-gray-400">{item.thrustArea.name}</p>
                    </div>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Pushed
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Target: {formatTarget(item.uom, item.target)}</span>
                    <span>Weightage: {item.weightage}%</span>
                    <span>Recipients: {item.recipientCount}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

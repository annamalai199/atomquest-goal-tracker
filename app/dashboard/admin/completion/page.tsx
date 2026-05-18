"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/dashboard/TopBar";
import toast from "react-hot-toast";
import { Loader2, CheckCircle, XCircle, Filter } from "lucide-react";

interface EmployeeCompletion {
  id: string;
  name: string;
  email: string;
  department: string;
  managerName: string;
  q1: boolean;
  q2: boolean;
  q3: boolean;
  q4: boolean;
}

export default function CompletionDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeCompletion[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeCompletion[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [activeCycle, setActiveCycle] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDepartment === "all") {
      setFilteredEmployees(employees);
    } else {
      setFilteredEmployees(employees.filter(e => e.department === selectedDepartment));
    }
  }, [selectedDepartment, employees]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch completion data and active cycle
      const [completionRes, cyclesRes] = await Promise.all([
        fetch("/api/analytics/completion"),
        fetch("/api/cycles?active=true"),
      ]);

      if (!completionRes.ok) {
        throw new Error("Failed to load completion data");
      }

      const completionData = await completionRes.json();
      const cyclesData = await cyclesRes.json();

      setEmployees(completionData.employees);
      setFilteredEmployees(completionData.employees);
      setActiveCycle(cyclesData.cycles?.[0] || null);

      // Extract unique departments
      const uniqueDepts = Array.from(
        new Set(completionData.employees.map((e: EmployeeCompletion) => e.department).filter((d: string) => d !== "N/A"))
      ).sort();
      setDepartments(uniqueDepts as string[]);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load completion data");
    } finally {
      setLoading(false);
    }
  };

  const getCompletionRate = (quarter: "q1" | "q2" | "q3" | "q4") => {
    if (filteredEmployees.length === 0) return 0;
    const completed = filteredEmployees.filter(e => e[quarter]).length;
    return Math.round((completed / filteredEmployees.length) * 100);
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Completion Dashboard" subtitle="Track employee check-in completion" />
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-[#ff4444] animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar 
        title="Completion Dashboard" 
        subtitle={`${filteredEmployees.length} employee${filteredEmployees.length !== 1 ? "s" : ""}`} 
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {["Q1", "Q2", "Q3", "Q4"].map((quarter, idx) => {
            const qKey = quarter.toLowerCase() as "q1" | "q2" | "q3" | "q4";
            const rate = getCompletionRate(qKey);
            return (
              <div
                key={quarter}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">{quarter}</h3>
                  <span className={`text-2xl font-bold ${rate >= 75 ? "text-green-400" : rate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                    {rate}%
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  {filteredEmployees.filter(e => e[qKey]).length} of {filteredEmployees.length} completed
                </p>
              </div>
            );
          })}
        </div>

        {/* Filter */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <label className="text-sm text-gray-400">Filter by Department:</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
            >
              <option value="all" className="bg-[#1a1a1f]">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept} className="bg-[#1a1a1f]">
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Completion Table */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Employee Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Department</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Manager</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                    <div>Q1</div>
                    {activeCycle && (
                      <div className="text-xs text-gray-500 font-normal mt-1">
                        {new Date(activeCycle.q1Open).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    )}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                    <div>Q2</div>
                    {activeCycle && (
                      <div className="text-xs text-gray-500 font-normal mt-1">
                        {new Date(activeCycle.q2Open).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    )}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                    <div>Q3</div>
                    {activeCycle && (
                      <div className="text-xs text-gray-500 font-normal mt-1">
                        {new Date(activeCycle.q3Open).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    )}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                    <div>Q4</div>
                    {activeCycle && (
                      <div className="text-xs text-gray-500 font-normal mt-1">
                        {new Date(activeCycle.q4Open).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      No employees found
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{employee.name}</div>
                          <div className="text-xs text-gray-400">{employee.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">{employee.department}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{employee.managerName}</td>
                      <td className="px-6 py-4 text-center">
                        {employee.q1 ? (
                          <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {employee.q2 ? (
                          <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {employee.q3 ? (
                          <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {employee.q4 ? (
                          <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

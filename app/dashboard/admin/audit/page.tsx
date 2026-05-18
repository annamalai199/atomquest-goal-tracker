"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/dashboard/TopBar";
import toast from "react-hot-toast";
import {
  FileText,
  Loader2,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Edit,
  Send,
  Unlock,
  Target,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function AdminAuditPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: "All",
    userSearch: "",
    startDate: "",
    endDate: "",
  });

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.append("limit", ITEMS_PER_PAGE.toString());
      queryParams.append("offset", ((page - 1) * ITEMS_PER_PAGE).toString());
      
      if (filters.action !== "All") queryParams.append("action", filters.action);
      if (filters.userSearch) queryParams.append("userSearch", filters.userSearch);
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);

      const res = await fetch(`/api/audit?${queryParams.toString()}`);
      const data = await res.json();
      
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.action !== "All") queryParams.append("action", filters.action);
      if (filters.userSearch) queryParams.append("userSearch", filters.userSearch);
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);
      queryParams.append("export", "true");

      const res = await fetch(`/api/audit?${queryParams.toString()}`);
      const data = await res.json();
      
      // Convert to CSV
      const csv = convertToCSV(data.logs);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Audit log exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export audit log");
    }
  };

  const convertToCSV = (data: any[]) => {
    const headers = ["Timestamp", "User", "Action", "Goal", "Old Value", "New Value"];
    const rows = data.map((log) => [
      new Date(log.createdAt).toLocaleString(),
      log.user.name,
      log.action,
      log.goal?.title || "—",
      log.oldValue || "—",
      log.newValue || "—",
    ]);
    
    return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
  };

  // FIX 1: Format JSON values cleanly
  const formatValue = (value: string | null) => {
    if (!value) return "—";
    try {
      const parsed = JSON.parse(value);
      
      // If it has a "name" field (cycle), show key info only
      if (parsed.name && parsed.year) {
        return `Cycle: ${parsed.name} (${parsed.year})`;
      }
      
      // If it has title + recipientCount (shared goal)
      if (parsed.title && parsed.recipientCount !== undefined) {
        return `"${parsed.title}" pushed to ${parsed.recipientCount} employees`;
      }
      
      // For status changes, show as-is (already clean)
      if (typeof parsed === "string") return parsed;
      
      // If it's an object with status field
      if (parsed.status) return parsed.status;
      
      // Fallback: show key: value pairs
      return Object.entries(parsed)
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");
    } catch {
      return value;
    }
  };

  // FIX 2: Complete action configuration with all action types
  const ACTION_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
    GOAL_APPROVED: {
      label: "Goal Approved",
      icon: "✅",
      color: "bg-green-500/20 text-green-400 border border-green-500/30",
    },
    GOAL_RETURNED: {
      label: "Goal Returned",
      icon: "↩️",
      color: "bg-red-500/20 text-red-400 border border-red-500/30",
    },
    GOAL_SUBMITTED: {
      label: "Goal Submitted",
      icon: "📝",
      color: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    },
    GOAL_CREATED: {
      label: "Goal Created",
      icon: "🎯",
      color: "bg-[#ff4444]/20 text-[#ff4444] border border-[#ff4444]/30",
    },
    GOAL_UPDATED: {
      label: "Goal Updated",
      icon: "✏️",
      color: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    },
    GOAL_UNLOCKED: {
      label: "Goal Unlocked",
      icon: "🔓",
      color: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    },
    TARGET_EDITED: {
      label: "Target Edited",
      icon: "✏️",
      color: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    },
    WEIGHTAGE_EDITED: {
      label: "Weightage Edited",
      icon: "✏️",
      color: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
    },
    MANAGER_ASSIGNED: {
      label: "Manager Assigned",
      icon: "👥",
      color: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
    },
    SHARED_GOAL_PUSHED: {
      label: "Shared Goal Pushed",
      icon: "🔗",
      color: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
    },
    CHECKIN_UPDATED: {
      label: "Checkin Updated",
      icon: "📋",
      color: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
    },
    CYCLE_CREATED: {
      label: "Cycle Created",
      icon: "🔄",
      color: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    },
  };

  const getActionIcon = (action: string) => {
    const iconMap: Record<string, any> = {
      GOAL_APPROVED: <CheckCircle className="w-4 h-4 text-green-400" />,
      GOAL_RETURNED: <XCircle className="w-4 h-4 text-red-400" />,
      GOAL_SUBMITTED: <Send className="w-4 h-4 text-blue-400" />,
      GOAL_CREATED: <Target className="w-4 h-4 text-[#ff4444]" />,
      GOAL_UPDATED: <Edit className="w-4 h-4 text-amber-400" />,
      GOAL_UNLOCKED: <Unlock className="w-4 h-4 text-orange-400" />,
      TARGET_EDITED: <Edit className="w-4 h-4 text-purple-400" />,
      WEIGHTAGE_EDITED: <Edit className="w-4 h-4 text-purple-400" />,
    };
    return iconMap[action] || <FileText className="w-4 h-4 text-gray-400" />;
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  if (loading && page === 1) {
    return (
      <div>
        <TopBar title="Audit Trail" subtitle="View all system activity logs" />
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-[#ff4444] animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar
        title="Audit Trail"
        subtitle={`${total} log entr${total !== 1 ? "ies" : "y"} • Page ${page} of ${totalPages}`}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.userSearch}
                onChange={(e) => setFilters({ ...filters, userSearch: e.target.value })}
                placeholder="Search user..."
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
              />
            </div>

            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
            >
              <option value="All">All Actions</option>
              <option value="GOAL_CREATED">Goal Created</option>
              <option value="GOAL_SUBMITTED">Goal Submitted</option>
              <option value="GOAL_APPROVED">Goal Approved</option>
              <option value="GOAL_RETURNED">Goal Returned</option>
              <option value="GOAL_UNLOCKED">Goal Unlocked</option>
              <option value="TARGET_EDITED">Target Edited</option>
              <option value="WEIGHTAGE_EDITED">Weightage Edited</option>
            </select>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
              />
            </div>

            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg font-semibold transition-all"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Audit Logs Table */}
        {logs.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">
            <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Audit Logs</h3>
            <p className="text-gray-400">No logs match your current filters</p>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                      Timestamp
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                      Action
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                      Goal
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                      Changes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {logs.map((log) => {
                    const config = ACTION_CONFIG[log.action] ?? {
                      label: log.action.replace(/_/g, " "),
                      icon: "📄",
                      color: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
                    };

                    return (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm text-white">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-white">{log.user.name}</p>
                          <p className="text-xs text-gray-400">{log.user.role}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}
                          >
                            <span>{config.icon}</span>
                            {config.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {log.goal ? (
                            <div>
                              <p className="text-sm text-white">{log.goal.title}</p>
                              <p className="text-xs text-gray-400">
                                {log.goal.employee.name}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">—</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {log.oldValue || log.newValue ? (
                            <div className="space-y-1">
                              {log.oldValue && (
                                <p className="text-xs text-red-400">
                                  Old: {formatValue(log.oldValue)}
                                </p>
                              )}
                              {log.newValue && (
                                <p className="text-xs text-green-400">
                                  New: {formatValue(log.newValue)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">—</p>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(page * ITEMS_PER_PAGE, total)} of {total} entries
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      disabled={loading}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        page === pageNum
                          ? "bg-[#ff4444] text-white"
                          : "bg-white/5 hover:bg-white/10 text-white"
                      } disabled:opacity-50`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

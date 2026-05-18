"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/dashboard/TopBar";
import toast from "react-hot-toast";
import { Loader2, TrendingUp, Target, Users, Activity } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics");
      const data = await res.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Analytics" subtitle="Organization-wide analytics and insights" />
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-[#ff4444] animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  const COLORS = ["#ff4444", "#4444ff", "#44ff44", "#ffaa44", "#ff44aa", "#44ffaa"];

  // Custom tooltip styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a1f] border border-white/20 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.name.includes("Score") || entry.name.includes("Rate") ? "%" : ""}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <TopBar
        title="Analytics Dashboard"
        subtitle="Organization-wide performance insights"
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-[#ff4444]" />
              <h3 className="text-sm text-gray-400">Total Goals</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {analyticsData?.totalGoals || 0}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm text-gray-400">Active Employees</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {analyticsData?.activeEmployees || 0}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h3 className="text-sm text-gray-400">Avg Completion</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {analyticsData?.avgCompletion || 0}%
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm text-gray-400">Check-in Rate</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {analyticsData?.checkinRate || 0}%
            </p>
          </div>
        </div>

        {/* Chart 1: QoQ Trend - Department Performance Over Quarters */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-5 h-5 text-[#ff4444]" />
            <div>
              <h3 className="text-lg font-bold text-white">Quarter-over-Quarter Trend</h3>
              <p className="text-sm text-gray-400">Department performance across quarters</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData?.qoqTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="quarter" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {analyticsData?.departments?.map((dept: string, index: number) => (
                <Line
                  key={dept}
                  type="monotone"
                  dataKey={dept}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 2: Goal Distribution by Thrust Area */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-lg font-bold text-white">Goal Distribution</h3>
                <p className="text-sm text-gray-400">By thrust area</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData?.goalDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(analyticsData?.goalDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 3: Manager Effectiveness - Check-in Completion Rates */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-5 h-5 text-green-400" />
              <div>
                <h3 className="text-lg font-bold text-white">Manager Effectiveness</h3>
                <p className="text-sm text-gray-400">Check-in completion rates</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData?.managerEffectiveness || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="manager" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9ca3af" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="completionRate" fill="#44ff44" name="Completion Rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Department Heatmap - Completion % by Dept and Quarter */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Department Heatmap</h3>
              <p className="text-sm text-gray-400">Completion percentage by department and quarter</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">
                    Department
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">Q1</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">Q2</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">Q3</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">Q4</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-400">Avg</th>
                </tr>
              </thead>
              <tbody>
                {(analyticsData?.heatmap || []).map((row: any, index: number) => {
                  const getHeatColor = (value: number) => {
                    if (value >= 75) return "bg-green-500/30 text-green-400";
                    if (value >= 50) return "bg-amber-500/30 text-amber-400";
                    if (value >= 25) return "bg-orange-500/30 text-orange-400";
                    return "bg-red-500/30 text-red-400";
                  };

                  return (
                    <tr key={index} className="border-b border-white/10">
                      <td className="px-4 py-3 text-sm font-medium text-white">
                        {row.department}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded text-sm font-medium ${getHeatColor(
                            row.q1
                          )}`}
                        >
                          {row.q1}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded text-sm font-medium ${getHeatColor(
                            row.q2
                          )}`}
                        >
                          {row.q2}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded text-sm font-medium ${getHeatColor(
                            row.q3
                          )}`}
                        >
                          {row.q3}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded text-sm font-medium ${getHeatColor(
                            row.q4
                          )}`}
                        >
                          {row.q4}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-4 py-1 rounded-lg text-sm font-bold ${getHeatColor(
                            row.avg
                          )}`}
                        >
                          {row.avg}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

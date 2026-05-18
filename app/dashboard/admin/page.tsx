import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TopBar from "@/components/dashboard/TopBar";
import Link from "next/link";
import {
  Users,
  Target,
  CheckCircle,
  TrendingUp,
  Calendar,
  Shield,
  FileText,
  BarChart3,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch organization-wide statistics
  const [totalUsers, totalGoals, totalCycles, totalCheckIns, activeCycle] = await Promise.all([
    prisma.user.count(),
    prisma.goal.count(),
    prisma.cycle.count(),
    prisma.checkIn.count(),
    prisma.cycle.findFirst({ where: { isActive: true } }),
  ]);

  const usersByRole = await prisma.user.groupBy({
    by: ["role"],
    _count: true,
  });

  const goalsByStatus = await prisma.goal.groupBy({
    by: ["status"],
    _count: true,
  });

  const adminCards = [
    {
      title: "Manage Users",
      description: "Create, edit, and assign managers to users",
      icon: Users,
      href: "/dashboard/admin/users",
      color: "blue",
      stat: totalUsers,
      statLabel: "Total Users",
    },
    {
      title: "Manage Cycles",
      description: "Create and activate goal cycles",
      icon: Calendar,
      href: "/dashboard/admin/cycles",
      color: "purple",
      stat: totalCycles,
      statLabel: "Total Cycles",
    },
    {
      title: "All Goals",
      description: "View and unlock all organization goals",
      icon: Target,
      href: "/dashboard/admin/goals",
      color: "green",
      stat: totalGoals,
      statLabel: "Total Goals",
    },
    {
      title: "Thrust Areas",
      description: "Manage goal thrust areas",
      icon: Shield,
      href: "/dashboard/admin/thrust-areas",
      color: "red",
      stat: 0,
      statLabel: "Categories",
    },
    {
      title: "Shared Goals",
      description: "Push shared goals to employees",
      icon: CheckCircle,
      href: "/dashboard/admin/shared-goals",
      color: "amber",
      stat: 0,
      statLabel: "Shared",
    },
    {
      title: "Reports",
      description: "Generate and export achievement reports",
      icon: FileText,
      href: "/dashboard/admin/reports",
      color: "indigo",
      stat: totalCheckIns,
      statLabel: "Check-ins",
    },
    {
      title: "Analytics",
      description: "View organization-wide analytics",
      icon: BarChart3,
      href: "/dashboard/admin/analytics",
      color: "pink",
      stat: 0,
      statLabel: "Insights",
    },
    {
      title: "Audit Trail",
      description: "View all system activity logs",
      icon: FileText,
      href: "/dashboard/admin/audit",
      color: "gray",
      stat: 0,
      statLabel: "Logs",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: any = {
      blue: "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
      purple: "from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
      green: "from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
      red: "from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
      amber: "from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700",
      indigo: "from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700",
      pink: "from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700",
      gray: "from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700",
    };
    return colors[color] || colors.blue;
  };

  return (
    <div>
      <TopBar
        title="Admin Dashboard"
        subtitle={activeCycle ? `Active Cycle: ${activeCycle.name}` : "No active cycle"}
      />

      <div className="p-6 lg:p-8 space-y-8">
        {/* Organization Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-blue-400" />
              <h3 className="text-sm text-gray-400">Total Users</h3>
            </div>
            <p className="text-3xl font-bold text-white">{totalUsers}</p>
            <div className="flex gap-2 mt-2 text-xs">
              {usersByRole.map((role) => (
                <span key={role.role} className="text-gray-500">
                  {role.role}: {role._count}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-green-400" />
              <h3 className="text-sm text-gray-400">Total Goals</h3>
            </div>
            <p className="text-3xl font-bold text-white">{totalGoals}</p>
            <div className="flex gap-2 mt-2 text-xs">
              {goalsByStatus.slice(0, 3).map((status) => (
                <span key={status.status} className="text-gray-500">
                  {status.status}: {status._count}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-purple-400" />
              <h3 className="text-sm text-gray-400">Cycles</h3>
            </div>
            <p className="text-3xl font-bold text-white">{totalCycles}</p>
            <p className="text-xs text-gray-500 mt-2">
              {activeCycle ? `Active: ${activeCycle.name}` : "No active cycle"}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-amber-400" />
              <h3 className="text-sm text-gray-400">Check-ins</h3>
            </div>
            <p className="text-3xl font-bold text-white">{totalCheckIns}</p>
            <p className="text-xs text-gray-500 mt-2">Total progress entries</p>
          </div>
        </div>

        {/* Admin Actions Grid */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Admin Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {adminCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
                >
                  <div
                    className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${getColorClasses(
                      card.color
                    )} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform`}
                  />

                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <Icon className="w-8 h-8 text-white" />
                      {card.stat > 0 && (
                        <span className="text-2xl font-bold text-white">{card.stat}</span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
                    <p className="text-sm text-gray-400 mb-3">{card.description}</p>

                    {card.stat > 0 && (
                      <p className="text-xs text-gray-500">{card.statLabel}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-[#ff4444]/20 to-[#ff6666]/20 border border-[#ff4444]/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-2">Quick Actions</h3>
          <p className="text-sm text-gray-300 mb-4">
            Common administrative tasks for managing the AtomQuest system
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/users"
              className="px-4 py-2 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg text-sm font-semibold transition-all"
            >
              Create User
            </Link>
            <Link
              href="/dashboard/admin/cycles"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-all"
            >
              Create Cycle
            </Link>
            <Link
              href="/dashboard/admin/thrust-areas"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-all"
            >
              Add Thrust Area
            </Link>
            <Link
              href="/dashboard/admin/reports"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-all"
            >
              Export Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

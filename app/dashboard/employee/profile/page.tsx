import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TopBar from "@/components/dashboard/TopBar";
import { User, Mail, Briefcase, Users, Calendar } from "lucide-react";

export default async function EmployeeProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "EMPLOYEE") {
    redirect("/dashboard");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      manager: {
        select: { name: true, email: true, department: true },
      },
      _count: {
        select: { goals: true },
      },
    },
  });

  if (!user) {
    redirect("/dashboard");
  }

  return (
    <div>
      <TopBar title="My Profile" subtitle="View your account information" />

      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Profile Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-[#ff4444] to-[#ff6666] rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-2">{user.name}</h2>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-sm font-medium">
                  {user.role}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {user.email}
                </div>
                {user.department && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    {user.department}
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Manager Info */}
        {user.manager && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Reporting Manager
            </h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <p className="font-semibold text-white mb-1">{user.manager.name}</p>
              <p className="text-sm text-gray-400">{user.manager.email}</p>
              {user.manager.department && (
                <p className="text-sm text-gray-500 mt-1">{user.manager.department}</p>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-[#ff4444] mb-1">{user._count.goals}</p>
              <p className="text-sm text-gray-400">Total Goals</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-400 mb-1">
                {new Date().getFullYear() - new Date(user.createdAt).getFullYear() || "<1"}
              </p>
              <p className="text-sm text-gray-400">Years with Company</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-blue-400 mb-1">Active</p>
              <p className="text-sm text-gray-400">Account Status</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

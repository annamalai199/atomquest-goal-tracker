"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { 
  Home, Target, CheckSquare, User, Clock, Users, 
  FileText, BarChart3, Settings, Shield, Tag, Share2,
  TrendingUp, Search, Menu, X, LogOut
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
    department?: string;
  };
}

const roleLinks = {
  EMPLOYEE: [
    { href: "/dashboard/employee", label: "Dashboard", icon: Home },
    { href: "/dashboard/employee/goals", label: "My Goals", icon: Target },
    { href: "/dashboard/employee/checkins", label: "Check-ins", icon: CheckSquare },
    { href: "/dashboard/employee/profile", label: "Profile", icon: User },
  ],
  MANAGER: [
    { href: "/dashboard/manager", label: "Dashboard", icon: Home },
    { href: "/dashboard/manager/team", label: "My Team", icon: Users },
    { href: "/dashboard/manager/approvals", label: "Approvals", icon: Clock },
    { href: "/dashboard/manager/checkins", label: "Team Check-ins", icon: FileText },
    { href: "/dashboard/manager/reports", label: "Reports", icon: BarChart3 },
  ],
  ADMIN: [
    { href: "/dashboard/admin", label: "Dashboard", icon: Home },
    { href: "/dashboard/admin/cycles", label: "Manage Cycles", icon: Settings },
    { href: "/dashboard/admin/users", label: "Manage Users", icon: Users },
    { href: "/dashboard/admin/goals", label: "All Goals", icon: Target },
    { href: "/dashboard/admin/thrust-areas", label: "Thrust Areas", icon: Tag },
    { href: "/dashboard/admin/shared-goals", label: "Shared Goals", icon: Share2 },
    { href: "/dashboard/admin/completion", label: "Completion", icon: CheckSquare },
    { href: "/dashboard/admin/reports", label: "Reports", icon: FileText },
    { href: "/dashboard/admin/analytics", label: "Analytics", icon: TrendingUp },
    { href: "/dashboard/admin/audit", label: "Audit", icon: Search },
  ],
};

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();

  // FIX 1: Use session role to filter links (fallback to prop if session not loaded)
  const userRole = session?.user?.role || user.role;
  const links = roleLinks[userRole as keyof typeof roleLinks] || roleLinks.EMPLOYEE;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "MANAGER": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "EMPLOYEE": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#ff4444] rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">AtomQuest</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? "bg-[#ff4444] text-white shadow-lg shadow-[#ff4444]/20"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-white/10">
        <div className="bg-white/5 rounded-lg p-4 mb-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#ff4444] to-[#ff6666] rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              {user.department && (
                <p className="text-xs text-gray-500 mt-1">{user.department}</p>
              )}
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border mt-2 ${getRoleBadgeColor(user.role)}`}>
                <Shield className="w-3 h-3" />
                {user.role}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-lg text-white"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 h-screen bg-white/5 backdrop-blur-xl border-r border-white/10 fixed left-0 top-0">
        <SidebarContent />
      </aside>

      {/* Sidebar - Mobile */}
      <aside
        className={`lg:hidden flex flex-col w-64 h-screen bg-[#0a0a0f] border-r border-white/10 fixed left-0 top-0 z-40 transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

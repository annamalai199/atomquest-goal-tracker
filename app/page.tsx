import Link from "next/link";
import { Target, Users, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-16 h-16 bg-[#ff4444] rounded-2xl flex items-center justify-center">
              <Target className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold">AtomQuest</h1>
          </div>

          {/* Headline */}
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Goal Setting & Tracking Portal
          </h2>

          {/* Subheadline */}
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Streamline your organization&apos;s goal management with our comprehensive tracking system. Set goals, track progress, and achieve excellence.
          </p>

          {/* CTA Button */}
          <div className="flex items-center justify-center gap-4 mb-20">
            <Link
              href="/auth/login"
              className="px-8 py-4 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg font-semibold text-lg transition-all shadow-lg shadow-[#ff4444]/20 hover:shadow-[#ff4444]/40"
            >
              Sign In
            </Link>
          </div>
          
          {/* Admin Contact Note */}
          <p className="text-sm text-gray-500 mb-20">
            Need access? Contact your administrator to create an account.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            {/* Feature 1 */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Target className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Employee Goals</h3>
              <p className="text-gray-400">
                Create and track your goals with real-time progress monitoring
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Manager Approvals</h3>
              <p className="text-gray-400">
                Review and approve team goals with inline editing capabilities
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <BarChart3 className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Analytics & Reports</h3>
              <p className="text-gray-400">
                Comprehensive reporting and analytics for data-driven decisions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500">
          <p>&copy; 2026 AtomQuest by Atomberg. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

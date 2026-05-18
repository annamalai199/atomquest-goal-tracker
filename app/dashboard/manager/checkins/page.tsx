"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import TopBar from "@/components/dashboard/TopBar";
import toast from "react-hot-toast";
import { MessageSquare, Send, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

// Progress Ring Component
function ProgressRing({ score }: { score: number }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = score >= 75 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="absolute" width="80" height="80" viewBox="0 0 80 80">
        {/* Background circle */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="6"
        />
        {/* Progress circle */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filled}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-sm font-bold" style={{ color }}>
          {score.toFixed(0)}%
        </div>
        <div className="text-xs text-gray-400">Score</div>
      </div>
    </div>
  );
}

export default function ManagerCheckinsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [comment, setComment] = useState<{ [key: string]: string }>({});
  const [commentError, setCommentError] = useState<{ [key: string]: boolean }>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchCheckins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCheckins = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/checkins");
      const data = await res.json();
      
      // API already filters by managerId server-side
      setCheckins(data.checkIns || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load check-ins");
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (checkinId: string) => {
    const commentText = comment[checkinId];
    
    // FIX 8: Required comment validation
    if (!commentText || commentText.trim().length === 0) {
      setCommentError((prev) => ({ ...prev, [checkinId]: true }));
      toast.error("A check-in comment is required per BRD");
      return;
    }
    
    if (commentText.trim().length < 10) {
      setCommentError((prev) => ({ ...prev, [checkinId]: true }));
      toast.error("Comment must be at least 10 characters for meaningful feedback");
      return;
    }

    // Clear error if validation passes
    setCommentError((prev) => ({ ...prev, [checkinId]: false }));
    setActionLoading(checkinId);
    try {
      const res = await fetch(`/api/checkins/${checkinId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerComment: commentText }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add comment");
      }

      // Optimistic update
      setCheckins((prev) =>
        prev.map((c) =>
          c.id === checkinId
            ? { ...c, managerComment: commentText, commentedAt: new Date().toISOString() }
            : c
        )
      );
      setComment((prev) => ({ ...prev, [checkinId]: "" }));
      toast.success("Comment added successfully");
    } catch (error: any) {
      console.error("Comment error:", error);
      toast.error(error.message || "Failed to add comment");
    } finally {
      setActionLoading(null);
    }
  };

  const getProgressIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      case "ON_TRACK":
        return <Minus className="w-5 h-5 text-blue-400" />;
      case "NOT_STARTED":
        return <TrendingDown className="w-5 h-5 text-gray-400" />;
      default:
        return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getProgressColor = (score: number | null) => {
    if (score === null) return "text-gray-400";
    if (score >= 80) return "text-green-400";
    if (score >= 50) return "text-blue-400";
    if (score >= 30) return "text-amber-400";
    return "text-red-400";
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Team Check-ins" subtitle="Review team progress" />
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-[#ff4444] animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar
        title="Team Check-ins"
        subtitle={`${checkins.length} check-in${checkins.length !== 1 ? "s" : ""} from your team`}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {checkins.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-white mb-2">No Check-ins Submitted Yet</h3>
            <p className="text-gray-400">Your team members haven&apos;t submitted any check-ins for review yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {checkins.map((checkin) => {
              const hasComment = !!checkin.managerComment;
              const currentComment = comment[checkin.id] || "";

              return (
                <div
                  key={checkin.id}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
                >
                  {/* Employee & Goal Info */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">
                        {checkin.goal?.title || "Unknown Goal"}
                      </h3>
                      <p className="text-sm text-gray-400">
                        <span className="text-white font-medium">
                          {checkin.goal?.employee?.name || "Unknown"}
                        </span>
                        {checkin.goal?.employee?.department && ` • ${checkin.goal.employee.department}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getProgressIcon(checkin.progressStatus)}
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-medium">
                        {checkin.quarter}
                      </span>
                    </div>
                  </div>

                  {/* Progress Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Planned Target</p>
                      <p className="text-sm font-medium text-white">{checkin.plannedTarget}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Actual Achieved</p>
                      <p className="text-sm font-medium text-white">
                        {checkin.actualAchieved ?? "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <p className="text-sm font-medium text-white">{checkin.progressStatus}</p>
                    </div>
                    <div className="flex justify-end">
                      {checkin.progressScore !== null && (
                        <ProgressRing score={checkin.progressScore} />
                      )}
                    </div>
                  </div>

                  {/* Existing Manager Comment */}
                  {hasComment && (
                    <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-blue-400" />
                        <p className="text-xs text-blue-400 font-medium">Your Comment</p>
                        {checkin.commentedAt && (
                          <span className="text-xs text-gray-500">
                            • {new Date(checkin.commentedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white whitespace-pre-line">{checkin.managerComment}</p>
                    </div>
                  )}

                  {/* Add/Update Comment */}
                  <div className="pt-4 border-t border-white/10">
                    <label className="block text-sm text-gray-400 mb-2">
                      {hasComment ? "Update Comment" : "Add Comment"}
                    </label>
                    <div className="flex gap-2">
                      <textarea
                        value={currentComment}
                        onChange={(e) => {
                          setComment((prev) => ({ ...prev, [checkin.id]: e.target.value }));
                          // Clear error on change
                          if (commentError[checkin.id]) {
                            setCommentError((prev) => ({ ...prev, [checkin.id]: false }));
                          }
                        }}
                        placeholder="Provide feedback on this check-in..."
                        rows={2}
                        className={`flex-1 px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444] resize-none text-sm ${
                          commentError[checkin.id]
                            ? "border-red-500"
                            : "border-white/10"
                        }`}
                      />
                      <button
                        onClick={() => handleAddComment(checkin.id)}
                        disabled={actionLoading === checkin.id}
                        className="px-4 py-2 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {actionLoading === checkin.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        {hasComment ? "Update" : "Send"}
                      </button>
                    </div>
                    {commentError[checkin.id] && (
                      <p className="text-xs text-red-400 mt-1">
                        ⚠️ Comment is required and must be at least 10 characters
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

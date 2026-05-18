"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import TopBar from "@/components/dashboard/TopBar";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Edit2, Send } from "lucide-react";
import { formatTarget } from "@/lib/utils";

export default function ManagerApprovalsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [returnComment, setReturnComment] = useState("");
  const [showReturnModal, setShowReturnModal] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchGoals(true);
  }, []);

  const fetchGoals = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const res = await fetch("/api/goals");
      const data = await res.json();
      
      // Filter for SUBMITTED goals, excluding admin-pushed shared goals
      const submitted = (data.goals || []).filter((g: any) => 
        g.status === "SUBMITTED" && 
        // Exclude admin-pushed shared goals (they auto-approve)
        !(g.isShared && g.managerId === null)
      );
      
      setGoals(submitted);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (goalId: string, withEdits: boolean = false) => {
    // 1. Update UI instantly - no waiting
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    setEditingGoal(null);
    toast.success("Goal approved successfully");

    // 2. Sync with server in background
    try {
      const body: any = {};
      if (withEdits && editData[goalId]) {
        body.target = editData[goalId].target;
        body.weightage = editData[goalId].weightage;
      }

      const res = await fetch(`/api/goals/${goalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // Revert on failure
        fetchGoals();
        toast.error("Failed to approve goal");
      }
    } catch (error: any) {
      // Revert on failure
      fetchGoals();
      toast.error("Failed to approve goal");
    }
  };

  const handleReturn = async (goalId: string) => {
    if (!returnComment || returnComment.length < 10) {
      toast.error("Please provide a detailed reason (min 10 characters)");
      return;
    }

    // 1. Update UI instantly
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    toast.success("Goal returned for revision");
    setShowReturnModal(null);
    setReturnComment("");

    // 2. Sync with server in background
    try {
      const res = await fetch(`/api/goals/${goalId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: returnComment }),
      });

      if (!res.ok) {
        // Revert on failure
        fetchGoals();
        toast.error("Failed to return goal");
      }
    } catch (error: any) {
      // Revert on failure
      fetchGoals();
      toast.error("Failed to return goal");
    }
  };

  const startEdit = (goal: any) => {
    setEditingGoal(goal.id);
    setEditData({
      ...editData,
      [goal.id]: {
        target: goal.target,
        weightage: goal.weightage,
      },
    });
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Pending Approvals" subtitle="Review and approve team goals" />
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-white/5 rounded-xl animate-pulse border border-white/10"
            />
          ))}
        </div>
      </div>
    );
  }

  const pendingCount = goals.length;
  const subtitle = pendingCount === 0 
    ? "All caught up! No pending approvals."
    : `${pendingCount} goal${pendingCount !== 1 ? "s" : ""} awaiting your review`;

  return (
    <div>
      <TopBar
        title="Pending Approvals"
        subtitle={subtitle}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Info note about admin KPIs */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-blue-300">
            ℹ️ Admin KPI goals are auto-approved and don&apos;t need your review. Only your team&apos;s regular goals and manager-pushed shared goals appear here.
          </p>
        </div>

        {goals.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">All Caught Up!</h3>
            <p className="text-gray-400">No pending approvals at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const isEditing = editingGoal === goal.id;
              const currentEdit = editData[goal.id] || {};

              return (
                <div
                  key={goal.id}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
                >
                  {/* Employee Info */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{goal.title}</h3>
                      <p className="text-sm text-gray-400">
                        Submitted by <span className="text-white font-medium">{goal.employee.name}</span>
                        {goal.employee.department && ` • ${goal.employee.department}`}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-medium">
                      SUBMITTED
                    </span>
                  </div>

                  {/* Description */}
                  {goal.description && (
                    <p className="text-sm text-gray-300 mb-4 whitespace-pre-line">
                      {goal.description}
                    </p>
                  )}

                  {/* Goal Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Thrust Area</p>
                      <p className="text-sm font-medium text-white">{goal.thrustArea.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">UoM</p>
                      <p className="text-sm font-medium text-white">{goal.uom}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Target</p>
                      {isEditing ? (
                        <input
                          type="number"
                          value={currentEdit.target || goal.target}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              [goal.id]: {
                                ...currentEdit,
                                target: parseFloat(e.target.value),
                              },
                            })
                          }
                          className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                        />
                      ) : (
                        <p className="text-sm font-medium text-white">{formatTarget(goal.uom, goal.target)}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Weightage</p>
                      {isEditing ? (
                        <input
                          type="number"
                          value={currentEdit.weightage || goal.weightage}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              [goal.id]: {
                                ...currentEdit,
                                weightage: parseFloat(e.target.value),
                              },
                            })
                          }
                          min={10}
                          max={100}
                          className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                        />
                      ) : (
                        <p className="text-sm font-medium text-white">{goal.weightage}%</p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleApprove(goal.id, true)}
                          disabled={actionLoading === goal.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === goal.id ? (
                            <>
                              <CheckCircle className="w-4 h-4 animate-spin" />
                              Approving...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Confirm & Approve
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setEditingGoal(null)}
                          disabled={actionLoading === goal.id}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm transition-all disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(goal.id)}
                          disabled={actionLoading === goal.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === goal.id ? (
                            <>
                              <CheckCircle className="w-4 h-4 animate-spin" />
                              Approving...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => startEdit(goal)}
                          disabled={actionLoading === goal.id}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-all disabled:opacity-50"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit & Approve
                        </button>
                        <button
                          onClick={() => setShowReturnModal(goal.id)}
                          disabled={actionLoading === goal.id}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-all ml-auto disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Return
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Return Modal */}
        {showReturnModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1f] border border-white/10 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Return Goal for Revision</h3>
              <p className="text-sm text-gray-400 mb-4">
                Please provide a detailed reason for returning this goal. The employee will see this comment.
              </p>
              <textarea
                value={returnComment}
                onChange={(e) => setReturnComment(e.target.value)}
                placeholder="Explain what needs to be changed..."
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444] resize-none mb-4"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReturn(showReturnModal)}
                  disabled={returnComment.length < 10 || actionLoading === showReturnModal}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === showReturnModal ? (
                    <>
                      <Send className="w-4 h-4 animate-spin" />
                      Returning...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Return Goal
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowReturnModal(null);
                    setReturnComment("");
                  }}
                  disabled={actionLoading === showReturnModal}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

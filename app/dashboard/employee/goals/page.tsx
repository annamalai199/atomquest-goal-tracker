"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/dashboard/TopBar";
import Link from "next/link";
import { Plus, Edit, Trash2, Send, Eye, Loader2, CheckCircle, XCircle, X } from "lucide-react";
import { GOAL_RULES } from "@/lib/validations";
import toast from "react-hot-toast";
import { formatTarget } from "@/lib/utils";

export default function EmployeeGoalsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [weightageModal, setWeightageModal] = useState<{
    open: boolean;
    goal: any;
    newWeightage: number;
  }>({ open: false, goal: null, newWeightage: 0 });

  useEffect(() => {
    fetchData(true);
  }, []);

  const fetchData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const [goalsRes, cyclesRes] = await Promise.all([
        fetch("/api/goals"),
        fetch("/api/cycles"),
      ]);

      const goalsData = await goalsRes.json();
      const cyclesData = await cyclesRes.json();

      const active = cyclesData.cycles?.find((c: any) => c.isActive);
      setActiveCycle(active);
      setGoals(goalsData.goals || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    // 1. Instant UI update
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    toast.success("Goal deleted successfully");
    setShowDeleteModal(null);

    // 2. Background sync
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        // Revert on failure
        fetchData();
        toast.error("Failed to delete goal");
      }
    } catch (error: any) {
      // Revert on failure
      fetchData();
      toast.error("Failed to delete goal");
    }
  };

  const handleSubmitAll = async () => {
    const draftGoals = goals.filter((g) => g.status === "DRAFT");
    
    if (draftGoals.length === 0) {
      toast.error("No draft goals to submit");
      return;
    }

    if (totalWeightage !== GOAL_RULES.TOTAL_WEIGHTAGE) {
      toast.error(
        `Total weightage must be exactly ${GOAL_RULES.TOTAL_WEIGHTAGE}%. Current: ${totalWeightage}%`
      );
      return;
    }

    // 1. Instant UI update - change all drafts to SUBMITTED
    setGoals((prev) =>
      prev.map((g) => (g.status === "DRAFT" ? { ...g, status: "SUBMITTED" } : g))
    );
    toast.success("Goals submitted for approval");
    
    // 2. Background sync
    try {
      // Submit all draft goals
      const submitPromises = draftGoals.map((goal) =>
        fetch(`/api/goals/${goal.id}/submit`, { method: "POST" })
      );

      const results = await Promise.all(submitPromises);
      
      // Check if all succeeded
      const allSucceeded = results.every((res) => res.ok);
      
      if (!allSucceeded) {
        // Revert on failure
        fetchData();
        toast.error("Some goals failed to submit");
        return;
      }

      // Check if any were auto-approved
      const responses = await Promise.all(results.map((r) => r.json()));
      const autoApprovedCount = responses.filter((r) => r.autoApproved).length;
      const submittedCount = responses.filter((r) => !r.autoApproved).length;

      // Refresh to get updated state
      await fetchData();

      // Show appropriate message
      if (autoApprovedCount > 0 && submittedCount === 0) {
        toast.success(`${autoApprovedCount} goal${autoApprovedCount > 1 ? "s" : ""} auto-approved! 🎉`);
      } else if (autoApprovedCount > 0 && submittedCount > 0) {
        toast.success(
          `${autoApprovedCount} goal${autoApprovedCount > 1 ? "s" : ""} auto-approved, ${submittedCount} submitted for manager approval! 🎉`
        );
      } else {
        toast.success(`${draftGoals.length} goal${draftGoals.length > 1 ? "s" : ""} submitted for approval! 🎉`);
      }
    } catch (error: any) {
      console.error("Submit all error:", error);
      toast.error(error.message || "Failed to submit goals");
      fetchData(); // Refresh on error
    } finally {
      setActionLoading(null);
    }
  };

  const openWeightageModal = (goal: any) => {
    setWeightageModal({
      open: true,
      goal,
      newWeightage: goal.weightage,
    });
  };

  const saveWeightage = async () => {
    if (weightageModal.newWeightage < GOAL_RULES.MIN_WEIGHTAGE) {
      toast.error(`Minimum ${GOAL_RULES.MIN_WEIGHTAGE}% weightage required`);
      return;
    }

    if (weightageModal.newWeightage > 100) {
      toast.error("Weightage cannot exceed 100%");
      return;
    }

    setActionLoading("weightage-modal");

    try {
      const res = await fetch(`/api/goals/${weightageModal.goal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightage: weightageModal.newWeightage }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update weightage");
      }

      toast.success("Weightage updated successfully");
      setWeightageModal({ open: false, goal: null, newWeightage: 0 });
      fetchData(); // Refresh the list
    } catch (error: any) {
      console.error("Update weightage error:", error);
      toast.error(error.message || "Failed to update weightage");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div>
        <TopBar title="My Goals" />
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

  if (!activeCycle) {
    return (
      <div className="p-8">
        <TopBar title="My Goals" />
        <div className="mt-8 text-center text-gray-400">
          <p>No active cycle found.</p>
        </div>
      </div>
    );
  }

  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);

  const canAddMore = goals.length < GOAL_RULES.MAX_GOALS;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      case "SUBMITTED":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "APPROVED":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "RETURNED":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "LOCKED":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getUoMBadge = (uom: string) => {
    switch (uom) {
      case "NUMERIC_MIN":
        return { icon: "📈", label: "Higher is Better" };
      case "NUMERIC_MAX":
        return { icon: "📉", label: "Lower is Better" };
      case "TIMELINE":
        return { icon: "📅", label: "Date-Based" };
      case "ZERO":
        return { icon: "🎯", label: "Zero Target" };
      default:
        return { icon: "📊", label: uom };
    }
  };

  return (
    <div>
      <TopBar title="My Goals" subtitle={`Cycle: ${activeCycle.name}`} />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Rebalance Banner for Shared Goals */}
        {(() => {
          const sharedGoals = goals.filter((g) => g.isShared && g.status === "DRAFT");
          const needsRebalance = totalWeightage > 100 && sharedGoals.length > 0;

          if (!needsRebalance) return null;

          return (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Send className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-400 mb-2">
                    ⚠️ Rebalancing Required - Shared Goal(s) Assigned
                  </h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Admin has assigned you shared goal(s). Your existing goals have been unlocked so you can rebalance to reach 100% total weightage.
                  </p>
                  
                  <div className="bg-white/5 p-4 rounded-lg mb-4">
                    <p className="text-sm font-medium text-white mb-2">Shared Goals (You can adjust weightage):</p>
                    {sharedGoals.map((goal) => (
                      <div key={goal.id} className="flex items-center gap-2 text-sm mb-1">
                        <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                        <span className="text-white">{goal.title}</span>
                        <span className="ml-auto text-cyan-400 font-medium">{goal.weightage}% (suggested)</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg mb-4">
                    <p className="text-sm text-red-400">
                      <strong>Current Total: {totalWeightage}%</strong> - You must adjust goals to reach exactly 100%
                    </p>
                  </div>

                  <p className="text-sm text-gray-300 mb-2">
                    <strong>Action Required:</strong>
                  </p>
                  <ul className="text-sm text-gray-300 space-y-1 mb-3">
                    <li>• You can adjust weightage of ALL goals (including shared goals)</li>
                    <li>• Each goal must have minimum 10% weightage</li>
                    <li>• Total must equal exactly 100%</li>
                    <li>• Title and Target of shared goals cannot be changed</li>
                  </ul>
                  <p className="text-xs text-gray-400">
                    💡 Tip: Edit goals below to adjust weightage. Once total equals 100%, submit for manager approval.
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Weightage Bar */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Total Weightage</h3>
            <span className="text-2xl font-bold text-white">{totalWeightage}%</span>
          </div>
          <div className="relative w-full h-4 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full transition-all ${
                totalWeightage === GOAL_RULES.TOTAL_WEIGHTAGE
                  ? "bg-green-500"
                  : totalWeightage > GOAL_RULES.TOTAL_WEIGHTAGE
                  ? "bg-red-500"
                  : "bg-gray-500"
              }`}
              style={{ width: `${Math.min(totalWeightage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-gray-400">
              {totalWeightage === GOAL_RULES.TOTAL_WEIGHTAGE ? (
                <span className="text-green-400">✓ Perfect! Ready to submit</span>
              ) : totalWeightage > GOAL_RULES.TOTAL_WEIGHTAGE ? (
                <span className="text-red-400">
                  ⚠ Over by {totalWeightage - GOAL_RULES.TOTAL_WEIGHTAGE}%
                </span>
              ) : (
                <span className="text-amber-400">
                  Remaining: {GOAL_RULES.TOTAL_WEIGHTAGE - totalWeightage}%
                </span>
              )}
            </span>
            <span className="text-gray-500">
              {goals.length}/{GOAL_RULES.MAX_GOALS} goals
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center gap-4">
          <Link
            href="/dashboard/employee/goals/new"
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              canAddMore && totalWeightage < GOAL_RULES.TOTAL_WEIGHTAGE
                ? "bg-white/10 hover:bg-white/20 text-white"
                : "bg-gray-500/20 text-gray-500 cursor-not-allowed pointer-events-none"
            }`}
          >
            <Plus className="w-5 h-5" />
            Add New Goal
          </Link>

          {/* Show Submit button only if there are DRAFT or RETURNED goals */}
          {goals.filter((g) => g.status === "DRAFT" || g.status === "RETURNED").length > 0 && (
            <button
              onClick={handleSubmitAll}
              disabled={
                totalWeightage !== GOAL_RULES.TOTAL_WEIGHTAGE ||
                actionLoading === "submit-all"
              }
              className="flex items-center gap-2 px-6 py-3 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === "submit-all" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {(() => {
                    const draftGoals = goals.filter((g) => g.status === "DRAFT");
                    const adminSharedGoals = draftGoals.filter((g) => g.isShared && g.managerId === null);
                    const regularGoals = draftGoals.filter((g) => !g.isShared || g.managerId !== null);

                    if (adminSharedGoals.length > 0 && regularGoals.length === 0) {
                      return "Submit & Auto-Approve";
                    } else if (adminSharedGoals.length > 0 && regularGoals.length > 0) {
                      return "Submit All Goals";
                    } else {
                      return "Submit All Goals for Approval";
                    }
                  })()}
                </>
              )}
            </button>
          )}
        </div>

        {/* Status Messages */}
        {goals.length > 0 && (
          <>
            {/* All goals submitted - waiting for approval */}
            {goals.every((g) => g.status === "SUBMITTED") && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Send className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-400">Goals Submitted!</h3>
                    <p className="text-sm text-gray-300">
                      Your goals have been submitted to your manager for approval. You&apos;ll be notified once they are reviewed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* All goals approved */}
            {goals.every((g) => g.status === "APPROVED" || g.status === "LOCKED") && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-400">Goals Approved! 🎉</h3>
                    <p className="text-sm text-gray-300">
                      Congratulations! All your goals have been approved by your manager. Your goals are now locked and you can start tracking progress.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Some goals returned */}
            {goals.some((g) => g.status === "RETURNED") && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-400">Goals Returned for Revision</h3>
                    <p className="text-sm text-gray-300">
                      Some goals have been returned by your manager. Please review the comments, make necessary changes, and resubmit.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Goals List */}
        {goals.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-[#ff4444]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-[#ff4444]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Goals Yet</h3>
            <p className="text-gray-400">
              Click &quot;Add New Goal&quot; button above to create your first goal for {activeCycle.name}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const uomInfo = getUoMBadge(goal.uom);
              const isUnlocked = goal.lockedAt === null;
              const needsRebalance = totalWeightage !== 100 || goals.some((g) => g.isShared && g.status === "DRAFT");
              
              // Button logic based on lockedAt field, NOT status
              const canFullEdit = goal.status === "DRAFT" || goal.status === "RETURNED";
              const canAdjustWeightage = goal.status === "APPROVED" && isUnlocked && needsRebalance;
              const canDelete = goal.status === "DRAFT" && !goal.isShared;

              return (
                <div
                  key={goal.id}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{goal.title}</h3>
                        {goal.isShared && (
                          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full text-xs font-medium">
                            🔗 Shared {goal.managerId === null && "(Auto-approve)"}
                          </span>
                        )}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            goal.status
                          )}`}
                        >
                          {goal.status}
                        </span>
                        {/* Show rebalancing badge for approved unlocked goals */}
                        {goal.status === "APPROVED" && isUnlocked && needsRebalance && (
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-medium">
                            ⚠️ Needs Rebalancing
                          </span>
                        )}
                      </div>
                      {goal.description && (
                        <p className="text-sm text-gray-400 mb-3 whitespace-pre-line">
                          {goal.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Thrust Area</p>
                      <p className="text-sm font-medium text-white">{goal.thrustArea.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Unit of Measurement</p>
                      <p className="text-sm font-medium text-white">
                        {uomInfo.icon} {uomInfo.label}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Target</p>
                      <p className="text-sm font-medium text-white">{formatTarget(goal.uom, goal.target)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Weightage</p>
                      <p className="text-sm font-medium text-white">{goal.weightage}%</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                    <Link
                      href={`/dashboard/employee/goals/${goal.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Link>

                    {/* Full edit for DRAFT/RETURNED goals */}
                    {canFullEdit && (
                      <Link
                        href={`/dashboard/employee/goals/${goal.id}/edit`}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-all"
                      >
                        <Edit className="w-4 h-4" />
                        {goal.isShared ? "Adjust Weightage" : "Edit"}
                      </Link>
                    )}

                    {/* Weightage-only edit for APPROVED but UNLOCKED goals during rebalancing */}
                    {canAdjustWeightage && (
                      <button
                        onClick={() => openWeightageModal(goal)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm transition-all"
                      >
                        <Edit className="w-4 h-4" />
                        ✏️ Adjust Weightage
                      </button>
                    )}

                    {canDelete && (
                      <button
                        disabled={actionLoading === goal.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-all ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setShowDeleteModal(goal.id)}
                      >
                        {actionLoading === goal.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Delete
                      </button>
                    )}

                    {/* Show locked message for truly locked goals (lockedAt is set) */}
                    {!isUnlocked && goal.status === "APPROVED" && (
                      <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>🔒 Locked - No edits allowed</span>
                      </div>
                    )}

                    {/* Show waiting message for submitted goals */}
                    {goal.status === "SUBMITTED" && !goal.isShared && (
                      <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                        <Send className="w-4 h-4 text-blue-400" />
                        <span>Waiting for manager approval</span>
                      </div>
                    )}

                    {/* Show processing for submitted shared goals (shouldn't happen with auto-approve) */}
                    {goal.status === "SUBMITTED" && goal.isShared && goal.managerId === null && (
                      <div className="ml-auto flex items-center gap-2 text-xs text-blue-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>⚡ Processing auto-approval...</span>
                      </div>
                    )}

                    {/* Show auto-approved badge for approved admin-pushed shared goals */}
                    {goal.status === "APPROVED" && goal.isShared && goal.managerId === null && (
                      <div className="ml-auto flex items-center gap-2 text-xs text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>✅ Auto-approved by Admin</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Professional Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1f] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Delete Goal</h3>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this goal? All associated data will be permanently removed.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDelete(showDeleteModal)}
                disabled={actionLoading === showDeleteModal}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === showDeleteModal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Goal
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDeleteModal(null)}
                disabled={actionLoading === showDeleteModal}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weightage Adjustment Modal */}
      {weightageModal.open && weightageModal.goal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1f] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <Edit className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Adjust Weightage</h3>
                  <p className="text-sm text-gray-400">Rebalancing required</p>
                </div>
              </div>
              <button
                onClick={() => setWeightageModal({ open: false, goal: null, newWeightage: 0 })}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Goal</p>
                <p className="text-white font-medium">{weightageModal.goal.title}</p>
                {weightageModal.goal.isShared && (
                  <span className="inline-block mt-2 px-2 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full text-xs font-medium">
                    🔗 Shared Goal
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Current Weightage: <span className="text-amber-400">{weightageModal.goal.weightage}%</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  New Weightage (%) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={weightageModal.newWeightage}
                  onChange={(e) =>
                    setWeightageModal({
                      ...weightageModal,
                      newWeightage: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  min={GOAL_RULES.MIN_WEIGHTAGE}
                  max={100}
                  step="1"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Min: {GOAL_RULES.MIN_WEIGHTAGE}% • Max: 100%
                </p>
              </div>

              {/* Live Preview */}
              <div className="bg-white/5 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">After change:</p>
                {(() => {
                  const newTotal =
                    totalWeightage - weightageModal.goal.weightage + weightageModal.newWeightage;
                  const isValid = newTotal === 100;
                  const isOver = newTotal > 100;
                  const isUnder = newTotal < 100;

                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Total Weightage:</span>
                      <span
                        className={`text-lg font-bold ${
                          isValid
                            ? "text-green-400"
                            : isOver
                            ? "text-red-400"
                            : "text-amber-400"
                        }`}
                      >
                        {newTotal}%
                        {isValid && " ✓"}
                        {isOver && " (Over)"}
                        {isUnder && " (Under)"}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={saveWeightage}
                disabled={actionLoading === "weightage-modal"}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === "weightage-modal" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
              <button
                onClick={() => setWeightageModal({ open: false, goal: null, newWeightage: 0 })}
                disabled={actionLoading === "weightage-modal"}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

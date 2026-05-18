"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/dashboard/TopBar";
import ConfirmDialog from "@/components/ConfirmDialog";
import toast from "react-hot-toast";
import { Save, TrendingUp, Send } from "lucide-react";
import { computeProgressScore, getProgressColor } from "@/lib/progress";
import { formatTarget, dateToTimestamp, timestampToDateStr, timestampToReadable, isTimestamp } from "@/lib/utils";

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

export default function EmployeeCheckinsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // FIX 2: Role guard - redirect if not EMPLOYEE
  useEffect(() => {
    if (session && session.user.role !== "EMPLOYEE") {
      router.push("/dashboard");
    }
  }, [session, router]);
  const [saving, setSaving] = useState(false);
  const [goals, setGoals] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<Record<string, any>>({});
  const [currentQuarter, setCurrentQuarter] = useState("Q1");
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [savedGoalIds, setSavedGoalIds] = useState<Set<string>>(new Set());
  const [manuallySetStatus, setManuallySetStatus] = useState<Set<string>>(new Set());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isQuarterSubmitted, setIsQuarterSubmitted] = useState(false);

  // Client-side score computation for live updates
  const computeClientScore = (
    goal: any,
    actualAchieved: number | null | undefined
  ): number | null => {
    // Guard: return null if no actual value
    if (
      actualAchieved === null ||
      actualAchieved === undefined ||
      isNaN(Number(actualAchieved))
    )
      return null;

    // Force to number (in case string slipped through)
    const actual = Number(actualAchieved);

    if (goal.uom === "TIMELINE") {
      const deadlineTs = Number(goal.target);
      if (!deadlineTs || !actual) return null;
      if (actual <= deadlineTs) return 100;
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysLate = Math.ceil((actual - deadlineTs) / msPerDay);
      return Math.max(0, 100 - daysLate * 5);
    }

    if (goal.uom === "ZERO") {
      return actual === 0 ? 100 : 0;
    }

    if (goal.uom === "NUMERIC_MIN") {
      if (!goal.target || goal.target === 0) return null;
      return Math.min((actual / goal.target) * 100, 100);
    }

    if (goal.uom === "NUMERIC_MAX") {
      if (actual === 0) return 100;
      if (!goal.target || goal.target === 0) return null;
      return Math.min((goal.target / actual) * 100, 100);
    }

    return null;
  };

  // Fetch data when quarter changes
  useEffect(() => {
    fetchData(currentQuarter);
  }, [currentQuarter]);

  const fetchData = async (quarter: string) => {
    try {
      setLoading(true);
      
      // Fetch approved goals
      const goalsRes = await fetch("/api/goals");
      if (!goalsRes.ok) {
        throw new Error("Failed to load goals");
      }
      const goalsData = await goalsRes.json();
      const approvedGoals = (goalsData.goals || []).filter(
        (g: any) => g.status === "APPROVED" || g.status === "LOCKED"
      );
      setGoals(approvedGoals);

      // Fetch active cycle
      const cycleRes = await fetch("/api/cycles?active=true");
      if (!cycleRes.ok) {
        throw new Error("Failed to load cycle");
      }
      const cycleData = await cycleRes.json();
      const cycle = cycleData.cycles?.[0];
      setActiveCycle(cycle);

      // FIX 5: Fetch existing check-ins for the selected quarter - only show toast on actual error
      const checkInsRes = await fetch(`/api/checkins?quarter=${quarter}`);
      if (!checkInsRes.ok) {
        toast.error("Failed to load check-ins");
        return;
      }
      const checkInsData = await checkInsRes.json();
      
      // FIX 3: Map check-ins by goalId, explicitly storing date strings so they're never re-derived
      const checkInsMap: Record<string, any> = {};
      const savedIds = new Set<string>();
      let submittedCount = 0;
      
      (checkInsData.checkIns || []).forEach((ci: any) => {
        checkInsMap[ci.goalId] = {
          ...ci,  // Preserve all fields from the database
          plannedTarget: ci.plannedTarget,
          actualAchieved: ci.actualAchieved,
          progressStatus: ci.progressStatus,
          // FIX 3: Explicitly store date strings so they're never re-derived in JSX
          plannedDate: ci.plannedTarget && isTimestamp(ci.plannedTarget)
            ? timestampToDateStr(ci.plannedTarget)
            : "",
          actualDate: ci.actualAchieved && isTimestamp(ci.actualAchieved)
            ? timestampToDateStr(ci.actualAchieved)
            : "",
        };
        
        // Mark goals with existing check-ins as saved
        if (ci.id) {
          savedIds.add(ci.goalId);
        }
        
        // Count submitted check-ins
        if (ci.submittedAt) {
          submittedCount++;
        }
      });
      
      setCheckIns(checkInsMap);
      setSavedGoalIds(savedIds);
      // Quarter is submitted only if ALL check-ins have submittedAt
      setIsQuarterSubmitted(
        (checkInsData.checkIns || []).length === approvedGoals.length && 
        submittedCount === approvedGoals.length
      );
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (goalId: string) => {
    const checkIn = checkIns[goalId];
    if (!checkIn) return;

    // 1. Show saving state and optimistically mark as saved
    setSaving(true);
    setSavedGoalIds(prev => new Set([...prev, goalId]));

    // 2. Background sync
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId,
          quarter: currentQuarter,
          plannedTarget: checkIn.plannedTarget || 0,
          actualAchieved: checkIn.actualAchieved,
          progressStatus: checkIn.progressStatus || "NOT_STARTED",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Revert saved badge on failure
        setSavedGoalIds(prev => {
          const next = new Set(prev);
          next.delete(goalId);
          return next;
        });
        throw new Error(data.error || "Failed to save check-in");
      }

      toast.success("Check-in saved successfully");
      fetchData(currentQuarter); // Refresh data
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save check-in");
      // Revert saved badge on error
      setSavedGoalIds(prev => {
        const next = new Set(prev);
        next.delete(goalId);
        return next;
      });
    } finally {
      setSaving(false);
    }
  };

  const updateCheckIn = (goalId: string, field: string, value: any) => {
    setCheckIns((prev) => {
      // Get the existing check-in or create a default one
      const existing = prev[goalId] || {
        plannedTarget: null,
        actualAchieved: null,
        progressStatus: "NOT_STARTED",
        plannedDate: "",  // FIX 3: Include date fields in default
        actualDate: "",
      };
      
      return {
        ...prev,
        [goalId]: {
          ...existing,  // Spread existing fields first (includes plannedDate, actualDate)
          [field]: value,  // Then update the specific field
        },
      };
    });
  };

  // FIX 4: Unified quarter state function - replaces isQuarterOpen, isQuarterPast, getCurrentOpenQuarter
  const getQuarterState = (q: string, cycle: any): "open" | "past" | "future" => {
    if (!cycle) return "future";
    const now = new Date();
    const qNum = parseInt(q.charAt(1));
    const opens = [
      null,
      new Date(cycle.q1Open),
      new Date(cycle.q2Open),
      new Date(cycle.q3Open),
      new Date(cycle.q4Open),
    ];
    const thisOpen = opens[qNum];
    
    // Guard against null
    if (!thisOpen) return "future";
    
    const nextOpen = opens[qNum + 1] || null;
    
    if (now < thisOpen) return "future";
    if (nextOpen && now >= nextOpen) return "past";
    return "open";
  };

  // FIX 4: Get current open quarter using unified logic
  const getCurrentOpenQuarter = (cycle: any): string | null => {
    if (!cycle) return null;
    for (let i = 1; i <= 4; i++) {
      const q = `Q${i}`;
      if (getQuarterState(q, cycle) === "open") {
        return q;
      }
    }
    return null;
  };

  // Get next upcoming quarter for banner
  const getNextUpcomingQuarter = (cycle: any): { quarter: string; date: string } | null => {
    if (!cycle) return null;
    const now = new Date();
    if (now < new Date(cycle.q1Open)) return { quarter: "Q1", date: cycle.q1Open };
    if (now < new Date(cycle.q2Open)) return { quarter: "Q2", date: cycle.q2Open };
    if (now < new Date(cycle.q3Open)) return { quarter: "Q3", date: cycle.q3Open };
    if (now < new Date(cycle.q4Open)) return { quarter: "Q4", date: cycle.q4Open };
    return null;
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Check-ins" subtitle="Loading..." />
        <div className="p-6 lg:p-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse"
            >
              <div className="h-5 bg-white/10 rounded w-1/3 mb-3" />
              <div className="h-4 bg-white/10 rounded w-1/4 mb-6" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-10 bg-white/10 rounded" />
                <div className="h-10 bg-white/10 rounded" />
                <div className="h-10 bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Helper function to get contextual empty state message
  const getEmptyStateMessage = () => {
    const now = new Date();
    
    // Check if we're before any quarter opens
    if (activeCycle && activeCycle.q1Open) {
      const q1OpenDate = new Date(activeCycle.q1Open);
      if (now < q1OpenDate) {
        const next = getNextUpcomingQuarter(activeCycle);
        return {
          icon: "⏰",
          title: "Check-in Window Not Open Yet",
          message: next 
            ? `${next.quarter} check-in window opens on ${new Date(next.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}.`
            : "All check-in windows for this cycle are complete.",
        };
      }
    }
    
    // Check if current quarter window is open
    const openQuarter = getCurrentOpenQuarter(activeCycle);
    if (openQuarter === currentQuarter) {
      return {
        icon: "📋",
        title: "No Check-ins Submitted Yet",
        message: `The ${currentQuarter} check-in window is open. You can start entering your progress updates.`,
      };
    }
    
    // Check if quarter is in the past
    const quarterState = getQuarterState(currentQuarter, activeCycle);
    if (quarterState === "past") {
      return {
        icon: "📋",
        title: "No Check-ins Recorded",
        message: `No check-ins were recorded for ${currentQuarter}.`,
      };
    }
    
    // Default: future quarter
    return {
      icon: "🔒",
      title: "Quarter Not Available Yet",
      message: `The ${currentQuarter} check-in window hasn't opened yet.`,
    };
  };

  if (goals.length === 0) {
    const emptyState = getEmptyStateMessage();
    
    return (
      <div>
        <TopBar title="Check-ins" subtitle={`${currentQuarter} Progress Update`} />
        <div className="p-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">{emptyState.icon}</div>
            <h3 className="text-xl font-bold text-white mb-2">{emptyState.title}</h3>
            <p className="text-gray-400">{emptyState.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const openQuarter = getCurrentOpenQuarter(activeCycle);

  return (
    <div>
      <TopBar title="Check-ins" subtitle={`${currentQuarter} Progress Update`} />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Quarter Selector */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Select Quarter:</span>
            <div className="text-sm text-gray-400">
              {openQuarter ? (
                <span className="text-green-400">✅ {openQuarter} check-in window is currently open</span>
              ) : (
                <span>⏳ No check-in window is currently open</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {["Q1", "Q2", "Q3", "Q4"].map((q) => {
              const quarterState = getQuarterState(q, activeCycle);
              const isAccessible = quarterState === "open" || quarterState === "past";

              return (
                <button
                  key={q}
                  onClick={() => isAccessible ? setCurrentQuarter(q) : null}
                  disabled={!isAccessible}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    currentQuarter === q
                      ? "bg-[#ff4444] text-white"
                      : quarterState === "open"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                      : quarterState === "past"
                      ? "bg-white/5 text-gray-400 hover:bg-white/10"
                      : "bg-white/5 text-gray-600 cursor-not-allowed opacity-50"
                  }`}
                >
                  {q}
                  {quarterState === "open" && <span className="ml-1 text-xs">✅</span>}
                  {quarterState === "future" && <span className="ml-1 text-xs">🔒</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* FIX 5: Check-in window banner */}
        {currentQuarter === openQuarter ? (
          <div className="bg-green-500/10 border-l-4 border-green-500 rounded-lg p-4">
            <p className="text-sm text-green-400">
              📋 The {openQuarter} check-in window is currently open. Enter your actual achievements below and submit before the next quarter opens.
            </p>
          </div>
        ) : getQuarterState(currentQuarter, activeCycle) === "past" ? (
          <div className="bg-blue-500/10 border-l-4 border-blue-500 rounded-lg p-4">
            <p className="text-sm text-blue-400">
              📋 You are viewing {currentQuarter} (past quarter). {openQuarter ? `Currently open: ${openQuarter}` : "No check-in window is currently open."}
            </p>
          </div>
        ) : getQuarterState(currentQuarter, activeCycle) === "future" ? (
          <div className="bg-gray-500/10 border-l-4 border-gray-500 rounded-lg p-4">
            <p className="text-sm text-gray-400">
              🔒 {currentQuarter} check-in window hasn't opened yet. {openQuarter ? `Currently open: ${openQuarter}` : ""}
            </p>
          </div>
        ) : null}

        {/* Goals List */}
        <div className="space-y-4">
          {goals.map((goal) => {
            // Get existing check-in from state with stable fields
            const existingCheckIn = checkIns[goal.id]
              ? {
                  ...checkIns[goal.id],
                  // FIX: If TIMELINE goal has plannedTarget=0, use goal deadline as default
                  plannedDate: checkIns[goal.id].plannedDate || 
                    (goal.uom === "TIMELINE" && (!checkIns[goal.id].plannedTarget || checkIns[goal.id].plannedTarget === 0)
                      ? timestampToDateStr(goal.target)
                      : checkIns[goal.id].plannedDate || ""),
                  plannedTarget: checkIns[goal.id].plannedTarget !== null && checkIns[goal.id].plannedTarget !== undefined
                    ? checkIns[goal.id].plannedTarget
                    : goal.target,
                }
              : {
                  // Default values when no check-in exists yet - all fields explicit
                  plannedTarget: goal.target,
                  plannedDate:
                    goal.uom === "TIMELINE"
                      ? timestampToDateStr(goal.target) // default to deadline
                      : "",
                  progressStatus: "NOT_STARTED",
                  actualAchieved: goal.uom === "ZERO" ? 0 : null,
                  actualDate: "",
                };

            const actualAchieved = existingCheckIn.actualAchieved;
            
            // Compute score LIVE from current state - updates instantly
            const progressScore = computeClientScore(goal, actualAchieved);
            
            // Determine if inputs should be read-only (window not open for this quarter)
            const isReadOnly = openQuarter !== currentQuarter;
            
            // Auto-suggest status based on score (FIX 6)
            if (progressScore !== null && !manuallySetStatus.has(goal.id) && !isReadOnly) {
              if (progressScore === 100) {
                // 100% score = COMPLETED for all goal types
                if (existingCheckIn.progressStatus !== "COMPLETED") {
                  updateCheckIn(goal.id, "progressStatus", "COMPLETED");
                }
              } else if (progressScore >= 60 && existingCheckIn.progressStatus === "NOT_STARTED") {
                updateCheckIn(goal.id, "progressStatus", "ON_TRACK");
              }
            }

            return (
              <div
                key={goal.id}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{goal.title}</h3>
                    <p className="text-sm text-gray-400">
                      Target: {formatTarget(goal.uom, goal.target)} | Weightage: {goal.weightage}%
                    </p>
                  </div>
                  {progressScore !== null && (
                    <div className="flex flex-col items-center">
                      <ProgressRing score={progressScore} />
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        {goal.uom === "TIMELINE" && progressScore === 0 && "Very late — 0% score"}
                        {goal.uom === "TIMELINE" && progressScore === 100 && "On time — 100% ✅"}
                        {goal.uom === "TIMELINE" &&
                          progressScore > 0 &&
                          progressScore < 100 &&
                          `${progressScore.toFixed(0)}% score`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Planned Target */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      {goal.uom === "TIMELINE" ? "Planned Completion Date" : `Planned Target for ${currentQuarter}`}
                    </label>
                    {goal.uom === "ZERO" ? (
                      <div className="w-full px-4 py-2 bg-white/5 border border-green-500/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold">0</span>
                          <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full">
                            🎯 Zero Target
                          </span>
                        </div>
                      </div>
                    ) : goal.uom === "TIMELINE" ? (
                      <div>
                        {/* FIX 7: Guard shared goals */}
                        {goal.isShared && goal.ownerId !== session?.user?.id ? (
                          <div>
                            <div className="w-full px-4 py-2 bg-white/5 border border-cyan-500/30 rounded-lg text-white">
                              {existingCheckIn.plannedDate || timestampToDateStr(goal.target)}
                            </div>
                            <p className="text-xs text-cyan-400 mt-1">
                              🔗 Shared goal — target set by owner
                            </p>
                          </div>
                        ) : (
                          <>
                            <input
                              type="date"
                              value={existingCheckIn.plannedDate || ""}
                              onChange={(e) => {
                                if (!e.target.value) return;
                                const timestamp = dateToTimestamp(e.target.value);
                                updateCheckIn(goal.id, "plannedTarget", timestamp);
                                updateCheckIn(goal.id, "plannedDate", e.target.value);
                              }}
                              disabled={isReadOnly}
                              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444] disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              📅 When you plan to complete this
                            </p>
                            <p className="text-xs text-blue-400 mt-1">
                              🎯 Goal deadline: {formatTarget(goal.uom, goal.target)}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              💡 Score = 100% if completed by deadline. Reduces by 5% per day late, minimum 0%.
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={existingCheckIn.plannedTarget ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateCheckIn(goal.id, "plannedTarget", val === "" ? null : parseFloat(val));
                        }}
                        placeholder="Enter planned target"
                        disabled={isReadOnly}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444] disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    )}
                  </div>

                  {/* Actual Achievement - Different input for TIMELINE and ZERO */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      {goal.uom === "TIMELINE" ? "Actual Completion Date" : "Actual Achievement"}
                    </label>
                    {goal.uom === "TIMELINE" ? (
                      <div>
                        <input
                          type="date"
                          value={existingCheckIn.actualDate || ""}
                          onChange={(e) => {
                            if (!e.target.value) return;
                            // Convert date string to Unix timestamp (number)
                            const timestamp = dateToTimestamp(e.target.value);
                            // Set BOTH fields
                            updateCheckIn(goal.id, "actualDate", e.target.value); // for display
                            updateCheckIn(goal.id, "actualAchieved", timestamp); // for score
                          }}
                          disabled={isReadOnly}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444] disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {existingCheckIn.actualAchieved && isTimestamp(existingCheckIn.actualAchieved) && (
                          <div className="text-center mt-2">
                            {existingCheckIn.actualAchieved <= goal.target ? (
                              <p className="text-xs text-green-400">
                                ✅ Completed on time — full score
                              </p>
                            ) : (() => {
                              const daysLate = Math.ceil(
                                (existingCheckIn.actualAchieved - goal.target) / (1000 * 60 * 60 * 24)
                              );
                              if (daysLate <= 20) {
                                return (
                                  <p className="text-xs text-amber-400">
                                    ⚠️ {daysLate} days late — score reduced to{" "}
                                    {progressScore !== null ? `${progressScore.toFixed(0)}%` : "0%"}
                                  </p>
                                );
                              } else {
                                return (
                                  <p className="text-xs text-red-400">
                                    ❌ {daysLate} days late — score is 0%
                                  </p>
                                );
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    ) : goal.uom === "ZERO" ? (
                      <input
                        type="number"
                        value={existingCheckIn.actualAchieved ?? ""}
                        onChange={(e) =>
                          updateCheckIn(goal.id, "actualAchieved", parseFloat(e.target.value))
                        }
                        placeholder="Enter actual count (0 = success)"
                        min="0"
                        disabled={isReadOnly}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444] disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    ) : (
                      <input
                        type="number"
                        value={existingCheckIn.actualAchieved ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateCheckIn(goal.id, "actualAchieved", val === "" ? null : parseFloat(val));
                        }}
                        placeholder="Enter actual"
                        disabled={isReadOnly}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444] disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Status</label>
                    <select
                      value={existingCheckIn.progressStatus || "NOT_STARTED"}
                      onChange={(e) => {
                        updateCheckIn(goal.id, "progressStatus", e.target.value);
                        // Track that user manually set this status
                        setManuallySetStatus(prev => new Set(prev).add(goal.id));
                      }}
                      disabled={isReadOnly}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="NOT_STARTED" className="bg-[#1a1a1f]">
                        Not Started
                      </option>
                      <option value="ON_TRACK" className="bg-[#1a1a1f]">
                        On Track
                      </option>
                      <option value="COMPLETED" className="bg-[#1a1a1f]">
                        Completed
                      </option>
                    </select>
                  </div>
                </div>

                {/* Score Explanation per UoM */}
                {goal.uom === "ZERO" && existingCheckIn.actualAchieved !== null && existingCheckIn.actualAchieved !== undefined && (
                  <div className="text-center mb-4">
                    {existingCheckIn.actualAchieved === 0 ? (
                      <p className="text-xs text-green-400">✅ Zero incidents!</p>
                    ) : existingCheckIn.actualAchieved > 0 ? (
                      <p className="text-xs text-red-400">
                        ❌ {existingCheckIn.actualAchieved} incidents = 0%
                      </p>
                    ) : null}
                  </div>
                )}
                {(goal.uom === "NUMERIC_MIN" || goal.uom === "NUMERIC_MAX") &&
                  progressScore !== null && (
                    <p className="text-xs text-gray-500 text-center mb-4">
                      {goal.uom === "NUMERIC_MIN"
                        ? `${existingCheckIn.actualAchieved} ÷ ${goal.target} × 100 = ${progressScore.toFixed(0)}%`
                        : `${goal.target} ÷ ${existingCheckIn.actualAchieved} × 100 = ${progressScore.toFixed(0)}%`}
                    </p>
                  )}

                {/* FIX 4: Save Button with saved state */}
                {isReadOnly ? (
                  // Read-only mode: show Saved badge if there's data
                  existingCheckIn.id && (
                    <div className="flex items-center gap-2 px-6 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg font-semibold">
                      <Save className="w-4 h-4" />
                      Saved ✓
                    </div>
                  )
                ) : savedGoalIds.has(goal.id) ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-6 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg font-semibold">
                      <Save className="w-4 h-4" />
                      Saved ✓
                    </div>
                    <button
                      onClick={() => {
                        setSavedGoalIds(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(goal.id);
                          return newSet;
                        });
                      }}
                      className="text-sm text-gray-400 hover:text-white underline"
                    >
                      Re-edit
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSave(goal.id)}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save Check-in"}
                  </button>
                )}

                {/* Manager Comment */}
                {existingCheckIn.managerComment && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-400 mb-1">Manager Comment:</p>
                    <p className="text-sm text-gray-300">{existingCheckIn.managerComment}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit All Check-ins Button - Only show when window is open */}
        {goals.length > 0 && openQuarter === currentQuarter && (
          <>
            {isQuarterSubmitted ? (
              <div className="mt-6 bg-green-500/10 border-l-4 border-green-500 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Send className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-400 mb-1">
                      {currentQuarter} Check-ins Submitted ✓
                    </h3>
                    <p className="text-sm text-gray-400">
                      Your check-ins for {currentQuarter} have been submitted to your manager for review. You can still edit them if needed.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Submit {currentQuarter} Check-ins
                </h3>
                <p className="text-sm text-gray-400">
                  {savedGoalIds.size} of {goals.length} check-ins saved
                </p>
              </div>
              <button
                onClick={() => setShowSubmitDialog(true)}
                disabled={savedGoalIds.size !== goals.length}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  savedGoalIds.size === goals.length
                    ? "bg-[#ff4444] hover:bg-[#ff5555] text-white"
                    : "bg-gray-500/20 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Send className="w-5 h-5" />
                Submit All Check-ins for {currentQuarter}
              </button>
            </div>
            {savedGoalIds.size !== goals.length && (
              <p className="text-xs text-amber-400 mt-2">
                ⚠️ Please save all check-ins before submitting
              </p>
            )}
          </div>
            )}
          </>
        )}
      </div>

      {/* Professional Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSubmitDialog}
        onClose={() => setShowSubmitDialog(false)}
        onConfirm={async () => {
          setSubmitting(true);
          try {
            const res = await fetch("/api/checkins/submit-quarter", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                quarter: currentQuarter,
                cycleId: activeCycle?.id,
              }),
            });

            const data = await res.json();

            if (!res.ok) {
              throw new Error(data.error || "Failed to submit check-ins");
            }

            toast.success(
              `✅ Your ${currentQuarter} check-in has been submitted to your manager.`,
              { duration: 5000 }
            );
            setShowSubmitDialog(false);
            fetchData(currentQuarter);
          } catch (error: any) {
            console.error("Submit error:", error);
            toast.error(error.message || "Failed to submit check-ins");
          } finally {
            setSubmitting(false);
          }
        }}
        title={`Submit ${currentQuarter} Check-in`}
        message={`You are about to submit your ${currentQuarter} check-in for review. Your manager will be notified and will review your progress. Once submitted, you can still edit your check-ins if needed.`}
        confirmText="Submit to Manager"
        cancelText="Cancel"
        type="warning"
        loading={submitting}
      />
    </div>
  );
}

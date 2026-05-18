"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import TopBar from "@/components/dashboard/TopBar";
import WeightageBar from "@/components/goals/WeightageBar";
import { GOAL_RULES } from "@/lib/validations";
import { dateToTimestamp, timestampToReadable, timestampToDateStr, isTimestamp } from "@/lib/utils";
import toast from "react-hot-toast";
import { ArrowLeft, Save, Loader2, Target, Lock } from "lucide-react";
import Link from "next/link";

export default function EditGoalPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [thrustAreas, setThrustAreas] = useState<any[]>([]);
  const [existingGoals, setExistingGoals] = useState<any[]>([]);
  const [originalGoal, setOriginalGoal] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    thrustAreaId: "",
    uom: "NUMERIC_MIN",
    target: "",
    targetDate: "",
    weightage: GOAL_RULES.MIN_WEIGHTAGE,
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch the goal to edit
      const goalRes = await fetch(`/api/goals/${params.id}`);
      const goalData = await goalRes.json();

      if (!goalRes.ok) {
        throw new Error(goalData.error || "Failed to load goal");
      }

      const goal = goalData.goal;
      setOriginalGoal(goal);

      // Check if user can edit this goal
      if (goal.status !== "DRAFT" && goal.status !== "RETURNED") {
        toast.error("You can only edit draft or returned goals");
        router.push("/dashboard/employee/goals");
        return;
      }

      // Set form data
      setFormData({
        title: goal.title,
        description: goal.description || "",
        thrustAreaId: goal.thrustAreaId,
        uom: goal.uom,
        target: goal.target.toString(),
        targetDate: goal.uom === "TIMELINE" && isTimestamp(goal.target) 
          ? timestampToDateStr(goal.target) 
          : "",
        weightage: goal.weightage,
      });

      // Fetch thrust areas
      const thrustRes = await fetch("/api/thrust-areas");
      const thrustData = await thrustRes.json();
      setThrustAreas(thrustData.thrustAreas || []);

      // Fetch other goals in the same cycle (excluding this one)
      const goalsRes = await fetch(`/api/goals?cycleId=${goal.cycleId}`);
      const goalsData = await goalsRes.json();
      const otherGoals = (goalsData.goals || []).filter((g: any) => g.id !== params.id);
      setExistingGoals(otherGoals);
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast.error(error.message || "Failed to load data");
      router.push("/dashboard/employee/goals");
    } finally {
      setLoading(false);
    }
  };

  const existingWeightage = existingGoals.reduce((sum, g) => sum + g.weightage, 0);
  const totalWeightage = existingWeightage + formData.weightage;

  const handleUoMChange = (newUom: string) => {
    if (originalGoal?.isShared) return; // Can't change UoM for shared goals
    
    setFormData(prev => ({
      ...prev,
      uom: newUom,
      target: newUom === "ZERO" ? "0" : "",
      targetDate: ""
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title || formData.title.trim() === "") {
      toast.error("Goal Title is required");
      return;
    }

    if (!formData.thrustAreaId) {
      toast.error("Please select a Thrust Area");
      return;
    }

    // UoM-specific validation
    if (formData.uom === "ZERO" && parseFloat(formData.target) !== 0) {
      toast.error("Zero Target goals must have target = 0");
      return;
    }

    if (formData.uom === "TIMELINE" && !formData.targetDate && !formData.target) {
      toast.error("Please select a deadline date");
      return;
    }

    if (formData.uom !== "ZERO" && formData.uom !== "TIMELINE" && (!formData.target || parseFloat(formData.target) <= 0)) {
      toast.error("Please enter a valid target value");
      return;
    }

    if (formData.weightage < GOAL_RULES.MIN_WEIGHTAGE) {
      toast.error(`Minimum weightage is ${GOAL_RULES.MIN_WEIGHTAGE}%`);
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/goals/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          target: parseFloat(formData.target),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update goal");
      }

      toast.success("Goal updated successfully");
      router.push("/dashboard/employee/goals");
    } catch (error: any) {
      console.error("Update goal error:", error);
      toast.error(error.message || "Failed to update goal");
    } finally {
      setSaving(false);
    }
  };

  const uomOptions = [
    {
      value: "NUMERIC_MIN",
      label: "Higher is Better",
      icon: "📈",
      description: "Sales, Revenue, Productivity",
    },
    {
      value: "NUMERIC_MAX",
      label: "Lower is Better",
      icon: "📉",
      description: "TAT, Cost, Time, Defects",
    },
    {
      value: "TIMELINE",
      label: "Date-Based",
      icon: "📅",
      description: "Project completion by deadline",
    },
    {
      value: "ZERO",
      label: "Zero Target",
      icon: "🎯",
      description: "Safety incidents, Errors",
    },
  ];

  if (loading) {
    return (
      <div>
        <TopBar title="Edit Goal" />
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-[#ff4444] animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar 
        title={originalGoal?.isShared ? "Adjust Shared Goal Weightage" : "Edit Goal"} 
        subtitle={originalGoal?.isShared ? "You can only adjust weightage. Title and Target are set by admin." : "Update your goal details"} 
      />

      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Link
          href="/dashboard/employee/goals"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Goals
        </Link>

        {/* Shared Goal Warning */}
        {originalGoal?.isShared && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-cyan-400">🔗 Shared Goal</h3>
                <p className="text-xs text-gray-300">
                  This goal was assigned by admin. You can only adjust the weightage (min 10%). Title and Target cannot be changed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Weightage Distribution */}
        <WeightageBar
          existingGoalsWeightage={existingWeightage}
          currentGoalWeightage={formData.weightage}
        />

        {/* Form */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 space-y-6">
          {/* Goal Title */}
          <div>
            <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
              Goal Title <span className="text-red-400">*</span>
              {originalGoal?.isShared && (
                <span className="text-xs text-cyan-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Read-only
                </span>
              )}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={originalGoal?.isShared}
              className={`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444] ${
                originalGoal?.isShared ? "opacity-60 cursor-not-allowed" : ""
              }`}
              placeholder="e.g., Increase sales revenue by 20%"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
              Description (Optional)
              {originalGoal?.isShared && (
                <span className="text-xs text-cyan-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Read-only
                </span>
              )}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={originalGoal?.isShared}
              rows={4}
              className={`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444] resize-none ${
                originalGoal?.isShared ? "opacity-60 cursor-not-allowed" : ""
              }`}
              placeholder="Provide additional context or details about this goal..."
            />
          </div>

          {/* Thrust Area */}
          <div>
            <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
              Thrust Area <span className="text-red-400">*</span>
              {originalGoal?.isShared && (
                <span className="text-xs text-cyan-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Read-only
                </span>
              )}
            </label>
            <select
              value={formData.thrustAreaId}
              onChange={(e) => setFormData({ ...formData, thrustAreaId: e.target.value })}
              disabled={originalGoal?.isShared}
              className={`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444] ${
                originalGoal?.isShared ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <option value="">Select Thrust Area</option>
              {thrustAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          {/* Unit of Measurement */}
          <div>
            <label className="block text-sm font-medium text-white mb-3 flex items-center gap-2">
              Unit of Measurement <span className="text-red-400">*</span>
              {originalGoal?.isShared && (
                <span className="text-xs text-cyan-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Read-only
                </span>
              )}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {uomOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleUoMChange(option.value)}
                  disabled={originalGoal?.isShared}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    formData.uom === option.value
                      ? "border-[#ff4444] bg-[#ff4444]/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  } ${originalGoal?.isShared ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{option.icon}</span>
                    <span className="font-semibold text-white">{option.label}</span>
                  </div>
                  <p className="text-xs text-gray-400">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Target and Weightage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target field changes based on UoM */}
            <div>
              <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                Target Value <span className="text-red-400">*</span>
                {originalGoal?.isShared && (
                  <span className="text-xs text-cyan-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Read-only
                  </span>
                )}
              </label>

              {/* ZERO type — locked to 0, no input */}
              {formData.uom === "ZERO" && (
                <div className="w-full px-4 py-3 bg-white/5 border border-green-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-xl">0</span>
                    <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full">
                      🎯 Auto-set to Zero
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Zero incidents / errors / defects = 100% success.
                    Any value above zero = 0% score.
                    Target is always locked at 0 for this goal type.
                  </p>
                </div>
              )}

              {/* TIMELINE type — date picker */}
              {formData.uom === "TIMELINE" && (
                <div>
                  <input
                    type="date"
                    value={formData.targetDate || ""}
                    min={new Date().toISOString().split("T")[0]}
                    disabled={originalGoal?.isShared}
                    onChange={(e) => {
                      const timestamp = dateToTimestamp(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        target: timestamp.toString(),
                        targetDate: e.target.value
                      }));
                    }}
                    className={`w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444] ${
                      originalGoal?.isShared ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    📅 Project / task must be completed by this date.
                    Score = 100% if done on or before deadline.
                  </p>
                  {formData.targetDate && (
                    <p className="text-xs text-blue-400 mt-1">
                      ✅ Deadline set: {timestampToReadable(dateToTimestamp(formData.targetDate))}
                    </p>
                  )}
                </div>
              )}

              {/* NUMERIC_MIN — Higher is Better */}
              {formData.uom === "NUMERIC_MIN" && (
                <div>
                  <input
                    type="number"
                    value={formData.target || ""}
                    min={1}
                    disabled={originalGoal?.isShared}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      target: e.target.value
                    }))}
                    placeholder="e.g. 100 (sales target, revenue goal)"
                    className={`w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444] ${
                      originalGoal?.isShared ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    📈 Score = (Actual ÷ Target) × 100
                    <br />Higher actual = better score.
                  </p>
                </div>
              )}

              {/* NUMERIC_MAX — Lower is Better */}
              {formData.uom === "NUMERIC_MAX" && (
                <div>
                  <input
                    type="number"
                    value={formData.target || ""}
                    min={1}
                    disabled={originalGoal?.isShared}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      target: e.target.value
                    }))}
                    placeholder="e.g. 10 (max bugs allowed, max TAT days)"
                    className={`w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444] ${
                      originalGoal?.isShared ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    📉 Score = (Target ÷ Actual) × 100
                    <br />Lower actual = better score.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                Weightage (%) <span className="text-red-400">*</span>
                {originalGoal?.isShared && (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    ✓ Editable
                  </span>
                )}
              </label>
              <input
                type="number"
                value={formData.weightage}
                onChange={(e) =>
                  setFormData({ ...formData, weightage: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                min={GOAL_RULES.MIN_WEIGHTAGE}
                max={100}
              />
              <p className="text-xs text-gray-400 mt-1">
                Min: {GOAL_RULES.MIN_WEIGHTAGE}% • Remaining:{" "}
                {GOAL_RULES.TOTAL_WEIGHTAGE - totalWeightage}%
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-[#ff4444] hover:bg-[#ff5555] text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>

            <Link
              href="/dashboard/employee/goals"
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-all"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

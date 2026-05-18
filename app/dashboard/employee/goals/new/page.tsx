"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import TopBar from "@/components/dashboard/TopBar";
import WeightageBar from "@/components/goals/WeightageBar";
import { GOAL_RULES } from "@/lib/validations";
import { dateToTimestamp, timestampToReadable } from "@/lib/utils";
import toast from "react-hot-toast";
import { ArrowLeft, Save, Send } from "lucide-react";
import Link from "next/link";

export default function NewGoalPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [thrustAreas, setThrustAreas] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [existingGoals, setExistingGoals] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    thrustAreaId: "",
    uom: "NUMERIC_MIN",
    target: "",
    targetDate: "",
    weightage: GOAL_RULES.MIN_WEIGHTAGE,
    cycleId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch thrust areas
      const thrustRes = await fetch("/api/thrust-areas");
      const thrustData = await thrustRes.json();
      setThrustAreas(thrustData.thrustAreas || []);

      // Fetch cycles
      const cyclesRes = await fetch("/api/cycles");
      const cyclesData = await cyclesRes.json();
      setCycles(cyclesData.cycles || []);
      
      // Set active cycle as default
      if (cyclesData.activeCycle) {
        setFormData((prev) => ({ ...prev, cycleId: cyclesData.activeCycle.id }));
        
        // Fetch existing goals for active cycle
        const goalsRes = await fetch(`/api/goals?cycleId=${cyclesData.activeCycle.id}`);
        const goalsData = await goalsRes.json();
        setExistingGoals(goalsData.goals || []);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load data");
    }
  };

  const existingWeightage = existingGoals.reduce((sum, g) => sum + g.weightage, 0);

  const totalWeightage = existingWeightage + formData.weightage;
  const canSubmit = totalWeightage === GOAL_RULES.TOTAL_WEIGHTAGE;

  const handleUoMChange = (newUom: string) => {
    setFormData(prev => ({
      ...prev,
      uom: newUom,
      target: newUom === "ZERO" ? "0" : "",
      targetDate: ""
    }));
  };

  const handleSubmit = async (asDraft: boolean) => {
    // Detailed validation with specific error messages
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

    if (formData.uom === "TIMELINE" && !formData.targetDate) {
      toast.error("Please select a deadline date");
      return;
    }

    if (formData.uom !== "ZERO" && formData.uom !== "TIMELINE" && (!formData.target || parseFloat(formData.target) <= 0)) {
      toast.error("Please enter a valid target value");
      return;
    }

    if (!formData.cycleId) {
      toast.error("Please select a Cycle");
      return;
    }

    if (formData.weightage < GOAL_RULES.MIN_WEIGHTAGE) {
      toast.error(`Minimum weightage is ${GOAL_RULES.MIN_WEIGHTAGE}%`);
      return;
    }

    if (existingGoals.length >= GOAL_RULES.MAX_GOALS) {
      toast.error(`Maximum ${GOAL_RULES.MAX_GOALS} goals allowed`);
      return;
    }

    setLoading(true);

    try {
      // Create goal
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          target: parseFloat(formData.target),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create goal");
      }

      toast.success(asDraft ? "Goal saved as draft" : "Goal created successfully");
      router.push("/dashboard/employee/goals");
    } catch (error: any) {
      console.error("Create goal error:", error);
      toast.error(error.message || "Failed to create goal");
    } finally {
      setLoading(false);
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
      description: "Safety incidents, Errors (Zero = Success)",
    },
  ];

  return (
    <div>
      <TopBar title="Create New Goal" subtitle="Define your goal for this cycle" />

      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Back Button */}
        <Link
          href="/dashboard/employee/goals"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Goals
        </Link>

        {/* Weightage Bar */}
        <WeightageBar
          currentGoalWeightage={formData.weightage}
          existingGoalsWeightage={existingWeightage}
        />

        {/* Form */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 space-y-6">
          {/* Goal Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Goal Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Increase quarterly sales by 30%"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444] focus:border-transparent"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide additional context or details about this goal..."
              rows={4}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4444] focus:border-transparent resize-none"
            />
          </div>

          {/* Thrust Area */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Thrust Area <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.thrustAreaId}
              onChange={(e) => setFormData({ ...formData, thrustAreaId: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444] focus:border-transparent"
            >
              <option value="" className="bg-[#1a1a1f]">
                Select a thrust area
              </option>
              {thrustAreas.map((area) => (
                <option key={area.id} value={area.id} className="bg-[#1a1a1f]">
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          {/* Unit of Measurement */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Unit of Measurement <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {uomOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleUoMChange(option.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.uom === option.value
                      ? "border-[#ff4444] bg-[#ff4444]/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
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

          {/* Target & Weightage Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target field changes based on UoM */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Value <span className="text-red-400">*</span>
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
                    onChange={(e) => {
                      const timestamp = dateToTimestamp(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        target: timestamp.toString(),
                        targetDate: e.target.value
                      }));
                    }}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
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
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      target: e.target.value
                    }))}
                    placeholder="e.g. 100 (sales target, revenue goal)"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
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
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      target: e.target.value
                    }))}
                    placeholder="e.g. 10 (max bugs allowed, max TAT days)"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444]"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    📉 Score = (Target ÷ Actual) × 100
                    <br />Lower actual = better score.
                  </p>
                </div>
              )}
            </div>

            {/* Weightage */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Weightage (%) <span className="text-red-400">*</span>
              </label>
              <div className="space-y-3">
                <input
                  type="range"
                  min={GOAL_RULES.MIN_WEIGHTAGE}
                  max={GOAL_RULES.TOTAL_WEIGHTAGE}
                  value={formData.weightage}
                  onChange={(e) =>
                    setFormData({ ...formData, weightage: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <input
                  type="number"
                  value={formData.weightage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weightage: Math.max(
                        GOAL_RULES.MIN_WEIGHTAGE,
                        Math.min(GOAL_RULES.TOTAL_WEIGHTAGE, parseInt(e.target.value) || 0)
                      ),
                    })
                  }
                  min={GOAL_RULES.MIN_WEIGHTAGE}
                  max={GOAL_RULES.TOTAL_WEIGHTAGE}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff4444] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-6 border-t border-white/10">
            <button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? "Saving..." : "Save as Draft"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

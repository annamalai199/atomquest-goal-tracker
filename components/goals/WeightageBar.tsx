"use client";

import { GOAL_RULES } from "@/lib/validations";

interface WeightageBarProps {
  currentGoalWeightage: number;
  existingGoalsWeightage: number;
}

export default function WeightageBar({
  currentGoalWeightage,
  existingGoalsWeightage,
}: WeightageBarProps) {
  const total = existingGoalsWeightage + currentGoalWeightage;
  const remaining = GOAL_RULES.TOTAL_WEIGHTAGE - total;

  const getColor = () => {
    if (total === GOAL_RULES.TOTAL_WEIGHTAGE) return "bg-green-500";
    if (total > GOAL_RULES.TOTAL_WEIGHTAGE) return "bg-red-500";
    return "bg-amber-500";
  };

  const getMessage = () => {
    if (total === GOAL_RULES.TOTAL_WEIGHTAGE) {
      return <span className="text-green-400">✓ Perfect! Total weightage is 100%</span>;
    }
    if (total > GOAL_RULES.TOTAL_WEIGHTAGE) {
      return (
        <span className="text-red-400">
          ⚠ Over by {total - GOAL_RULES.TOTAL_WEIGHTAGE}% - Please reduce
        </span>
      );
    }
    return (
      <span className="text-amber-400">
        Remaining: {remaining}% - Add more goals or increase weightage
      </span>
    );
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Weightage Distribution</h3>
        <span className="text-2xl font-bold text-white">{total}%</span>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-6 bg-white/10 rounded-full overflow-hidden mb-3">
        {/* Existing Goals */}
        {existingGoalsWeightage > 0 && (
          <div
            className="absolute top-0 left-0 h-full bg-blue-500/50"
            style={{ width: `${Math.min(existingGoalsWeightage, 100)}%` }}
          />
        )}
        {/* Current Goal */}
        {currentGoalWeightage > 0 && (
          <div
            className={`absolute top-0 h-full ${getColor()}`}
            style={{
              left: `${Math.min(existingGoalsWeightage, 100)}%`,
              width: `${Math.min(currentGoalWeightage, 100 - existingGoalsWeightage)}%`,
            }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
        <div>
          <p className="text-gray-500 mb-1">Existing Goals</p>
          <p className="font-semibold text-blue-400">{existingGoalsWeightage}%</p>
        </div>
        <div>
          <p className="text-gray-500 mb-1">This Goal</p>
          <p className="font-semibold text-white">{currentGoalWeightage}%</p>
        </div>
        <div>
          <p className="text-gray-500 mb-1">Remaining</p>
          <p className="font-semibold text-amber-400">{Math.max(0, remaining)}%</p>
        </div>
      </div>

      {/* Message */}
      <div className="text-sm font-medium">{getMessage()}</div>

      {/* Rules */}
      <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-500 space-y-1">
        <p>• Total weightage must equal exactly {GOAL_RULES.TOTAL_WEIGHTAGE}%</p>
        <p>• Minimum {GOAL_RULES.MIN_WEIGHTAGE}% per goal</p>
        <p>• Maximum {GOAL_RULES.MAX_GOALS} goals per cycle</p>
      </div>
    </div>
  );
}

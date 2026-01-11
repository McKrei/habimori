"use client";

import { formatDate, formatGoalTarget } from "@/src/components/formatters";
import type { GoalDetails } from "./types";
import { useTranslation } from "@/src/i18n/TranslationContext";

type GoalHeaderProps = {
  goal: GoalDetails;
  progressValue: string;
  lng: string;
};

export default function GoalHeader({ goal, progressValue, lng: _lng }: GoalHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{goal.title}</h1>
        <p className="text-sm text-slate-600">
          {goal.goal_type} · {goal.period} · {formatGoalTarget(goal)}
        </p>
        <p className="text-xs text-slate-500">
          {formatDate(goal.start_date)} → {formatDate(goal.end_date)} ·{" "}
          {goal.context?.name ?? t("goalDetails.unknownContext")}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
        {t("goalDetails.progress")} {progressValue}
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUserId } from "@/src/components/auth";
import { useContexts } from "@/src/components/useContexts";
import { useTags } from "@/src/components/useTags";
import { recalcGoalPeriods } from "@/src/components/goalPeriods";
import { useTranslation } from "@/src/i18n/TranslationContext";

type GoalType = "" | "time" | "counter" | "check";
type GoalPeriod = "day" | "week" | "month";
type GoalOp = "gte" | "lte";

const defaultPeriodCounts: Record<GoalPeriod, number> = {
  day: 30,
  week: 4,
  month: 1,
};

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [yearPart, monthPart, dayPart] = value.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function calculateEndDate(
  startDate: string,
  period: GoalPeriod,
  count: number,
) {
  if (!startDate || count < 1) return "";
  const start = parseLocalDate(startDate);
  if (!start) return "";

  const offset = count - 1;
  if (period === "day") {
    const end = new Date(start);
    end.setDate(end.getDate() + offset);
    return formatLocalDate(end);
  }
  if (period === "week") {
    const end = new Date(start);
    end.setDate(end.getDate() + offset * 7);
    return formatLocalDate(end);
  }

  const year = start.getFullYear();
  const monthIndex = start.getMonth() + offset;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(start.getDate(), daysInTargetMonth);
  return formatLocalDate(new Date(targetYear, targetMonth, targetDay));
}

function formatDisplayDate(value: string) {
  if (!value) return "";
  const parsed = parseLocalDate(value);
  if (!parsed) return value;
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatTimeInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const trimmed = digits.length > 4 ? digits.slice(-4) : digits;
  const padded = trimmed.padStart(4, "0");
  const hours = padded.slice(0, 2);
  const minutes = padded.slice(2);
  return `${hours}:${minutes}`;
}

function parseTimeToMinutes(value: string) {
  const [hoursPart, minutesPart] = value.split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  if (minutes < 0 || minutes > 59 || hours < 0) {
    return null;
  }
  return hours * 60 + minutes;
}

export default function NewGoalPage({ params }: { params: { lng: string } }) {
  const router = useRouter();
  const lng = params.lng;
  const { t } = useTranslation();
  const { contexts, ensureContext, isLoading: contextsLoading } = useContexts();
  const { tags, ensureTag, isLoading: tagsLoading } = useTags();
  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("");
  const [period, setPeriod] = useState<GoalPeriod>("day");
  const [periodCount, setPeriodCount] = useState(
    String(defaultPeriodCounts.day),
  );
  const [counterTargetValue, setCounterTargetValue] = useState("1");
  const [timeTargetValue, setTimeTargetValue] = useState("01:00");
  const [targetOp, setTargetOp] = useState<GoalOp>("gte");
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [endDateOverride, setEndDateOverride] = useState("");
  const [isEndDateEditing, setIsEndDateEditing] = useState(false);
  const [contextName, setContextName] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<
    { id: string; name: string }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const parsedPeriodCount = Number.parseInt(periodCount, 10);
    const computedEndDate = calculateEndDate(
      startDate,
      period,
      parsedPeriodCount,
    );
    const endDate = endDateOverride.trim() || computedEndDate;
    const hasTarget =
      goalType === "counter"
        ? counterTargetValue.trim().length > 0
        : goalType === "time"
          ? timeTargetValue.trim().length > 0
          : goalType === "check";

    return (
      title.trim().length > 0 &&
      goalType !== "" &&
      contextName.trim().length > 0 &&
      Number.isFinite(parsedPeriodCount) &&
      parsedPeriodCount > 0 &&
      endDate.trim().length > 0 &&
      hasTarget
    );
  }, [
    contextName,
    counterTargetValue,
    goalType,
    period,
    periodCount,
    startDate,
    timeTargetValue,
    title,
    endDateOverride,
  ]);

  const computedEndDate = useMemo(() => {
    const parsedPeriodCount = Number.parseInt(periodCount, 10);
    if (!Number.isFinite(parsedPeriodCount) || parsedPeriodCount <= 0) {
      return "";
    }
    return calculateEndDate(startDate, period, parsedPeriodCount);
  }, [period, periodCount, startDate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    let parsedTarget: number | null = null;
    if (!goalType) {
      setError(t("errors.goalTypeRequired"));
      return;
    }

    const parsedPeriodCount = Number.parseInt(periodCount, 10);
    if (!Number.isFinite(parsedPeriodCount) || parsedPeriodCount <= 0) {
      setError(t("errors.periodsCountInvalid"));
      return;
    }

    if (goalType === "counter") {
      const parsed = Number.parseInt(counterTargetValue, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError(t("errors.targetValueInvalid"));
        return;
      }
      parsedTarget = parsed;
    } else if (goalType === "time") {
      const minutes = parseTimeToMinutes(timeTargetValue);
      if (minutes === null || minutes <= 0) {
        setError(t("errors.timeFormatInvalid"));
        return;
      }
      parsedTarget = minutes;
    } else {
      parsedTarget = targetOp === "gte" ? 1 : 0;
    }

    const resolvedEndDate = endDateOverride.trim() || computedEndDate;
    if (!resolvedEndDate) {
      setError(t("errors.startDateAndPeriodsRequired"));
      return;
    }
    if (resolvedEndDate < startDate) {
      setError(t("errors.endDateBeforeStart"));
      return;
    }

    setIsSubmitting(true);
    const { userId, error: userError } = await getCurrentUserId();
    if (userError) {
      setError(userError);
      setIsSubmitting(false);
      return;
    }
    if (!userId) {
      setError(t("errors.loginRequired"));
      setIsSubmitting(false);
      return;
    }
    const { context, error: contextError } = await ensureContext(contextName);
    if (contextError || !context) {
      setError(contextError ?? t("errors.contextRequired"));
      setIsSubmitting(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        title: title.trim(),
        goal_type: goalType,
        period,
        target_value: parsedTarget ?? 0,
        target_op: targetOp,
        start_date: startDate,
        end_date: resolvedEndDate,
        context_id: context.id,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setIsSubmitting(false);
      return;
    }

    if (!data?.id) {
      setError(t("errors.goalCreatedButNoId"));
      setIsSubmitting(false);
      return;
    }

    if (selectedTags.length > 0) {
      const { error: tagsError } = await supabase.from("goal_tags").insert(
        selectedTags.map((tag) => ({
          goal_id: data.id,
          tag_id: tag.id,
        })),
      );

      if (tagsError) {
        setError(tagsError.message);
      }
    }

    await recalcGoalPeriods(data.id);
    router.push("/");
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("goalForm.title")}</h1>
      <form
        className="max-w-3xl space-y-6 rounded-lg border border-slate-200 bg-white p-6"
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <label className="block text-base font-medium text-slate-700">
            {t("goalForm.goalName")}
            <input
              className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 text-base"
              placeholder={t("goalForm.goalName")}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <label className="block text-sm font-medium text-slate-700 md:text-base">
              {t("goalForm.goalType")}
              <select
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                value={goalType}
                onChange={(event) =>
                  setGoalType(event.target.value as GoalType)
                }
              >
                <option value="">{t("goalForm.selectGoalType")}</option>
                <option value="time">{t("goalTypes.timer")}</option>
                <option value="counter">{t("goalTypes.counter")}</option>
                <option value="check">{t("goalTypes.checkbox")}</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700 md:text-base">
              {t("goalForm.period")}
              <select
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                value={period}
                onChange={(event) => {
                  const nextPeriod = event.target.value as GoalPeriod;
                  setPeriod(nextPeriod);
                  setPeriodCount(String(defaultPeriodCounts[nextPeriod]));
                }}
              >
                <option value="day">{t("goalPeriods.day")}</option>
                <option value="week">{t("goalPeriods.week")}</option>
                <option value="month">{t("goalPeriods.month")}</option>
              </select>
            </label>
          </div>

          {goalType ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2 text-sm font-medium text-slate-700 md:text-base">
                  <span className="block">{t("goalForm.goalDirection")}</span>
                  <label className="flex items-center gap-2 text-sm font-normal text-slate-700 md:text-base">
                    <input
                      type="radio"
                      name="targetOp"
                      value="gte"
                      checked={targetOp === "gte"}
                      onChange={() => setTargetOp("gte")}
                    />
                    {t("goalDirections.complete")}
                  </label>
                  <label className="flex items-center gap-2 text-sm font-normal text-slate-700 md:text-base">
                    <input
                      type="radio"
                      name="targetOp"
                      value="lte"
                      checked={targetOp === "lte"}
                      onChange={() => setTargetOp("lte")}
                    />
                    {t("goalDirections.limit")}
                  </label>
                </div>

                {goalType === "counter" ? (
                  <label className="block text-sm font-medium text-slate-700 md:text-base">
                    {t("goalForm.targetValue")}
                    <input
                      className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                      inputMode="numeric"
                      value={counterTargetValue}
                      onChange={(event) =>
                        setCounterTargetValue(event.target.value)
                      }
                    />
                  </label>
                ) : null}

                {goalType === "time" ? (
                  <label className="block text-sm font-medium text-slate-700 md:text-base">
                    {t("goalForm.targetTime")}
                    <input
                      className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                      inputMode="numeric"
                      value={timeTargetValue}
                      onChange={(event) =>
                        setTimeTargetValue(formatTimeInput(event.target.value))
                      }
                    />
                  </label>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <label className="block text-sm font-medium text-slate-700 md:text-base">
                  {t("goalForm.startDate")}
                  <input
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700 md:text-base">
                  {t("goalForm.periodsCount")}
                  <input
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                    inputMode="numeric"
                    value={periodCount}
                    onChange={(event) => setPeriodCount(event.target.value)}
                  />
                  <button
                    className="mt-1 text-xs text-slate-500 transition-colors hover:text-slate-700 md:text-sm"
                    type="button"
                    onClick={() => setIsEndDateEditing((prev) => !prev)}
                  >
                    {t("goalForm.endDate")}{" "}
                    {formatDisplayDate(
                      endDateOverride.trim() || computedEndDate,
                    ) || t("formatters.dash")}
                  </button>
                  {isEndDateEditing ? (
                    <input
                      className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
                      type="date"
                      value={endDateOverride || computedEndDate}
                      onChange={(event) =>
                        setEndDateOverride(event.target.value)
                      }
                    />
                  ) : null}
                </label>
              </div>
            </>
          ) : null}

          <label className="block text-base font-medium text-slate-700">
            {t("contexts.context")}
            <input
              className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 text-base"
              list="context-options"
              placeholder={t("contexts.pickOrCreate")}
              value={contextName}
              onChange={(event) => setContextName(event.target.value)}
            />
            <datalist id="context-options">
              {contexts.map((context) => (
                <option key={context.id} value={context.name} />
              ))}
            </datalist>
            {contextsLoading ? (
              <p className="mt-1 text-sm text-slate-500">{t("contexts.loading")}</p>
            ) : null}
          </label>

          <label className="block text-base font-medium text-slate-700">
            {t("tags.tags")}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                className="flex-1 rounded-md border border-slate-200 px-4 py-3 text-base"
                list="tag-options"
                placeholder={t("tags.addTag")}
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const name = tagInput.trim();
                    if (!name) return;
                    void (async () => {
                      const { tag, error: tagError } = await ensureTag(name);
                      if (tagError || !tag) {
                        setError(tagError ?? t("errors.failedToAddTag"));
                        return;
                      }
                      setSelectedTags((prev) => {
                        if (prev.some((item) => item.id === tag.id))
                          return prev;
                        return [...prev, tag];
                      });
                      setTagInput("");
                    })();
                  }
                }}
              />
              <button
                className="rounded-md border border-slate-200 px-4 py-2 text-base font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800"
                type="button"
                onClick={() => {
                  const name = tagInput.trim();
                  if (!name) return;
                  void (async () => {
                    const { tag, error: tagError } = await ensureTag(name);
                    if (tagError || !tag) {
                      setError(tagError ?? t("errors.failedToAddTag"));
                      return;
                    }
                    setSelectedTags((prev) => {
                      if (prev.some((item) => item.id === tag.id)) return prev;
                      return [...prev, tag];
                    });
                    setTagInput("");
                  })();
                }}
              >
                {t("common.add")}
              </button>
            </div>
            <datalist id="tag-options">
              {tags.map((tag) => (
                <option key={tag.id} value={tag.name} />
              ))}
            </datalist>
            {tagsLoading ? (
              <p className="mt-1 text-sm text-slate-500">{t("tags.loading")}</p>
            ) : null}
            {selectedTags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <button
                    key={tag.id}
                    className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:border-slate-300"
                    type="button"
                    onClick={() =>
                      setSelectedTags((prev) =>
                        prev.filter((item) => item.id !== tag.id),
                      )
                    }
                  >
                    {tag.name} ✕
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">{t("tags.noTagsYet")}</p>
            )}
          </label>
        </div>

        {error ? (
          <p className="mt-4 text-sm font-medium text-rose-600">{error}</p>
        ) : null}

        <div className="mt-6 flex items-center gap-3">
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? t("common.loading") : t("goalForm.title")}
          </button>
          <button
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800"
            type="button"
            onClick={() => router.push("/")}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </section>
  );
}

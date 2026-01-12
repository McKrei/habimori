"use client";

import {
  formatDateTime,
  formatDurationMinutes,
} from "@/src/components/formatters";
import type { CheckEvent, CounterEvent, GoalDetails, TimeEntry } from "./types";
import { calculateTimeMinutes } from "./utils";
import { useTranslation } from "@/src/i18n/TranslationContext";

type GoalEventsListProps = {
  goal: GoalDetails;
  timeEntries: TimeEntry[];
  counterEvents: CounterEvent[];
  checkEvents: CheckEvent[];
  onDeleteEvent: (type: "time" | "counter" | "check", id: string) => void;
  lng: string;
};

export default function GoalEventsList({
  goal,
  timeEntries,
  counterEvents,
  checkEvents,
  onDeleteEvent,
  lng: _lng,
}: GoalEventsListProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-base font-semibold">{t("goalDetails.events")}</h2>

      {goal.goal_type === "time" ? (
        <div className="mt-4 max-h-[460px] space-y-2 overflow-y-auto pr-2 text-sm text-text-secondary">
          {timeEntries.length === 0 ? (
            <p className="text-sm text-text-muted">{t("goalDetails.noTimeEntries")}</p>
          ) : (
            timeEntries.map((entry) => {
              const started = formatDateTime(entry.started_at);
              const ended = entry.ended_at
                ? formatDateTime(entry.ended_at)
                : t("goalDetails.running");
              const minutes = calculateTimeMinutes(
                [entry],
                new Date(0),
                new Date(),
              );
              return (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between"
                >
                  <span>
                    {started} → {ended}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-semibold text-text-secondary">
                      {formatDurationMinutes(minutes)}
                    </span>
                    {!goal.is_archived ? (
                      <button
                        className="rounded-md px-4 py-2 text-base text-rose-600 hover:bg-rose-500/10 hover:text-rose-600"
                        type="button"
                        onClick={() => onDeleteEvent("time", entry.id)}
                      >
                        {t("common.delete")}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {goal.goal_type === "counter" ? (
        <div className="mt-4 max-h-[460px] space-y-2 overflow-y-auto pr-2 text-sm text-text-secondary">
          {counterEvents.length === 0 ? (
            <p className="text-sm text-text-muted">{t("goalDetails.noCounterEvents")}</p>
          ) : (
            counterEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between">
                <span>{formatDateTime(event.occurred_at)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-text-secondary">
                    +{event.value_delta}
                  </span>
                  {!goal.is_archived ? (
                    <button
                      className="rounded-md px-4 py-2 text-base text-rose-600 hover:bg-rose-500/10 hover:text-rose-600"
                      type="button"
                      onClick={() => onDeleteEvent("counter", event.id)}
                    >
                      {t("common.delete")}
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {goal.goal_type === "check" ? (
        <div className="mt-4 max-h-[460px] space-y-2 overflow-y-auto pr-2 text-sm text-text-secondary">
          {checkEvents.length === 0 ? (
            <p className="text-sm text-text-muted">{t("goalDetails.noCheckEvents")}</p>
          ) : (
            checkEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between">
                <span>{formatDateTime(event.occurred_at)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-text-secondary">
                    {event.state ? t("checkEvent.done") : t("checkEvent.notDone")}
                  </span>
                  {!goal.is_archived ? (
                    <button
                      className="rounded-md px-4 py-2 text-base text-rose-600 hover:bg-rose-500/10 hover:text-rose-600"
                      type="button"
                      onClick={() => onDeleteEvent("check", event.id)}
                    >
                      {t("common.delete")}
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

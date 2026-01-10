"use client";

import { useParams, useRouter } from "next/navigation";
import GoalEditCard from "./GoalEditCard";
import GoalEntryForms from "./GoalEntryForms";
import GoalEventsList from "./GoalEventsList";
import GoalHeader from "./GoalHeader";
import { useGoalDetails } from "./useGoalDetails";
import { getTodayDateString } from "./utils";

export default function GoalDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const today = getTodayDateString();

  const {
    checkEvents,
    checkOccurredAt,
    checkState,
    counterDelta,
    counterEvents,
    counterOccurredAt,
    editEndDate,
    editTitle,
    handleAddTag,
    error,
    goal,
    handleAddCheckEvent,
    handleAddCounterEvent,
    handleAddTimeEntry,
    handleArchiveGoal,
    handleDeleteEvent,
    handleSaveGoal,
    isArchiving,
    isLoading,
    isSaving,
    isSubmitting,
    progressValue,
    selectedTags,
    setCheckOccurredAt,
    setCheckState,
    setCounterDelta,
    setCounterOccurredAt,
    setEditEndDate,
    setEditTitle,
    setSelectedTags,
    setTagInput,
    setTimeEnd,
    setTimeStart,
    tagInput,
    tags,
    tagsLoading,
    timeEnd,
    timeEntries,
    timeStart,
  } = useGoalDetails({
    goalId: typeof goalId === "string" ? goalId : undefined,
    onArchived: () => router.push("/"),
  });


  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading goal…
        </div>
      </section>
    );
  }

  if (!goal) {
    return (
      <section className="space-y-4">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error ?? "Goal not found."}
        </div>
      </section>
    );
  }

  if (goal.is_archived) {
    return (
      <section className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          This goal is archived and hidden from active views.
        </div>
        <button
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800"
          type="button"
          onClick={() => router.push("/")}
        >
          Back to Home
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <GoalHeader goal={goal} progressValue={progressValue} />

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-4">
          {!goal.is_archived ? (
            <GoalEditCard
              editTitle={editTitle}
              editEndDate={editEndDate}
              minEndDate={today}
              tagInput={tagInput}
              tags={tags}
              tagsLoading={tagsLoading}
              selectedTags={selectedTags}
              isSaving={isSaving}
              isArchiving={isArchiving}
              onTitleChange={setEditTitle}
              onEndDateChange={setEditEndDate}
              onTagInputChange={setTagInput}
              onTagAdd={() => void handleAddTag(tagInput)}
              onTagSubmit={() => void handleAddTag(tagInput)}
              onTagRemove={(id) =>
                setSelectedTags((prev) =>
                  prev.filter((item) => item.id !== id),
                )
              }
              onSave={handleSaveGoal}
              onArchive={handleArchiveGoal}
            />
          ) : null}

          <GoalEntryForms
            goal={goal}
            timeStart={timeStart}
            timeEnd={timeEnd}
            counterDelta={counterDelta}
            counterOccurredAt={counterOccurredAt}
            checkOccurredAt={checkOccurredAt}
            checkState={checkState}
            isSubmitting={isSubmitting}
            onTimeStartChange={setTimeStart}
            onTimeEndChange={setTimeEnd}
            onCounterDeltaChange={setCounterDelta}
            onCounterOccurredAtChange={setCounterOccurredAt}
            onCheckOccurredAtChange={setCheckOccurredAt}
            onCheckStateChange={setCheckState}
            onAddTimeEntry={handleAddTimeEntry}
            onAddCounterEvent={handleAddCounterEvent}
            onAddCheckEvent={handleAddCheckEvent}
          />
        </div>
      </div>

      <GoalEventsList
        goal={goal}
        timeEntries={timeEntries}
        counterEvents={counterEvents}
        checkEvents={checkEvents}
        onDeleteEvent={handleDeleteEvent}
      />
    </section>
  );
}

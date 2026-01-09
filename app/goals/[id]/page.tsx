type GoalDetailsPageProps = {
  params: { id: string };
};

export default function GoalDetailsPage({ params }: GoalDetailsPageProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Goal details</h1>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
          Goal ID: {params.id}
        </span>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">
          Goal summary, progress, and events will appear here.
        </p>
      </div>
    </section>
  );
}

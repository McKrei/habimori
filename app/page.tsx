import Link from "next/link";

export default function Home() {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Home</h1>
        <Link
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          href="/goals/new"
        >
          Add goal
        </Link>
      </div>

      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">No goals yet.</p>
        <Link
          className="mt-4 inline-flex rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900"
          href="/goals/new"
        >
          Create your first goal
        </Link>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";

export default function HomeEmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-sm text-slate-600">No active goals yet.</p>
      <Link
        className="mt-4 inline-flex rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900"
        href="/goals/new"
      >
        Create your first goal
      </Link>
    </div>
  );
}

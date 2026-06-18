"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

type Creator = { id: string; name: string };

export function PostFilters({
  creators,
  showCreator,
}: {
  creators: Creator[];
  showCreator: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [search, setSearch] = useState(params.get("q") ?? "");
  const status = params.get("status") ?? "ALL";
  const creatorId = params.get("creator") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  useEffect(() => {
    setSearch(params.get("q") ?? "");
  }, [params]);

  const update = (next: Record<string, string | null>) => {
    const url = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v) url.delete(k);
      else url.set(k, v);
    }
    router.push(`${pathname}?${url.toString()}`);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    update({ q: search || null });
  };

  return (
    <div className="surface p-3 sm:p-4">
      <form onSubmit={onSearch} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search</label>
          <input
            className="input"
            placeholder="Title, link, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={status}
            onChange={(e) => update({ status: e.target.value === "ALL" ? null : e.target.value })}
          >
            <option value="ALL">All</option>
            <option value="POSTED">Posted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETE">Complete</option>
          </select>
        </div>
        {showCreator && (
          <div>
            <label className="label">Creator</label>
            <select
              className="input"
              value={creatorId}
              onChange={(e) => update({ creator: e.target.value || null })}
            >
              <option value="">Anyone</option>
              {creators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">From</label>
          <input
            type="date"
            className="input"
            value={from}
            onChange={(e) => update({ from: e.target.value || null })}
          />
        </div>
        <div>
          <label className="label">To</label>
          <input
            type="date"
            className="input"
            value={to}
            onChange={(e) => update({ to: e.target.value || null })}
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">Apply</button>
          <button
            type="button"
            className="btn-outline"
            onClick={() => router.push(pathname)}
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "CREATOR";
  createdAt: string;
};

export function UsersClient({ initialUsers }: { initialUsers: Row[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "CREATOR" as Row["role"],
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Failed to create user");
      return;
    }
    const created = (await res.json()) as Row;
    setUsers((u) => [created, ...u]);
    setForm({ name: "", email: "", role: "CREATOR", password: "" });
    setCreating(false);
    router.refresh();
  };

  const removeUser = async (id: string) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((u) => u.filter((x) => x.id !== id));
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert((data as { error?: string }).error ?? "Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setCreating((c) => !c)} className="btn-primary">
          {creating ? "Close" : "+ New user"}
        </button>
      </div>
      {creating && (
        <form onSubmit={submit} className="surface p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input
                required
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                required
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as Row["role"] })
                }
              >
                <option value="CREATOR">Creator</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Temporary password</label>
              <input
                required
                minLength={6}
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>
          {error && (
            <div className="text-xs text-rose-600 dark:text-rose-400">{error}</div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className="btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      )}

      <div className="surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-light-surface/60 text-left text-xs uppercase tracking-wide text-brand-light-muted dark:bg-brand-dark-surface/60 dark:text-brand-dark-muted">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5 hidden sm:table-cell">Email</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5 hidden md:table-cell">Created</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-t border-brand-light-border dark:border-brand-dark-border"
              >
                <td className="px-4 py-2.5 font-medium">{u.name}</td>
                <td className="px-4 py-2.5 hidden sm:table-cell text-brand-light-muted dark:text-brand-dark-muted">
                  {u.email}
                </td>
                <td className="px-4 py-2.5">
                  <span className="chip-blue capitalize">{u.role.toLowerCase()}</span>
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell text-brand-light-muted dark:text-brand-dark-muted">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => removeUser(u.id)}
                    className="text-xs text-rose-600 hover:underline dark:text-rose-400"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

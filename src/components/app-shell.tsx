"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import type { Role } from "@/lib/enums";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";

type NavItem = { href: string; label: string; roles: Role[] };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "MANAGER", "CREATOR"] },
  { href: "/posts/new", label: "New Post", roles: ["ADMIN", "MANAGER"] },
  { href: "/admin/users", label: "Users", roles: ["ADMIN"] },
  { href: "/admin/assignments", label: "Assignments", roles: ["ADMIN"] },
  { href: "/admin/activity", label: "Activity", roles: ["ADMIN"] },
];

export function AppShell({
  user,
  children,
}: {
  user: { id: string; name: string; email: string; role: Role };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const visible = NAV.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-brand-light-border bg-white/80 backdrop-blur dark:border-brand-dark-border dark:bg-brand-dark-bg/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-light-accent text-white dark:bg-brand-dark-accent">
                CW
              </span>
              <span className="hidden sm:inline">Caption Writer</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {visible.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      "rounded-lg px-3 py-1.5 text-sm transition-colors " +
                      (active
                        ? "bg-brand-light-accentSoft text-brand-light-accent dark:bg-brand-dark-accentSoft dark:text-brand-dark-accent"
                        : "text-brand-light-muted hover:bg-brand-light-accentSoft/60 hover:text-brand-light-text dark:text-brand-dark-muted dark:hover:bg-brand-dark-accentSoft/60 dark:hover:text-brand-dark-text")
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-xs text-brand-light-muted dark:text-brand-dark-muted">
                {user.role.toLowerCase()}
              </span>
              <span className="text-sm font-medium">{user.name}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="btn-outline hidden sm:inline-flex"
            >
              Sign out
            </button>
            <button
              className="btn-ghost md:hidden h-9 w-9"
              aria-label="Open menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="md:hidden border-t border-brand-light-border dark:border-brand-dark-border">
            <div className="mx-auto max-w-6xl px-4 py-2 flex flex-col">
              {visible.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm hover:bg-brand-light-accentSoft dark:hover:bg-brand-dark-accentSoft"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="mt-1 rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-light-accentSoft dark:hover:bg-brand-dark-accentSoft"
              >
                Sign out
              </button>
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

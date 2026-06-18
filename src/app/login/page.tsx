import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md surface p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-light-accent text-white dark:bg-brand-dark-accent">
              CW
            </span>
            <div>
              <h1 className="text-lg font-semibold">Caption Writer</h1>
              <p className="text-sm text-brand-light-muted dark:text-brand-dark-muted">
                Sign in to your creator dashboard
              </p>
            </div>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

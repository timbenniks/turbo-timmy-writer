import { redirect } from "next/navigation";

import { getAllowedSession } from "@/auth/session";
import { SignInButton } from "@/components/auth/sign-in-button";
import { readAuthEnvironment } from "@/lib/env/server";

type SignInPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const authErrorMessages: Record<string, string> = {
  AccessDenied: "This GitHub account is not allowed to use this studio.",
  Configuration: "GitHub authentication is not configured correctly.",
  OAuthCallback: "GitHub could not complete the sign-in request.",
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await getAllowedSession();
  if (session) {
    redirect("/");
  }

  const environment = readAuthEnvironment();
  const { error } = await searchParams;
  const errorMessage = error
    ? (authErrorMessages[error] ?? "GitHub sign-in failed. Please try again.")
    : null;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-12 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 shadow-[0_24px_70px_rgba(37,32,24,0.1)] sm:p-9">
        <span className="grid size-10 place-items-center rounded-xl bg-foreground font-serif text-lg text-background">
          T
        </span>
        <h1 className="mt-8 font-serif text-3xl font-medium tracking-tight">
          Your writing studio
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Sign in with the allowlisted GitHub account to enter Turbo Timmy
          Writer.
        </p>

        {errorMessage ? (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-8">
          {environment ? (
            <SignInButton />
          ) : (
            <div className="rounded-xl border border-border bg-muted px-4 py-3 text-sm leading-6 text-copy">
              GitHub OAuth setup is still required. Add the four auth variables
              documented in <code className="font-mono text-xs">.env.example</code>.
            </div>
          )}
        </div>
        <p className="mt-6 text-xs leading-5 text-muted-foreground">
          Access is restricted to the configured GitHub login. No public
          accounts can be created.
        </p>
      </section>
    </main>
  );
}

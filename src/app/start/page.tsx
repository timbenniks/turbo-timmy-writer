import Link from "next/link";
import { redirect } from "next/navigation";

import { createBlankArticleAction } from "@/app/actions/articles";
import { getAllowedSession } from "@/auth/session";
import { PremiseForm } from "@/components/writing/premise-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function StartArticlePage() {
  const session = await getAllowedSession();
  if (!session) redirect("/sign-in");

  return (
    <main className="min-h-dvh bg-background px-5 py-10 sm:grid sm:place-items-center sm:py-16">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-[0_24px_70px_rgba(37,32,24,0.08)] sm:p-10">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Library
        </Link>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          New article
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-[-0.035em] sm:text-5xl">
          Start with the thought.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          Give the assistant the useful mess: a claim, observation, story, frustration, or half-formed idea.
        </p>
        <PremiseForm />
        <div className="mt-8 flex items-center gap-3 border-t border-border pt-6">
          <span className="text-sm text-muted-foreground">Already know what you want to write?</span>
          <form action={createBlankArticleAction}>
            <Button type="submit" variant="ghost" size="sm">
              Open a blank article
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}

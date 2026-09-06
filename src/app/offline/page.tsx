import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <section className="max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Connection interrupted</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Turbo Timmy Writer is offline</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Keep this page open and try again when the VPN or network reconnects. Edits already open in the writer keep using its local recovery copy and retry automatically.
        </p>
        <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Try again
        </Link>
      </section>
    </main>
  );
}

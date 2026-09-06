import type { UsageSummary } from "@/insights/model";
import { BackupActions } from "./backup-actions";

const number = new Intl.NumberFormat("en-GB");

function Metric({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{typeof value === "number" ? number.format(value) : value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}

export function UsageInsights({ summary, githubBackupTarget }: { summary: UsageSummary; githubBackupTarget: string | null }) {
  const aiSuccessRate = summary.ai.total
    ? `${Math.round((summary.ai.succeeded / summary.ai.total) * 100)}%`
    : "—";
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Private workspace metrics</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Derived from your existing writing and operational records. No tracking script or third-party analytics service is involved.
        </p>
        <BackupActions githubTarget={githubBackupTarget} />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Articles" value={summary.articles.total} detail={`${number.format(summary.articles.words)} canonical words`} />
          <Metric label="Active writing" value={summary.articles.activeLast30Days} detail="Articles updated in the last 30 days" />
          <Metric label="AI runs" value={summary.ai.total} detail={`${aiSuccessRate} succeeded · ${number.format(summary.ai.inputTokens + summary.ai.outputTokens)} recorded tokens`} />
          <Metric label="Publications" value={summary.publications.succeeded} detail={`${summary.publications.failed} failed · ${summary.publications.last30Days} attempts in 30 days`} />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold">Article pipeline</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {Object.entries(summary.articles.statuses).map(([status, count]) => (
                <div key={status} className="rounded-lg bg-muted p-3">
                  <dt className="capitalize text-muted-foreground">{status}</dt>
                  <dd className="mt-1 text-xl font-semibold">{number.format(count)}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold">Derived output</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Variants</dt><dd>{number.format(summary.variants.total)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Ready variants</dt><dd>{number.format(summary.variants.ready)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Manually edited variants</dt><dd>{number.format(summary.variants.manuallyEdited)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Average completed AI run</dt><dd>{summary.ai.averageDurationMs === null ? "—" : `${number.format(summary.ai.averageDurationMs)} ms`}</dd></div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

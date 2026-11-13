/**
 * 進捗ダッシュボード。
 * 集計する数が少ないので、グラフではなく「数字そのもの」を大きく見せる。
 */
import { WarningIcon } from "@/components/icons";
import { WeeklyReview } from "@/components/WeeklyReview";
import type { WeeklyReview as Review } from "@/lib/review";
import type { TaskStats } from "@/lib/stats";

function StatTile({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "alert" }) {
  const alert = tone === "alert" && value > 0;
  return (
    // dl / dt / dd = 「見出しと値」の組を表す HTML。読み上げソフトにも組として伝わる
    <div className={`rounded-xl p-3 ring-1 ring-inset ${alert ? "bg-red-50 ring-red-200" : "bg-slate-50 ring-slate-200"}`}>
      <dt className={`flex items-center gap-1 text-base ${alert ? "font-semibold text-red-800" : "text-slate-600"}`}>
        {alert && <WarningIcon className="size-4" />}
        {label}
      </dt>
      <dd className={`mt-0.5 text-2xl font-bold ${alert ? "text-red-800" : "text-slate-900"}`}>
        {value}
        <span className="ml-0.5 text-base font-semibold">件</span>
      </dd>
    </div>
  );
}

export function Dashboard({ stats, review }: { stats: TaskStats; review: Review }) {
  const { total, completed, active, completionRate, overdue } = stats;

  return (
    <section aria-labelledby="dashboard-heading" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <h2 id="dashboard-heading" className="text-lg font-bold text-slate-900">
        進捗
      </h2>

      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-base text-slate-600">完了率</span>
          {completionRate === null ? (
            // 0件で「0%」と出すと誤解されるので、数値は出さずに理由を書く
            <span className="text-base text-slate-600">タスクを追加すると表示されます</span>
          ) : (
            <span className="text-3xl font-bold text-slate-900">
              {completionRate}
              <span className="ml-0.5 text-base font-semibold">%</span>
              <span className="ml-2 text-base font-normal text-slate-600">
                （{completed} / {total} 件）
              </span>
            </span>
          )}
        </div>
        {completionRate !== null && (
          // role="progressbar": 読み上げソフトに「進み具合を表すバー」だと伝え、値も読ませる
          <div
            role="progressbar"
            aria-label="完了率"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completionRate}
            aria-valuetext={`${completionRate}%（${total}件中${completed}件完了）`}
            className="mt-2 h-2 overflow-hidden rounded-full bg-indigo-100"
          >
            <div className="h-full rounded-full bg-indigo-600 transition-[width]" style={{ width: `${completionRate}%` }} />
          </div>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="全タスク" value={total} />
        <StatTile label="完了" value={completed} />
        <StatTile label="未完了" value={active} />
        <StatTile label="期限切れ" value={overdue} tone="alert" />
      </dl>

      <WeeklyReview review={review} />
    </section>
  );
}

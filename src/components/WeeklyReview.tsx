/**
 * 今週の振り返り（課題2-F）。
 * 数字（今週・先週・連続日数）を主役にし、曜日ごとの完了数は小さな棒で補う。
 */
import type { WeeklyReview as Review } from "@/lib/review";

function diffText(thisWeek: number, lastWeek: number): string {
  const diff = thisWeek - lastWeek;
  if (diff > 0) return `先週より ${diff} 件多い`;
  if (diff < 0) return `先週より ${-diff} 件少ない`;
  return "先週と同じ";
}

export function WeeklyReview({ review }: { review: Review }) {
  const { days, thisWeek, lastWeek, streak } = review;
  // 棒の高さの基準（1件もない週でも 0 で割らないように最低 1 にする）
  const max = Math.max(1, ...days.map((day) => day.count));

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <h3 className="text-base font-bold text-slate-900">今週の振り返り</h3>

      <dl className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
          <dt className="text-base text-slate-600">今週完了</dt>
          <dd className="text-2xl font-bold text-slate-900">
            {thisWeek}
            <span className="ml-0.5 text-base font-semibold">件</span>
          </dd>
          <dd className="text-base text-slate-600">
            {diffText(thisWeek, lastWeek)}（先週 {lastWeek} 件）
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
          <dt className="text-base text-slate-600">連続で完了</dt>
          <dd className="text-2xl font-bold text-slate-900">
            {streak}
            <span className="ml-0.5 text-base font-semibold">日</span>
          </dd>
          <dd className="text-base text-slate-600">
            {streak === 0 ? "今日1件完了すると始まります" : "1日1件以上の完了が続いています"}
          </dd>
        </div>
      </dl>

      {/* 曜日ごとの完了数。棒の下に件数を文字でも書き、色や長さだけに頼らない */}
      <ol aria-label="曜日ごとの完了数（今週）" className="mt-3 grid grid-cols-7 gap-1">
        {days.map((day) => (
          <li
            key={day.date}
            aria-label={`${day.weekday}曜日${day.isToday ? "（今日）" : ""}：${day.isFuture ? "これから" : `${day.count}件`}`}
            className="flex flex-col items-center gap-1"
          >
            <div aria-hidden="true" className="flex h-16 w-full items-end justify-center">
              <div
                className={`w-3 rounded-t ${day.count > 0 ? "bg-indigo-600" : ""}`}
                style={{ height: `${(day.count / max) * 100}%` }}
              />
            </div>
            <span aria-hidden="true" className={`text-base ${day.isToday ? "font-bold text-slate-900" : "text-slate-600"}`}>
              {day.isToday ? "今日" : day.weekday}
            </span>
            <span aria-hidden="true" className="text-base font-semibold text-slate-900">
              {day.isFuture ? "–" : day.count}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

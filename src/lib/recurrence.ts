/**
 * 繰り返しタスク（課題2-C）の「次回の期限日」の計算。
 * 日付は "YYYY-MM-DD" の文字列で扱う（時差による1日ずれを防ぐため、計算は UTC で行う）。
 */
import type { Recurrence } from "@/types/task";

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "しない",
  daily: "毎日",
  weekly: "毎週",
  monthly: "毎月",
};

/** "YYYY-MM-DD" に、繰り返しの間隔を1回分足す */
export function addInterval(date: string, recurrence: Exclude<Recurrence, "none">): string {
  const [y, m, d] = date.split("-").map(Number);
  let next: Date;
  if (recurrence === "daily") {
    next = new Date(Date.UTC(y, m - 1, d + 1));
  } else if (recurrence === "weekly") {
    next = new Date(Date.UTC(y, m - 1, d + 7));
  } else {
    // 毎月：翌月の同じ日。翌月にその日がなければ（1/31 → 2月）、翌月の末日にする
    const lastDayOfNextMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    next = new Date(Date.UTC(y, m, Math.min(d, lastDayOfNextMonth)));
  }
  return next.toISOString().slice(0, 10);
}

/**
 * 完了したときに作る「次回分」の期限日を求める。
 *
 * 期限日（なければ今日）から間隔を1回分進め、それでも今日以前なら、今日より後になるまで進める。
 * 例（毎日）：期限が昨日のまま今日完了した → 次回は明日（今日の分を二重に作らない）
 * 例（毎週）：金曜期限を水曜に早めに完了した → 次回は翌週の金曜
 */
export function nextDueDate(
  recurrence: Exclude<Recurrence, "none">,
  dueDate: string | null,
  today: string,
): string {
  let next = addInterval(dueDate ?? today, recurrence);
  while (next <= today) {
    next = addInterval(next, recurrence);
  }
  return next;
}

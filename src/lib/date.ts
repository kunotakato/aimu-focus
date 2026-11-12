/**
 * 日付に関する純粋関数。
 *
 * 期限日は "2026-11-30" のような「日付だけの文字列」で扱う。
 * この形式は文字列のまま大小比較できる（"2026-11-30" < "2026-12-01" は true）ので、
 * 時差（タイムゾーン）による1日ずれの心配が少ない。
 */
import type { Task } from "@/types/task";

/** Date を、利用者の地域の日付で "YYYY-MM-DD" にする */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" 同士の日数の差（due - today）。明日なら 1、昨日なら -1 */
export function daysBetween(today: string, due: string): number {
  const ms = Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** 期限切れか（完了済みのタスクは期限切れとして扱わない） */
export function isOverdue(task: Pick<Task, "completed" | "dueDate">, today: string): boolean {
  return !task.completed && task.dueDate !== null && task.dueDate < today;
}

export type DueStatus =
  | { kind: "none" }
  | { kind: "overdue"; days: number }
  | { kind: "today" }
  | { kind: "soon"; days: number } // 3日以内
  | { kind: "later"; days: number };

/** 期限の状態を判定する（画面の表示分けに使う） */
export function getDueStatus(task: Pick<Task, "completed" | "dueDate">, today: string): DueStatus {
  if (task.dueDate === null) return { kind: "none" };
  const days = daysBetween(today, task.dueDate);
  if (isOverdue(task, today)) return { kind: "overdue", days: -days };
  if (days === 0) return { kind: "today" };
  if (days > 0 && days <= 3) return { kind: "soon", days };
  return { kind: "later", days };
}

/** "2026-11-30" → "2026年11月30日(月)" */
export function formatDueDate(due: string): string {
  const [y, m, d] = due.split("-").map(Number);
  const weekday = "日月火水木金土"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}年${m}月${d}日(${weekday})`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** ISO 日時 → "2026/11/12 12:34"（利用者の地域の時刻で表示） */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

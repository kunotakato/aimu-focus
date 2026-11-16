/**
 * 日報コピー（課題2-H）の文章を作る。
 * 「今日完了したこと」と「明日やること」を、Slack やメールにそのまま貼れる文章にする。
 */
import { formatDueDate, toLocalDateString } from "@/lib/date";
import { shiftDate } from "@/lib/review";
import { CATEGORY_LABELS } from "@/lib/tasks";
import type { Task } from "@/types/task";

export type DailyReport = {
  /** コピーする文章 */
  text: string;
  doneCount: number;
  nextCount: number;
};

/** "2026-11-17" → "11/17(火)" */
function shortDate(date: string): string {
  const full = formatDueDate(date); // "2026年11月17日(火)"
  const [, m, d, w] = full.match(/年(\d+)月(\d+)日\((.)\)/) ?? [];
  return `${m}/${d}(${w})`;
}

function categoryTag(task: Task): string {
  return task.category ? `［${CATEGORY_LABELS[task.category]}］` : "";
}

/** 明日やることに付ける、期限の説明 */
function dueNote(task: Task, today: string, tomorrow: string): string {
  if (task.dueDate === null) return "（今日やる）";
  if (task.dueDate < today) return `（期限切れ ${shortDate(task.dueDate)}）`;
  if (task.dueDate === today) return "（今日まで）";
  if (task.dueDate === tomorrow) return "（明日まで）";
  return `（期限 ${shortDate(task.dueDate)}）`;
}

export function buildDailyReport(tasks: Task[], today: string): DailyReport {
  const tomorrow = shiftDate(today, 1);

  // 今日完了したタスク（完了した順）
  const done = tasks
    .filter((task) => task.completed && task.completedAt && toLocalDateString(new Date(task.completedAt)) === today)
    .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!));

  // 明日やること：未完了で「期限が明日まで（期限切れを含む）」または「今日やるに選んだもの」
  const next = tasks
    .filter(
      (task) =>
        !task.completed && ((task.dueDate !== null && task.dueDate <= tomorrow) || task.focusDate === today),
    )
    .sort((a, b) => (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31"));

  const lines = [
    `【日報】${formatDueDate(today)}`,
    "",
    `■ 今日完了したこと（${done.length}件）`,
    ...(done.length > 0 ? done.map((task) => `・${task.title}${categoryTag(task)}`) : ["・なし"]),
    "",
    `■ 明日やること（${next.length}件）`,
    ...(next.length > 0
      ? next.map((task) => `・${task.title}${categoryTag(task)}${dueNote(task, today, tomorrow)}`)
      : ["・なし"]),
  ];

  return { text: lines.join("\n"), doneCount: done.length, nextCount: next.length };
}

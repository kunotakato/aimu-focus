/**
 * 進捗ダッシュボード用の集計。保存されたタスクの配列から計算する。
 */
import { isOverdue } from "@/lib/date";
import type { Task } from "@/types/task";

export type TaskStats = {
  total: number;
  completed: number;
  active: number;
  /**
   * 完了率（0〜100 の整数）。タスクが0件のときは null。
   * 0件で「0%」と出すと「何もできていない」と誤解させるため、数値にしない。
   */
  completionRate: number | null;
  /** 期限切れ（未完了で期限日が今日より前）の件数 */
  overdue: number;
};

/**
 * 完了率を計算する。
 * 四捨五入だと 199/200 件が「100%」と表示され「全部終わった」と誤解されるので、
 * 切り捨て（Math.floor）にする。100% は本当に全部終わったときだけ。
 */
export function calcCompletionRate(completed: number, total: number): number | null {
  if (total === 0) return null;
  return Math.floor((completed / total) * 100);
}

export function computeStats(tasks: Task[], today: string): TaskStats {
  // 配列を1回だけ見て、すべての数を数える
  let completed = 0;
  let overdue = 0;
  for (const task of tasks) {
    if (task.completed) completed += 1;
    if (isOverdue(task, today)) overdue += 1;
  }
  return {
    total: tasks.length,
    completed,
    active: tasks.length - completed,
    completionRate: calcCompletionRate(completed, tasks.length),
    overdue,
  };
}

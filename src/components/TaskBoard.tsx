"use client";

/**
 * タスクの入力・一覧・保存状態のメッセージをまとめた画面（ブラウザでだけ表示される）。
 */
import { useState } from "react";
import { BackupPanel } from "@/components/BackupPanel";
import { Dashboard } from "@/components/Dashboard";
import { Notice } from "@/components/Notice";
import { TaskForm } from "@/components/TaskForm";
import { TaskList } from "@/components/TaskList";
import { TaskToolbar } from "@/components/TaskToolbar";
import { useTasks, type SaveError } from "@/hooks/useTasks";
import { useToday } from "@/hooks/useToday";
import { DEFAULT_QUERY, filterTasks, isFiltering, type TaskQuery } from "@/lib/filter";
import { computeStats } from "@/lib/stats";
import type { LoadIssue } from "@/lib/storage";

const BACKUP_NOTE = "読み込めなかった元のデータは、次に変更を保存するとき、ブラウザ内に別名で退避します。";

function loadIssueMessage(issue: LoadIssue): string {
  switch (issue.type) {
    case "corrupted":
      return `保存されていたデータを読み込めませんでした（データが壊れている可能性があります）。アプリはこのまま使えます。${BACKUP_NOTE}`;
    case "partial":
      return `${issue.skipped}件のタスクを読み込めませんでした（データが壊れている可能性があります）。読み込めたタスクだけを表示しています。${BACKUP_NOTE}`;
    case "unavailable":
      return "このブラウザではデータを保存できません（プライベートモードや、ブラウザの設定が原因の可能性があります）。ページを閉じると、タスクは消えてしまいます。";
  }
}

const SAVE_ERROR_MESSAGES: Record<SaveError, string> = {
  quota: "保存できませんでした。ブラウザの保存容量がいっぱいです。不要なタスクを削除してから、もう一度操作してください。",
  unavailable: "保存できませんでした。ブラウザの設定で保存が許可されていない可能性があります。",
  "backup-failed": "読み込めなかった元のデータを退避できなかったため、データを守るために保存を中止しました。",
};

export function TaskBoard() {
  const { tasks, loadIssue, saveError, add, toggle, update, remove, replaceAll, dismissLoadIssue } = useTasks();
  const today = useToday();
  const [query, setQuery] = useState<TaskQuery>(DEFAULT_QUERY);

  // 表示するタスクは state にせず、毎回 tasks と query から計算する。
  // 同じ情報を2か所で持たないことで、「一覧と表示がずれる」バグを防ぐ。
  const visibleTasks = filterTasks(tasks, query);
  const stats = computeStats(tasks, today);

  // localStorage が使えないことは loadIssue で伝えているので、同じ内容の保存エラーは重ねて出さない
  const showSaveError = saveError && !(saveError === "unavailable" && loadIssue?.type === "unavailable");

  return (
    <div className="flex flex-col gap-6">
      {loadIssue && (
        <Notice variant="warning" onDismiss={loadIssue.type === "unavailable" ? undefined : dismissLoadIssue}>
          {loadIssueMessage(loadIssue)}
        </Notice>
      )}

      {showSaveError && (
        <Notice variant="error">
          {SAVE_ERROR_MESSAGES[saveError]}
          <br />
          画面上の変更は残っていますが、このままページを閉じると失われます。
        </Notice>
      )}

      <Dashboard stats={stats} />

      <section aria-label="タスクの追加" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <TaskForm onAdd={add} />
      </section>

      <section aria-labelledby="task-list-heading" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 id="task-list-heading" className="text-lg font-bold text-slate-900">
            タスク
          </h2>
          {tasks.length > 0 && (
            <p className="text-sm text-slate-600">
              未完了 {stats.active} 件 / 全 {stats.total} 件
            </p>
          )}
        </div>

        {tasks.length > 0 && (
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <TaskToolbar query={query} onChange={setQuery} />
          </div>
        )}

        {/* aria-live: 件数が変わったことを読み上げソフトに伝える */}
        {tasks.length > 0 && isFiltering(query) && (
          <p aria-live="polite" className="text-sm text-slate-700">
            条件に合うタスク：{visibleTasks.length} 件
          </p>
        )}

        <TaskList
          tasks={visibleTasks}
          totalCount={tasks.length}
          today={today}
          onToggle={toggle}
          onUpdate={update}
          onDelete={remove}
          onResetQuery={() => setQuery({ ...DEFAULT_QUERY, sort: query.sort })}
        />
      </section>

      <BackupPanel tasks={tasks} onRestore={replaceAll} />

      {/* JSX では改行が空白になるため、日本語の文は1つの文字列にまとめる */}
      <Notice variant="info">
        {"タスクは、このブラウザの中（localStorage）に自動で保存されます。" +
          "ほかのブラウザやスマホ・パソコンとは同期されません。" +
          "ブラウザの履歴やサイトデータを消去すると、タスクも消えるのでご注意ください。"}
      </Notice>
    </div>
  );
}

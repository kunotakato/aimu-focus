"use client";

/**
 * タスクの入力・一覧・保存状態のメッセージをまとめた画面（ブラウザでだけ表示される）。
 */
import { useState } from "react";
import { BackupPanel } from "@/components/BackupPanel";
import { Dashboard } from "@/components/Dashboard";
import { FocusPanel } from "@/components/FocusPanel";
import { ErrorIcon } from "@/components/icons";
import { Notice } from "@/components/Notice";
import { TaskForm } from "@/components/TaskForm";
import { TaskList } from "@/components/TaskList";
import { TaskToolbar } from "@/components/TaskToolbar";
import { useTasks, type SaveError } from "@/hooks/useTasks";
import { useToday } from "@/hooks/useToday";
import { DEFAULT_QUERY, filterTasks, isFiltering, type TaskQuery } from "@/lib/filter";
import { formatDueDate } from "@/lib/date";
import { computeWeeklyReview } from "@/lib/review";
import { computeStats } from "@/lib/stats";
import type { LoadIssue } from "@/lib/storage";
import { FOCUS_LIMIT, type TaskInput } from "@/lib/tasks";

const BACKUP_NOTE = "読み込めなかった元のデータは消さずに、次に保存するときブラウザ内の別の場所に残しておきます。";

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
  const { tasks, loadIssue, saveError, add, toggle, focus, update, remove, replaceAll, dismissLoadIssue } = useTasks();
  const today = useToday();
  const [query, setQuery] = useState<TaskQuery>(DEFAULT_QUERY);
  /** 最後に行った操作の結果。「押したのに何も起きない？」と不安にさせないために表示する */
  const [lastAction, setLastAction] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const done = (text: string) => setLastAction({ text, tone: "success" });

  const titleOf = (id: string) => tasks.find((task) => task.id === id)?.title ?? "";

  function handleAdd(input: TaskInput) {
    add(input);
    done(`「${input.title}」を追加しました`);
  }
  function handleToggle(id: string) {
    const task = tasks.find((t) => t.id === id);
    const created = toggle(id);
    if (task?.completed) {
      done(`「${task.title}」を未完了に戻しました`);
    } else if (created) {
      const due = created.dueDate ? `（期限 ${formatDueDate(created.dueDate)}）` : "";
      done(`「${titleOf(id)}」を完了にしました。次回分${due}を作成しました`);
    } else {
      done(`「${titleOf(id)}」を完了にしました`);
    }
  }
  function handleFocus(id: string, focused: boolean) {
    const ok = focus(id, focused, today);
    if (!ok) {
      setLastAction({
        text: `「今日やる」に選べるのは${FOCUS_LIMIT}つまでです。どれかを完了にするか、外してから選んでください`,
        tone: "error",
      });
    } else {
      done(focused ? `「${titleOf(id)}」を今日やるに選びました` : `「${titleOf(id)}」を今日やるから外しました`);
    }
  }
  function handleUpdate(id: string, changes: TaskInput) {
    update(id, changes);
    done(`「${changes.title}」を保存しました`);
  }
  function handleDelete(id: string) {
    const title = titleOf(id);
    remove(id);
    done(`「${title}」を削除しました`);
  }

  // 表示するタスクは state にせず、毎回 tasks と query から計算する。
  // 同じ情報を2か所で持たないことで、「一覧と表示がずれる」バグを防ぐ。
  const visibleTasks = filterTasks(tasks, query);
  const stats = computeStats(tasks, today);
  const focusTasks = tasks.filter((task) => task.focusDate === today);

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

      {/* タスクが1件もないうちは出さない（最初の画面をすっきりさせる） */}
      {tasks.length > 0 && (
        <FocusPanel
          tasks={focusTasks}
          today={today}
          onToggle={handleToggle}
          onUnfocus={(id) => handleFocus(id, false)}
        />
      )}

      <Dashboard stats={stats} review={computeWeeklyReview(tasks, today)} />

      <section aria-label="タスクの追加" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <TaskForm onAdd={handleAdd} />
      </section>

      <section aria-labelledby="task-list-heading" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          {/* tabIndex={-1}: 最後のタスクを削除したとき、ここへフォーカスを移せるようにする */}
          <h2 id="task-list-heading" tabIndex={-1} className="text-lg font-bold text-slate-900 focus:outline-none">
            タスク
          </h2>
          {tasks.length > 0 && (
            <p className="text-base text-slate-600">
              未完了 {stats.active} 件 / 全 {stats.total} 件
            </p>
          )}
        </div>

        {/* role="status": 内容が変わると、読み上げソフトが邪魔にならないタイミングで読み上げる */}
        <p
          role="status"
          className={`flex min-h-6 items-start gap-1.5 text-base font-medium ${
            lastAction?.tone === "error" ? "text-red-700" : "text-emerald-800"
          }`}
        >
          {lastAction?.tone === "error" && <ErrorIcon className="mt-1 size-4" />}
          {lastAction?.tone === "success" && <span aria-hidden="true">✓</span>}
          {lastAction && <span>{lastAction.text}</span>}
        </p>

        {tasks.length > 0 && (
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <TaskToolbar query={query} onChange={setQuery} />
          </div>
        )}

        {/* aria-live: 件数が変わったことを読み上げソフトに伝える */}
        {tasks.length > 0 && isFiltering(query) && (
          <p aria-live="polite" className="text-base text-slate-700">
            条件に合うタスク：{visibleTasks.length} 件
          </p>
        )}

        <TaskList
          tasks={visibleTasks}
          totalCount={tasks.length}
          today={today}
          onToggle={handleToggle}
          onFocus={handleFocus}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onResetQuery={() => setQuery({ ...DEFAULT_QUERY, sort: query.sort })}
        />
      </section>

      <BackupPanel tasks={tasks} onRestore={replaceAll} />

      {/* JSX では改行が空白になるため、日本語の文は1つの文字列にまとめる */}
      <Notice variant="info">
        {"タスクは、このブラウザの中に自動で保存されます。" +
          "ほかのブラウザやスマホ・パソコンとは同期されません。" +
          "ブラウザの履歴やサイトデータを消去すると、タスクも消えるのでご注意ください。"}
      </Notice>
    </div>
  );
}

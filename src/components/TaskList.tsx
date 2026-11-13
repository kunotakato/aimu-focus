"use client";

/**
 * タスクの一覧。
 * 「タスクが0件」と「条件に合うタスクが0件」は意味が違うので、案内を分けて表示する。
 */
import { useRef } from "react";
import { flushSync } from "react-dom";
import { TaskItem } from "@/components/TaskItem";
import type { TaskInput } from "@/lib/tasks";
import type { Task } from "@/types/task";

type Props = {
  /** 表示するタスク（絞り込み・並び替え済み） */
  tasks: Task[];
  /** 全タスクの件数（絞り込み前） */
  totalCount: number;
  today: string;
  onToggle: (id: string) => void;
  onFocus: (id: string, focused: boolean) => void;
  onUpdate: (id: string, changes: TaskInput) => void;
  onDelete: (id: string) => void;
  onResetQuery: () => void;
};

function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-10 text-center">
      <p className="text-base font-semibold text-slate-700">{title}</p>
      <div className="mt-1 text-base text-slate-600">{children}</div>
    </div>
  );
}

export function TaskList({ tasks, totalCount, today, onToggle, onFocus, onUpdate, onDelete, onResetQuery }: Props) {
  const listRef = useRef<HTMLUListElement>(null);

  /**
   * 削除したら、フォーカスを「次のタスク（最後なら前のタスク）」のチェックボックスへ移す。
   * 1件も残らなければ「タスク」見出しへ移す。削除したボタンは消えてしまうため、移さないと迷子になる。
   */
  function handleDelete(id: string) {
    const index = tasks.findIndex((task) => task.id === id);
    const neighbor = tasks[index + 1] ?? tasks[index - 1];
    flushSync(() => onDelete(id));
    const target = neighbor
      ? listRef.current?.querySelector<HTMLElement>(`[data-task-id="${CSS.escape(neighbor.id)}"] input[type="checkbox"]`)
      : document.getElementById("task-list-heading");
    target?.focus();
  }

  if (totalCount === 0) {
    return (
      <EmptyState title="タスクはまだありません">
        上の入力欄から、最初のタスクを追加してみましょう。
      </EmptyState>
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState title="条件に合うタスクはありません">
        <p>検索キーワードや絞り込みの条件を変えてみてください。</p>
        <button
          type="button"
          onClick={onResetQuery}
          className="mt-3 min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          条件をリセット
        </button>
      </EmptyState>
    );
  }

  return (
    <ul ref={listRef} className="flex flex-col gap-2" aria-label="タスク一覧">
      {/* key: React が「どの行がどのタスクか」を見分ける目印。並び替えても正しく対応させるため一意な id を使う */}
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          today={today}
          onToggle={onToggle}
          onFocus={onFocus}
          onUpdate={onUpdate}
          onDelete={handleDelete}
        />
      ))}
    </ul>
  );
}

"use client";

/**
 * タスクの一覧。タスクが0件のときは案内文を表示する。
 */
import { TaskItem } from "@/components/TaskItem";
import type { Task } from "@/types/task";

type Props = {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export function TaskList({ tasks, onToggle, onDelete }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-10 text-center">
        <p className="text-base font-semibold text-slate-700">タスクはまだありません</p>
        <p className="mt-1 text-sm text-slate-600">
          上の入力欄から、最初のタスクを追加してみましょう。
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2" aria-label="タスク一覧">
      {/* key: React が「どの行がどのタスクか」を見分ける目印。一意な id を使う */}
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </ul>
  );
}

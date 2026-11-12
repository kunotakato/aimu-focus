"use client";

/**
 * アプリ本体（Client Component）。
 *
 * "use client" をファイルの先頭に書くと、このファイルは「ブラウザでも動く部品」になる。
 * クリックや入力などの操作（イベント処理）や useState は、ブラウザで動く部品でしか使えない。
 */
import { TaskForm } from "@/components/TaskForm";
import { TaskList } from "@/components/TaskList";
import { useTasks } from "@/hooks/useTasks";

export function TodoApp() {
  const { tasks, add, toggle, remove } = useTasks();
  const remaining = tasks.filter((task) => !task.completed).length;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <TaskForm onAdd={add} />
      </section>

      <section aria-labelledby="task-list-heading" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 id="task-list-heading" className="text-lg font-bold text-slate-900">
            タスク
          </h2>
          {tasks.length > 0 && (
            <p className="text-sm text-slate-600">
              未完了 {remaining} 件 / 全 {tasks.length} 件
            </p>
          )}
        </div>
        <TaskList tasks={tasks} onToggle={toggle} onDelete={remove} />
      </section>
    </div>
  );
}

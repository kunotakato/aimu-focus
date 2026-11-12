"use client";

/**
 * タスク1件分の表示。
 * 完了チェック・削除ボタンと、削除前の確認表示を持つ。
 */
import { useId, useState } from "react";
import type { Task } from "@/types/task";

type Props = {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export function TaskItem({ task, onToggle, onDelete }: Props) {
  // 「削除しますか？」の確認を表示中かどうか
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const checkboxId = useId();

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        {/* label で囲むと、文字をタップしてもチェックが切り替わる（押せる範囲が広がる） */}
        <label
          htmlFor={checkboxId}
          className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3"
        >
          <input
            id={checkboxId}
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggle(task.id)}
            className="size-6 shrink-0 cursor-pointer accent-indigo-600"
          />
          <span
            className={`min-w-0 break-words text-base ${
              task.completed ? "text-slate-500 line-through" : "text-slate-900"
            }`}
          >
            {task.title}
          </span>
        </label>

        {!confirmingDelete && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`「${task.title}」を削除`}
            className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            削除
          </button>
        )}
      </div>

      {/* 削除の確認。誤ってタップしてもすぐには消えないようにする */}
      {confirmingDelete && (
        <div
          role="group"
          aria-label="削除の確認"
          onKeyDown={(event) => {
            if (event.key === "Escape") setConfirmingDelete(false);
          }}
          className="mt-3 flex flex-col gap-2 rounded-lg bg-red-50 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-red-800">このタスクを削除しますか？元に戻せません。</p>
          <div className="flex gap-2">
            <button
              type="button"
              // 確認が出たらまず「キャンセル」にフォーカスを置く（Enter 連打で消えないように）
              autoFocus
              onClick={() => setConfirmingDelete(false)}
              className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:flex-none"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="min-h-11 flex-1 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:flex-none"
            >
              削除する
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

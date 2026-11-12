"use client";

/**
 * タスク1件分の表示。
 * 「見る」「編集する」「削除を確認する」の3つの状態を切り替える。
 */
import { useId, useState } from "react";
import { TaskEditForm } from "@/components/TaskEditForm";
import { DueDateLabel, PriorityBadge } from "@/components/TaskMeta";
import { formatDateTime, isOverdue } from "@/lib/date";
import type { TaskInput } from "@/lib/tasks";
import type { Task } from "@/types/task";

type Props = {
  task: Task;
  /** 今日の日付（"YYYY-MM-DD"）。期限切れの判定に使う */
  today: string;
  onToggle: (id: string) => void;
  onUpdate: (id: string, changes: TaskInput) => void;
  onDelete: (id: string) => void;
};

/** この行が今どの状態か。3つ以外の値は入れられない */
type Mode = "view" | "edit" | "confirmDelete";

const subtleButton =
  "min-h-11 rounded-lg px-3 text-sm font-semibold text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2";

export function TaskItem({ task, today, onToggle, onUpdate, onDelete }: Props) {
  const [mode, setMode] = useState<Mode>("view");
  const checkboxId = useId();
  const overdue = isOverdue(task, today);

  if (mode === "edit") {
    return (
      <li className="rounded-xl border border-indigo-300 bg-white p-4 shadow-sm ring-2 ring-indigo-100">
        <TaskEditForm
          task={task}
          onCancel={() => setMode("view")}
          onSave={(changes) => {
            onUpdate(task.id, changes);
            setMode("view");
          }}
        />
      </li>
    );
  }

  return (
    <li
      className={`rounded-xl border bg-white p-3 shadow-sm ${
        // 期限切れは左側に太い線を付けて目立たせる（色に加えて形でも区別）
        overdue ? "border-red-300 border-l-4 border-l-red-600" : "border-slate-200"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* label で囲むと、文字をタップしてもチェックが切り替わる（押せる範囲が広がる） */}
        <label htmlFor={checkboxId} className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-start gap-3 pt-2.5">
          <input
            id={checkboxId}
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggle(task.id)}
            className="mt-0.5 size-6 shrink-0 cursor-pointer accent-indigo-600"
          />
          <span
            className={`min-w-0 break-words text-base font-medium ${
              task.completed ? "text-slate-500 line-through" : "text-slate-900"
            }`}
          >
            {task.title}
          </span>
        </label>

        {mode === "view" && (
          <div className="flex shrink-0">
            <button
              type="button"
              onClick={() => setMode("edit")}
              aria-label={`「${task.title}」を編集`}
              className={`${subtleButton} hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-indigo-600`}
            >
              編集
            </button>
            <button
              type="button"
              onClick={() => setMode("confirmDelete")}
              aria-label={`「${task.title}」を削除`}
              className={`${subtleButton} hover:bg-red-50 hover:text-red-700 focus-visible:outline-red-600`}
            >
              削除
            </button>
          </div>
        )}
      </div>

      {/* 優先度・期限・説明・日時（チェックボックスの幅だけ右にずらして、タイトルとそろえる） */}
      <div className="mt-1 flex flex-col gap-1.5 pl-9">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <PriorityBadge priority={task.priority} />
          <DueDateLabel task={task} today={today} />
        </div>
        {task.description && (
          // whitespace-pre-wrap: 説明文の改行をそのまま表示する
          <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{task.description}</p>
        )}
        <p className="text-xs text-slate-600">
          作成 {formatDateTime(task.createdAt)}
          {task.updatedAt !== task.createdAt && <> ・ 更新 {formatDateTime(task.updatedAt)}</>}
        </p>
      </div>

      {/* 削除の確認。誤ってタップしてもすぐには消えないようにする */}
      {mode === "confirmDelete" && (
        <div
          role="group"
          aria-label="削除の確認"
          onKeyDown={(event) => {
            if (event.key === "Escape") setMode("view");
          }}
          className="mt-3 flex flex-col gap-2 rounded-lg bg-red-50 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-red-800">このタスクを削除しますか？元に戻せません。</p>
          <div className="flex gap-2">
            <button
              type="button"
              // 確認が出たらまず「キャンセル」にフォーカスを置く（Enter 連打で消えないように）
              autoFocus
              onClick={() => setMode("view")}
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
